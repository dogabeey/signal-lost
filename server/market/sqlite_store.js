import { DatabaseSync } from 'node:sqlite'

// Server-only: never bundle this database or service account credentials into the app.
export function createPurchaseStore(path) {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS purchases (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, record TEXT NOT NULL); CREATE INDEX IF NOT EXISTS purchases_user ON purchases(user_id);')
  const get = (id) => { const row = db.prepare('SELECT record FROM purchases WHERE id = ?').get(id); return row ? JSON.parse(row.record) : null }
  return {
    get,
    putOnce(record) {
      db.prepare('INSERT OR IGNORE INTO purchases (id, user_id, record) VALUES (?, ?, ?)').run(record.id, record.userId, JSON.stringify(record))
      return get(record.id)
    },
    markFinalized(id) {
      const record = get(id)
      record.finalized = true
      db.prepare('UPDATE purchases SET record = ? WHERE id = ?').run(JSON.stringify(record), id)
    },
    list(userId) { return db.prepare('SELECT record FROM purchases WHERE user_id = ? ORDER BY rowid').all(userId).map((row) => JSON.parse(row.record)) },
    close() { db.close() },
  }
}
