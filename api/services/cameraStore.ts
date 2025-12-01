import { getDb, saveDb } from '../db/sqlite.js'

export type CameraRec = {
  id: string
  name?: string | null
  deviceId?: string | null
  token?: string | null
  lastHeartbeat?: number | null
  previewPath?: string | null
}

export const cameraStore = {
  register: async (token: string, deviceId?: string, name?: string): Promise<CameraRec> => {
    const db = await getDb()
    const res = db.exec('SELECT id, name, device_id, token, last_heartbeat, preview_path FROM cameras WHERE token = ?', [token])
    const row = res[0]?.values?.[0]
    if (row) {
      const id = row[0] as string
      db.run('UPDATE cameras SET device_id = ?, name = ? WHERE id = ?', [deviceId ?? row[2], name ?? row[1], id])
      await saveDb(db)
      return { id, name: (name ?? row[1]) as string, deviceId: (deviceId ?? row[2]) as string, token }
    }
    const id = 'cam-' + Math.random().toString(36).slice(2, 8)
    db.run('INSERT INTO cameras (id, name, device_id, token, last_heartbeat) VALUES (?, ?, ?, ?, ?)', [id, name ?? null, deviceId ?? null, token, Date.now()])
    await saveDb(db)
    return { id, name: name ?? null, deviceId: deviceId ?? null, token }
  },
  byToken: async (token: string): Promise<CameraRec | null> => {
    const db = await getDb()
    const res = db.exec('SELECT id, name, device_id, token, last_heartbeat, preview_path FROM cameras WHERE token = ?', [token])
    const row = res[0]?.values?.[0]
    if (!row) return null
    return {
      id: row[0] as string,
      name: (row[1] as string) || null,
      deviceId: (row[2] as string) || null,
      token: (row[3] as string) || null,
      lastHeartbeat: (row[4] as number) ?? null,
      previewPath: (row[5] as string) || null,
    }
  },
  heartbeat: async (id: string): Promise<void> => {
    const db = await getDb()
    db.run('UPDATE cameras SET last_heartbeat = ? WHERE id = ?', [Date.now(), id])
    await saveDb(db)
  },
  setPreviewPath: async (id: string, rel: string): Promise<void> => {
    const db = await getDb()
    db.run('UPDATE cameras SET preview_path = ? WHERE id = ?', [rel, id])
    await saveDb(db)
  },
  list: async (): Promise<CameraRec[]> => {
    const db = await getDb()
    const res = db.exec('SELECT id, name, device_id, token, last_heartbeat, preview_path FROM cameras ORDER BY last_heartbeat DESC')
    const rows = res[0]?.values || []
    return rows.map((r) => ({
      id: r[0] as string,
      name: (r[1] as string) || null,
      deviceId: (r[2] as string) || null,
      token: (r[3] as string) || null,
      lastHeartbeat: (r[4] as number) ?? null,
      previewPath: (r[5] as string) || null,
    }))
  },
}

