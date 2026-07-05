/**
 * Client-side auth helpers for the localStorage-backed demo.
 *
 * Passwords are stored as salted SHA-256 hashes (Web Crypto) instead of plaintext.
 * NOTE: with no backend, any client-side scheme is best-effort — this stops casual
 * disclosure (DevTools, shared machines, exported data) but is NOT a substitute
 * for real server-side authentication. Keep this model when a backend lands.
 */

export interface StoredUser {
  email: string;
  name?: string;
  userType?: string;
  /** legacy plaintext field — migrated to hash+salt on first successful login */
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  [k: string]: any;
}

const SENSITIVE_FIELDS = ['password', 'passwordHash', 'passwordSalt'] as const;

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function makeSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hashPassword(password: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}::${password}`);
}

/** Strips credential fields — use before putting a user object anywhere outside users[]/user_<email>. */
export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'password' | 'passwordHash' | 'passwordSalt'> {
  const clean: any = { ...user };
  for (const f of SENSITIVE_FIELDS) delete clean[f];
  return clean;
}

/**
 * Checks `entered` against a stored user record. Supports both the hashed format
 * and legacy plaintext records; legacy records are upgraded to hash+salt in place
 * (users[] and user_<email>) on a successful match.
 */
export async function verifyPassword(user: StoredUser, entered: string): Promise<boolean> {
  if (user.passwordHash && user.passwordSalt) {
    return (await hashPassword(entered, user.passwordSalt)) === user.passwordHash;
  }
  if (user.password !== undefined) {
    if (user.password !== entered) return false;
    await setUserPassword(user.email, entered); // migrate legacy plaintext → hash
    return true;
  }
  return false;
}

/** Writes a new salted hash for `email` into users[] and user_<email>, removing any plaintext field. */
export async function setUserPassword(email: string, newPassword: string): Promise<void> {
  const salt = makeSalt();
  const hash = await hashPassword(newPassword, salt);
  const applyTo = (u: any) => {
    const { password: _drop, ...rest } = u;
    return { ...rest, passwordHash: hash, passwordSalt: salt };
  };

  const users = JSON.parse(localStorage.getItem('users') || '[]');
  localStorage.setItem('users', JSON.stringify(users.map((u: any) => u.email === email ? applyTo(u) : u)));

  const keyRaw = localStorage.getItem(`user_${email}`);
  if (keyRaw) {
    try { localStorage.setItem(`user_${email}`, JSON.stringify(applyTo(JSON.parse(keyRaw)))); } catch {}
  }
}

/** Stores the session user with credential fields stripped. */
export function setSessionUser(user: Record<string, any>): void {
  localStorage.setItem('currentUser', JSON.stringify(sanitizeUser(user)));
}

/* demo admin — hash of the admin password with a fixed salt, so no plaintext lives in the bundle */
export const ADMIN_EMAIL = 'admin@buildpro.sa';
const ADMIN_SALT = 'buildpro-admin';
const ADMIN_HASH = 'dd26f474a749bcbda3c5f56ea8d6d0ede5e537301f6d254d2dde4fa76943c440';

export async function verifyAdmin(email: string, password: string): Promise<boolean> {
  if (email !== ADMIN_EMAIL) return false;
  return (await sha256Hex(`${ADMIN_SALT}::${password}`)) === ADMIN_HASH;
}

/**
 * One-time sweep: hashes any remaining legacy plaintext passwords in users[] /
 * user_<email> and strips credentials from a stale currentUser session. Safe to
 * call repeatedly — it no-ops once nothing is left to migrate.
 */
export async function migrateLegacyPasswords(): Promise<void> {
  try {
    const users: StoredUser[] = JSON.parse(localStorage.getItem('users') || '[]');
    for (const u of users) {
      if (u.password !== undefined && u.email) {
        await setUserPassword(u.email, u.password);
      }
    }
    const curRaw = localStorage.getItem('currentUser');
    if (curRaw) {
      const cur = JSON.parse(curRaw);
      if (SENSITIVE_FIELDS.some(f => cur[f] !== undefined)) setSessionUser(cur);
    }
  } catch { /* never block the app on migration */ }
}

/* ── upload validation ── */

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;   // 1.5MB per photo
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3MB per attachment

/** True when the file is a real raster image of an allowed type and within the size cap. Blocks SVG (scriptable) and renamed files. */
export function isValidImageFile(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_BYTES;
}

export function isValidAttachmentFile(file: File): boolean {
  return file.size <= MAX_ATTACHMENT_BYTES;
}
