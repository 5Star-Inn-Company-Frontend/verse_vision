import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'

const dataDir = process.env.VV_DATA_DIR ? String(process.env.VV_DATA_DIR) : path.resolve(__dirname, '../../data')
const dbFile = path.join(dataDir, 'versevision.sqlite')

let dbPromise: Promise<Database> | null = null

async function loadWasm() {
  const SQL = await initSqlJs({
    locateFile: (file) => {
      const candidates = [
        path.resolve(__dirname, '../../node_modules/sql.js/dist/', file),
        path.resolve(__dirname, '../../../node_modules/sql.js/dist/', file),
        path.resolve(process.cwd(), 'node_modules/sql.js/dist/', file),
      ]
      for (const p of candidates) {
        if (fs.existsSync(p)) return p
      }
      return path.resolve(__dirname, '../../node_modules/sql.js/dist/', file)
    },
  })
  return SQL
}

async function openDatabase(): Promise<Database> {
  const SQL = await loadWasm()
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  let db: Database
  if (fs.existsSync(dbFile)) {
    const fileBuffer = fs.readFileSync(dbFile)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS scriptures (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      translation TEXT NOT NULL,
      text TEXT NOT NULL,
      confidence REAL NOT NULL,
      detected_at INTEGER NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0,
      approved_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scene_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      primary_camera_id TEXT,
      translation_style TEXT,
      show_scripture_overlay INTEGER
    );
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      language TEXT,
      lines TEXT NOT NULL,
      created_at INTEGER,
      source TEXT
    );
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS playlist_items (
      id TEXT PRIMARY KEY,
      playlist_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT,
      path TEXT,
      created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS video_jobs (
      id TEXT PRIMARY KEY,
      input_path TEXT NOT NULL,
      output_path TEXT,
      status TEXT NOT NULL,
      error TEXT,
      title TEXT,
      duration INTEGER,
      thumbnail_path TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      name TEXT,
      device_id TEXT,
      token TEXT,
      last_heartbeat INTEGER,
      preview_path TEXT,
      battery INTEGER,
      signal INTEGER
    );
  `)
  try { db.exec('ALTER TABLE songs ADD COLUMN source TEXT'); } catch { /* ignore */ }
  try { db.exec('ALTER TABLE cameras ADD COLUMN battery INTEGER'); } catch { /* ignore */ }
  try { db.exec('ALTER TABLE cameras ADD COLUMN signal INTEGER'); } catch { /* ignore */ }
  return db
}

export async function getDb(): Promise<Database> {
  if (!dbPromise) dbPromise = openDatabase()
  return dbPromise
}

export async function saveDb(db: Database): Promise<void> {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbFile, buffer)
}
