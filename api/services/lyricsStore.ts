import { getDb, saveDb } from '../db/sqlite.js'

export type Song = {
  id: string
  title: string
  language?: string | null
  lines: string[]
  createdAt: number
}

export type CurrentLyric = {
  songId: string | null
  lineIndex: number
  show: boolean
}

export const lyricsStore = {
  list: async (): Promise<Song[]> => {
    const db = await getDb()
    const res = db.exec('SELECT id, title, language, lines, created_at FROM songs ORDER BY title ASC')
    const rows = res[0]?.values || []
    return rows.map((r) => ({ id: r[0] as string, title: r[1] as string, language: (r[2] as string) || null, lines: JSON.parse(r[3] as string), createdAt: (r[4] as number) }))
  },
  create: async (payload: { title: string; language?: string | null; lines: string[] }): Promise<Song> => {
    const db = await getDb()
    const id = 'song-' + Math.random().toString(36).slice(2, 8)
    const createdAt = Date.now()
    db.run('INSERT INTO songs (id, title, language, lines, created_at) VALUES (?, ?, ?, ?, ?)', [id, payload.title, payload.language ?? null, JSON.stringify(payload.lines), createdAt])
    await saveDb(db)
    return { id, title: payload.title, language: payload.language ?? null, lines: payload.lines, createdAt }
  },
  update: async (id: string, patch: Partial<{ title: string; language: string | null; lines: string[] }>): Promise<Song | null> => {
    const db = await getDb()
    const fields: string[] = []
    const values: (string | number | null)[] = []
    if (patch.title !== undefined) { fields.push('title = ?'); values.push(patch.title) }
    if (patch.language !== undefined) { fields.push('language = ?'); values.push(patch.language) }
    if (patch.lines !== undefined) { fields.push('lines = ?'); values.push(JSON.stringify(patch.lines)) }
    if (fields.length) {
      const sql = `UPDATE songs SET ${fields.join(', ')} WHERE id = ?`
      values.push(id)
      db.run(sql, values)
      await saveDb(db)
    }
    const res = db.exec('SELECT id, title, language, lines, created_at FROM songs WHERE id = ?', [id])
    const row = res[0]?.values?.[0]
    if (!row) return null
    return { id: row[0] as string, title: row[1] as string, language: (row[2] as string) || null, lines: JSON.parse(row[3] as string), createdAt: (row[4] as number) }
  },
  remove: async (id: string): Promise<boolean> => {
    const db = await getDb()
    db.run('DELETE FROM songs WHERE id = ?', [id])
    await saveDb(db)
    return true
  },
}
