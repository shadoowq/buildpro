/**
 * Full-data backup/restore for the localStorage-backed app.
 * The export captures every localStorage key so nothing is lost; the import
 * restores everything EXCEPT the current session (currentUser), so restoring
 * a backup never silently switches who is logged in.
 */

const BACKUP_APP = 'buildpro';
const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<string, string>;
}

export function buildBackup(): BackupFile {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null) continue;
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

/** Triggers a browser download of the full backup as a JSON file. */
export function downloadBackup(): void {
  const backup = buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buildpro-backup-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Throws (with a human-readable message key) when the parsed content is not a valid BuildPro backup. */
export function parseBackup(raw: string): BackupFile {
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { throw new Error('invalid'); }
  if (!parsed || parsed.app !== BACKUP_APP || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error('invalid');
  }
  return parsed as BackupFile;
}

/**
 * Restores every key from the backup except the live session, then returns
 * how many keys were written. Existing keys not present in the backup are left
 * untouched (a backup ADDS/overwrites — it never wipes unrelated data).
 */
export function restoreBackup(backup: BackupFile): number {
  let written = 0;
  for (const [key, value] of Object.entries(backup.data)) {
    if (key === 'currentUser') continue; // never hijack the active session
    if (typeof value !== 'string') continue;
    localStorage.setItem(key, value);
    written++;
  }
  return written;
}
