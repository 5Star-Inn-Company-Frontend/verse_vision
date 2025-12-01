import { getDb, saveDb } from '../db/sqlite.js'

export type ScenePreset = {
  id: string
  name: string
  primaryCameraId: string | null
  translationStyle: 'subtitle' | 'split' | 'ticker'
  showScriptureOverlay: boolean
}

export const sceneStore = {
  list: async (): Promise<ScenePreset[]> => {
    const db = await getDb()
    const res = db.exec('SELECT id, name, primary_camera_id, translation_style, show_scripture_overlay FROM scene_presets ORDER BY name ASC')
    const rows = res[0]?.values || []
    return rows.map((r) => ({
      id: r[0] as string,
      name: r[1] as string,
      primaryCameraId: (r[2] as string) || null,
      translationStyle: (r[3] as ScenePreset['translationStyle']) || 'subtitle',
      showScriptureOverlay: (r[4] as number) === 1,
    }))
  },
  create: async (preset: Omit<ScenePreset, 'id'>): Promise<ScenePreset> => {
    const db = await getDb()
    const id = 'scene-' + Math.random().toString(36).slice(2, 8)
    db.run(
      'INSERT INTO scene_presets (id, name, primary_camera_id, translation_style, show_scripture_overlay) VALUES (?, ?, ?, ?, ?)',
      [id, preset.name, preset.primaryCameraId, preset.translationStyle, preset.showScriptureOverlay ? 1 : 0],
    )
    await saveDb(db)
    return { id, ...preset }
  },
  update: async (id: string, patch: Partial<ScenePreset>): Promise<ScenePreset | null> => {
    const db = await getDb()
    const fields: string[] = []
    const values: (string | number | null)[] = []
    if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name) }
    if (patch.primaryCameraId !== undefined) { fields.push('primary_camera_id = ?'); values.push(patch.primaryCameraId) }
    if (patch.translationStyle !== undefined) { fields.push('translation_style = ?'); values.push(patch.translationStyle) }
    if (patch.showScriptureOverlay !== undefined) { fields.push('show_scripture_overlay = ?'); values.push(patch.showScriptureOverlay ? 1 : 0) }
    if (fields.length) {
      const sql = `UPDATE scene_presets SET ${fields.join(', ')} WHERE id = ?`
      values.push(id)
      db.run(sql, values)
      await saveDb(db)
    }
    const res = db.exec('SELECT id, name, primary_camera_id, translation_style, show_scripture_overlay FROM scene_presets WHERE id = ?', [id])
    const row = res[0]?.values?.[0]
    if (!row) return null
    return {
      id: row[0] as string,
      name: row[1] as string,
      primaryCameraId: (row[2] as string) || null,
      translationStyle: (row[3] as ScenePreset['translationStyle']) || 'subtitle',
      showScriptureOverlay: (row[4] as number) === 1,
    }
  },
  remove: async (id: string): Promise<boolean> => {
    const db = await getDb()
    db.run('DELETE FROM scene_presets WHERE id = ?', [id])
    await saveDb(db)
    return true
  },
}
