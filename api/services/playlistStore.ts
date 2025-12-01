import { getDb, saveDb } from '../db/sqlite.js'

export type Playlist = { id: string; name: string; createdAt: number }
export type PlaylistItem = { id: string; playlistId: string; type: string; title: string; path?: string | null; createdAt: number }

export const playlistStore = {
  listPlaylists: async (): Promise<Playlist[]> => {
    const db = await getDb()
    const res = db.exec('SELECT id, name, created_at FROM playlists ORDER BY created_at DESC')
    const rows = res[0]?.values || []
    return rows.map((r) => ({ id: r[0] as string, name: r[1] as string, createdAt: r[2] as number }))
  },
  createPlaylist: async (name: string): Promise<Playlist> => {
    const db = await getDb()
    const id = 'pl-' + Math.random().toString(36).slice(2, 8)
    const createdAt = Date.now()
    db.run('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)', [id, name, createdAt])
    await saveDb(db)
    return { id, name, createdAt }
  },
  listItems: async (playlistId: string): Promise<PlaylistItem[]> => {
    const db = await getDb()
    const res = db.exec('SELECT id, playlist_id, type, title, path, created_at FROM playlist_items WHERE playlist_id = ? ORDER BY created_at ASC', [playlistId])
    const rows = res[0]?.values || []
    return rows.map((r) => ({ id: r[0] as string, playlistId: r[1] as string, type: r[2] as string, title: r[3] as string, path: (r[4] as string) || null, createdAt: r[5] as number }))
  },
  addItem: async (playlistId: string, item: { type: string; title: string; path?: string | null }): Promise<PlaylistItem> => {
    const db = await getDb()
    const id = 'pli-' + Math.random().toString(36).slice(2, 8)
    const createdAt = Date.now()
    db.run('INSERT INTO playlist_items (id, playlist_id, type, title, path, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, playlistId, item.type, item.title, item.path ?? null, createdAt])
    await saveDb(db)
    return { id, playlistId, type: item.type, title: item.title, path: item.path ?? null, createdAt }
  },
  removeItem: async (id: string): Promise<boolean> => {
    const db = await getDb()
    db.run('DELETE FROM playlist_items WHERE id = ?', [id])
    await saveDb(db)
    return true
  },
}

