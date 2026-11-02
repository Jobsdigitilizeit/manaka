import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/**
 * Minimal JSON-file persistence so accounts, applications and the audit trail survive a restart.
 * Writes are atomic (temp file + rename) and debounced by the caller via `scheduleSave`.
 */
export function loadSnapshot<T>(): T | null {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as T;
  } catch (err) {
    console.error('[store] Could not read snapshot, starting empty:', err instanceof Error ? err.message : err);
    return null;
  }
}

let timer: NodeJS.Timeout | null = null;

export function scheduleSave(getSnapshot: () => unknown) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    saveNow(getSnapshot);
  }, 400);
}

export function saveNow(getSnapshot: () => unknown) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(getSnapshot()), { mode: 0o600 });
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.error('[store] Failed to persist snapshot:', err instanceof Error ? err.message : err);
  }
}
