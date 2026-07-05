import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword, makeSalt, sanitizeUser, verifyPassword, verifyAdmin,
  setUserPassword, migrateLegacyPasswords, ADMIN_EMAIL,
  isValidImageFile, isValidAttachmentFile, MAX_IMAGE_BYTES, MAX_ATTACHMENT_BYTES,
} from '../auth';

/* minimal in-memory localStorage for the migration paths */
function installLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
  };
}

beforeEach(installLocalStorage);

describe('hashing', () => {
  it('is deterministic for the same password+salt', async () => {
    expect(await hashPassword('secret', 'salt1')).toBe(await hashPassword('secret', 'salt1'));
  });

  it('differs across salts and passwords', async () => {
    expect(await hashPassword('secret', 'salt1')).not.toBe(await hashPassword('secret', 'salt2'));
    expect(await hashPassword('secret', 'salt1')).not.toBe(await hashPassword('other', 'salt1'));
  });

  it('never produces the plaintext', async () => {
    const h = await hashPassword('secret', makeSalt());
    expect(h).not.toContain('secret');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('makeSalt produces unique values', () => {
    expect(makeSalt()).not.toBe(makeSalt());
  });
});

describe('sanitizeUser', () => {
  it('strips every credential field and keeps the rest', () => {
    const clean = sanitizeUser({ email: 'a@b.c', name: 'x', password: 'p', passwordHash: 'h', passwordSalt: 's' });
    expect(clean).toEqual({ email: 'a@b.c', name: 'x' });
  });
});

describe('verifyPassword', () => {
  it('accepts the right password against a hashed record', async () => {
    const salt = makeSalt();
    const user = { email: 'u@x.c', passwordHash: await hashPassword('pw123456', salt), passwordSalt: salt };
    expect(await verifyPassword(user, 'pw123456')).toBe(true);
    expect(await verifyPassword(user, 'wrong')).toBe(false);
  });

  it('accepts a legacy plaintext record and migrates it to hash+salt', async () => {
    const legacy = { email: 'legacy@x.c', password: 'oldpass' };
    localStorage.setItem('users', JSON.stringify([legacy]));
    localStorage.setItem('user_legacy@x.c', JSON.stringify(legacy));

    expect(await verifyPassword(legacy, 'oldpass')).toBe(true);

    const migrated = JSON.parse(localStorage.getItem('users')!)[0];
    expect(migrated.password).toBeUndefined();
    expect(migrated.passwordHash).toMatch(/^[0-9a-f]{64}$/);
    // and the migrated record still verifies
    expect(await verifyPassword(migrated, 'oldpass')).toBe(true);
    expect(await verifyPassword(migrated, 'wrong')).toBe(false);
  });

  it('rejects a record with no credentials at all', async () => {
    expect(await verifyPassword({ email: 'x@y.z' }, 'anything')).toBe(false);
  });
});

describe('setUserPassword', () => {
  it('updates users[] and user_<email> in lockstep, removing plaintext', async () => {
    localStorage.setItem('users', JSON.stringify([{ email: 'u@x.c', password: 'old', name: 'kept' }]));
    localStorage.setItem('user_u@x.c', JSON.stringify({ email: 'u@x.c', password: 'old' }));

    await setUserPassword('u@x.c', 'newpass');

    const inUsers = JSON.parse(localStorage.getItem('users')!)[0];
    const inKey = JSON.parse(localStorage.getItem('user_u@x.c')!);
    for (const rec of [inUsers, inKey]) {
      expect(rec.password).toBeUndefined();
      expect(rec.passwordHash).toBeDefined();
    }
    expect(inUsers.name).toBe('kept');
    expect(inUsers.passwordHash).toBe(inKey.passwordHash);
    expect(await verifyPassword(inUsers, 'newpass')).toBe(true);
  });
});

describe('migrateLegacyPasswords', () => {
  it('sweeps every plaintext record and scrubs a stale session', async () => {
    localStorage.setItem('users', JSON.stringify([
      { email: 'a@x.c', password: 'pa' },
      { email: 'b@x.c', password: 'pb' },
      { email: 'c@x.c', passwordHash: 'already', passwordSalt: 'done' },
    ]));
    localStorage.setItem('currentUser', JSON.stringify({ email: 'a@x.c', password: 'pa' }));

    await migrateLegacyPasswords();

    const users = JSON.parse(localStorage.getItem('users')!);
    expect(users.every((u: any) => u.password === undefined)).toBe(true);
    expect(users.filter((u: any) => u.passwordHash).length).toBe(3);
    const session = JSON.parse(localStorage.getItem('currentUser')!);
    expect(session.password).toBeUndefined();
    // migrated users can still log in
    expect(await verifyPassword(users[0], 'pa')).toBe(true);
    expect(await verifyPassword(users[1], 'pb')).toBe(true);
  });
});

describe('verifyAdmin', () => {
  it('accepts the admin credentials and rejects everything else', async () => {
    expect(await verifyAdmin(ADMIN_EMAIL, 'BuildPro@2026')).toBe(true);
    expect(await verifyAdmin(ADMIN_EMAIL, 'wrong')).toBe(false);
    expect(await verifyAdmin('not-admin@x.c', 'BuildPro@2026')).toBe(false);
  });
});

describe('upload validation', () => {
  const makeFile = (type: string, size: number) =>
    ({ type, size } as unknown as File);

  it('accepts allowed raster images within the size cap', () => {
    expect(isValidImageFile(makeFile('image/png', 1000))).toBe(true);
    expect(isValidImageFile(makeFile('image/jpeg', MAX_IMAGE_BYTES))).toBe(true);
    expect(isValidImageFile(makeFile('image/webp', 1000))).toBe(true);
  });

  it('rejects scriptable/unknown types and oversized files', () => {
    expect(isValidImageFile(makeFile('image/svg+xml', 1000))).toBe(false);
    expect(isValidImageFile(makeFile('text/html', 1000))).toBe(false);
    expect(isValidImageFile(makeFile('image/png', MAX_IMAGE_BYTES + 1))).toBe(false);
  });

  it('caps attachment size', () => {
    expect(isValidAttachmentFile(makeFile('application/pdf', MAX_ATTACHMENT_BYTES))).toBe(true);
    expect(isValidAttachmentFile(makeFile('application/pdf', MAX_ATTACHMENT_BYTES + 1))).toBe(false);
  });
});
