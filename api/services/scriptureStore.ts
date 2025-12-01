export type ScriptureItem = {
  id: string
  reference: string
  translation: string
  text: string
  confidence: number
  detectedAt: number
  approved?: number
  approvedAt?: number | null
}
import { getDb, saveDb } from '../db/sqlite.js'

async function seedIfEmpty() {
  const db = await getDb()
  const res = db.exec('SELECT COUNT(*) as cnt FROM scriptures')
  const cnt = res[0]?.values[0]?.[0] as number | undefined
  if (!cnt) {
    const now = Date.now()
    db.run(
      'INSERT INTO scriptures (id, reference, translation, text, confidence, detected_at, approved) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [
        'scr-1',
        'John 3:16',
        'NIV',
        'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
        0.97,
        now - 2500,
      ],
    )
    db.run(
      'INSERT INTO scriptures (id, reference, translation, text, confidence, detected_at, approved) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [
        'scr-2',
        'Psalm 23:1-3',
        'KJV',
        'The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul...',
        0.93,
        now - 1200,
      ],
    )
    await saveDb(db)
  }
}

await seedIfEmpty()

export const scriptureStore = {
  getQueue: async (): Promise<ScriptureItem[]> => {
    const db = await getDb()
    const res = db.exec(
      'SELECT id, reference, translation, text, confidence, detected_at FROM scriptures WHERE approved = 0 ORDER BY detected_at DESC',
    )
    const rows = res[0]?.values || []
    return rows.map((r) => ({
      id: r[0] as string,
      reference: r[1] as string,
      translation: r[2] as string,
      text: r[3] as string,
      confidence: r[4] as number,
      detectedAt: r[5] as number,
    }))
  },
  getCurrent: async (): Promise<ScriptureItem | null> => {
    const db = await getDb()
    const res = db.exec(
      'SELECT id, reference, translation, text, confidence, detected_at, approved_at FROM scriptures WHERE approved = 1 ORDER BY approved_at DESC LIMIT 1',
    )
    const row = res[0]?.values?.[0]
    if (!row) return null
    return {
      id: row[0] as string,
      reference: row[1] as string,
      translation: row[2] as string,
      text: row[3] as string,
      confidence: row[4] as number,
      detectedAt: row[5] as number,
      approvedAt: row[6] as number,
    }
  },
  detect: async (item: Omit<ScriptureItem, 'id' | 'detectedAt'>): Promise<ScriptureItem> => {
    const db = await getDb()
    const id = 'scr-' + Math.random().toString(36).slice(2, 8)
    const detectedAt = Date.now()
    db.run(
      'INSERT INTO scriptures (id, reference, translation, text, confidence, detected_at, approved) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [id, item.reference, item.translation, item.text, item.confidence ?? 0.9, detectedAt],
    )
    await saveDb(db)
    return { id, detectedAt, ...item }
  },
  approve: async (id: string): Promise<ScriptureItem | null> => {
    const db = await getDb()
    const approvedAt = Date.now()
    db.run('UPDATE scriptures SET approved = 1, approved_at = ? WHERE id = ?', [approvedAt, id])
    await saveDb(db)
    const res = db.exec(
      'SELECT id, reference, translation, text, confidence, detected_at, approved_at FROM scriptures WHERE id = ?',
      [id],
    )
    const row = res[0]?.values?.[0]
    if (!row) return null
    return {
      id: row[0] as string,
      reference: row[1] as string,
      translation: row[2] as string,
      text: row[3] as string,
      confidence: row[4] as number,
      detectedAt: row[5] as number,
      approvedAt: row[6] as number,
    }
  },
  reject: async (id: string): Promise<boolean> => {
    const db = await getDb()
    db.run('DELETE FROM scriptures WHERE id = ?', [id])
    await saveDb(db)
    return true
  },
  update: async (id: string, patch: Partial<ScriptureItem>): Promise<ScriptureItem | null> => {
    const db = await getDb()
    const fields: string[] = []
    const values: (string | number)[] = []
    if (patch.reference) {
      fields.push('reference = ?')
      values.push(patch.reference)
    }
    if (patch.translation) {
      fields.push('translation = ?')
      values.push(patch.translation)
    }
    if (patch.text) {
      fields.push('text = ?')
      values.push(patch.text)
    }
    if (patch.confidence !== undefined) {
      fields.push('confidence = ?')
      values.push(patch.confidence)
    }
    if (fields.length) {
      const sql = `UPDATE scriptures SET ${fields.join(', ')} WHERE id = ?`
      values.push(id)
      db.run(sql, values)
      await saveDb(db)
    }
    const res = db.exec(
      'SELECT id, reference, translation, text, confidence, detected_at, approved, approved_at FROM scriptures WHERE id = ?',
      [id],
    )
    const row = res[0]?.values?.[0]
    if (!row) return null
    return {
      id: row[0] as string,
      reference: row[1] as string,
      translation: row[2] as string,
      text: row[3] as string,
      confidence: row[4] as number,
      detectedAt: row[5] as number,
      approved: row[6] as number,
      approvedAt: row[7] as number | null,
    }
  },
}
