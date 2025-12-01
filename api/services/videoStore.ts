import { getDb, saveDb } from '../db/sqlite.js'

export type VideoJob = {
  id: string
  inputPath: string
  outputPath?: string | null
  status: 'queued' | 'processing' | 'completed' | 'failed'
  error?: string | null
  title?: string | null
  duration?: number | null
  thumbnailPath?: string | null
  createdAt: number
  updatedAt: number
}

export const videoStore = {
  enqueue: async (inputPath: string, title?: string | null): Promise<VideoJob> => {
    const db = await getDb()
    const id = 'vid-' + Math.random().toString(36).slice(2, 8)
    const now = Date.now()
    db.run(
      'INSERT INTO video_jobs (id, input_path, status, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, inputPath, 'queued', title ?? null, now, now],
    )
    await saveDb(db)
    return { id, inputPath, status: 'queued', createdAt: now, updatedAt: now }
  },
  list: async (): Promise<VideoJob[]> => {
    const db = await getDb()
    const res = db.exec('SELECT id, input_path, output_path, status, error, title, duration, thumbnail_path, created_at, updated_at FROM video_jobs ORDER BY created_at DESC')
    const rows = res[0]?.values || []
    return rows.map((r) => ({
      id: r[0] as string,
      inputPath: r[1] as string,
      outputPath: (r[2] as string) || null,
      status: r[3] as VideoJob['status'],
      error: (r[4] as string) || null,
      title: (r[5] as string) || null,
      duration: (r[6] as number) ?? null,
      thumbnailPath: (r[7] as string) || null,
      createdAt: r[8] as number,
      updatedAt: r[9] as number,
    }))
  },
  get: async (id: string): Promise<VideoJob | null> => {
    const db = await getDb()
    const res = db.exec('SELECT id, input_path, output_path, status, error, title, duration, thumbnail_path, created_at, updated_at FROM video_jobs WHERE id = ?', [id])
    const row = res[0]?.values?.[0]
    if (!row) return null
    return {
      id: row[0] as string,
      inputPath: row[1] as string,
      outputPath: (row[2] as string) || null,
      status: row[3] as VideoJob['status'],
      error: (row[4] as string) || null,
      title: (row[5] as string) || null,
      duration: (row[6] as number) ?? null,
      thumbnailPath: (row[7] as string) || null,
      createdAt: row[8] as number,
      updatedAt: row[9] as number,
    }
  },
  update: async (id: string, patch: Partial<VideoJob>): Promise<VideoJob | null> => {
    const db = await getDb()
    const fields: string[] = []
    const values: (string | number | null)[] = []
    const map: Record<string, unknown> = {
      output_path: patch.outputPath ?? undefined,
      status: patch.status ?? undefined,
      error: patch.error ?? undefined,
      title: patch.title ?? undefined,
      duration: patch.duration ?? undefined,
      thumbnail_path: patch.thumbnailPath ?? undefined,
      updated_at: Date.now(),
    }
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) { fields.push(`${k} = ?`); values.push((v as string | number | null) ?? null) }
    }
    if (fields.length) {
      const sql = `UPDATE video_jobs SET ${fields.join(', ')} WHERE id = ?`
      values.push(id)
      db.run(sql, values)
      await saveDb(db)
    }
    return await videoStore.get(id)
  },
}
