import { getDb, saveDb } from '../db/sqlite.js'

export type AppSettings = {
  autoApproveEnabled: boolean
  autoApproveDelayMs: number
  translationStyle: 'subtitle' | 'split' | 'ticker'
  translationEnabledYoruba: boolean
  translationEnabledHausa: boolean
  translationEnabledIgbo: boolean
  translationEnabledFrench: boolean
  activeAudioCameraId?: string | null
  showLyricsOverlay?: boolean
  currentSongId?: string | null
  currentLineIndex?: number
  showScriptureOverlay?: boolean
  recordingEnabled?: boolean
  countdownEndAt?: number | null
  iceServersJson?: string | null
  translationEngine?: 'openai' | 'marian'
  scriptureDetectionEngine?: 'openai' | 'offline'
}

const defaults: AppSettings = {
  autoApproveEnabled: false,
  autoApproveDelayMs: 2000,
  translationStyle: 'subtitle',
  translationEnabledYoruba: false,
  translationEnabledHausa: false,
  translationEnabledIgbo: false,
  translationEnabledFrench: false,
  activeAudioCameraId: null,
  showLyricsOverlay: false,
  currentSongId: null,
  currentLineIndex: 0,
  showScriptureOverlay: true,
  recordingEnabled: false,
  countdownEndAt: null,
  iceServersJson: null,
  translationEngine: 'marian',
  scriptureDetectionEngine: 'offline',
}

export const settingsStore = {
  get: async (): Promise<AppSettings> => {
    const db = await getDb()
    const res = db.exec('SELECT key, value FROM settings')
    const map = new Map<string, string>()
    for (const row of res[0]?.values || []) {
      map.set(row[0] as string, row[1] as string)
    }
    return {
      autoApproveEnabled: map.get('autoApproveEnabled') === 'true' ? true : defaults.autoApproveEnabled,
      autoApproveDelayMs: Number(map.get('autoApproveDelayMs') ?? defaults.autoApproveDelayMs),
      translationStyle: (map.get('translationStyle') as AppSettings['translationStyle']) ?? defaults.translationStyle,
      translationEnabledYoruba: map.get('translationEnabledYoruba') === 'true' ? true : defaults.translationEnabledYoruba,
      translationEnabledHausa: map.get('translationEnabledHausa') === 'true' ? true : defaults.translationEnabledHausa,
      translationEnabledIgbo: map.get('translationEnabledIgbo') === 'true' ? true : defaults.translationEnabledIgbo,
      translationEnabledFrench: map.get('translationEnabledFrench') === 'true' ? true : defaults.translationEnabledFrench,
      activeAudioCameraId: (map.get('activeAudioCameraId') as string) ?? defaults.activeAudioCameraId ?? null,
      showLyricsOverlay: map.get('showLyricsOverlay') === 'true' ? true : defaults.showLyricsOverlay,
      currentSongId: (map.get('currentSongId') as string) ?? defaults.currentSongId ?? null,
      currentLineIndex: Number(map.get('currentLineIndex') ?? defaults.currentLineIndex),
      showScriptureOverlay: map.get('showScriptureOverlay') === 'true' ? true : defaults.showScriptureOverlay,
      recordingEnabled: map.get('recordingEnabled') === 'true' ? true : defaults.recordingEnabled,
      countdownEndAt: map.get('countdownEndAt') ? Number(map.get('countdownEndAt')) : null,
      iceServersJson: (map.get('iceServersJson') as string) ?? defaults.iceServersJson ?? null,
      translationEngine: (map.get('translationEngine') as AppSettings['translationEngine']) ?? defaults.translationEngine,
      scriptureDetectionEngine: (map.get('scriptureDetectionEngine') as AppSettings['scriptureDetectionEngine']) ?? defaults.scriptureDetectionEngine,
    }
  },
  set: async (partial: Partial<AppSettings>): Promise<AppSettings> => {
    const db = await getDb()
    const current = await settingsStore.get()
    const next = { ...current, ...partial }
    const entries: [string, string][] = [
      ['autoApproveEnabled', String(next.autoApproveEnabled)],
      ['autoApproveDelayMs', String(next.autoApproveDelayMs)],
      ['translationStyle', String(next.translationStyle)],
      ['translationEnabledYoruba', String(next.translationEnabledYoruba)],
      ['translationEnabledHausa', String(next.translationEnabledHausa)],
      ['translationEnabledIgbo', String(next.translationEnabledIgbo)],
      ['translationEnabledFrench', String(next.translationEnabledFrench)],
      ['activeAudioCameraId', String(next.activeAudioCameraId ?? '')],
      ['showLyricsOverlay', String(next.showLyricsOverlay ?? false)],
      ['currentSongId', String(next.currentSongId ?? '')],
      ['currentLineIndex', String(next.currentLineIndex ?? 0)],
      ['showScriptureOverlay', String(next.showScriptureOverlay ?? defaults.showScriptureOverlay)],
      ['recordingEnabled', String(next.recordingEnabled ?? false)],
      ['countdownEndAt', String(next.countdownEndAt ?? '')],
      ['iceServersJson', String(next.iceServersJson ?? '')],
      ['translationEngine', String(next.translationEngine ?? defaults.translationEngine)],
      ['scriptureDetectionEngine', String(next.scriptureDetectionEngine ?? defaults.scriptureDetectionEngine)],
    ]
    for (const [k, v] of entries) {
      if (partial[k as keyof AppSettings] !== undefined) {
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, v])
      }
    }
    await saveDb(db)
    return next
  },
}
