import { create } from 'zustand'
import { api } from '@/lib/api'
import { publish } from '@/lib/bus'

export type Camera = {
  id: string
  name: string
  battery: number
  signal: number
  connected: boolean
  previewUrl: string
  audioLevel: number
}

export type ScriptureItem = {
  id: string
  reference: string
  translation: string
  text: string
  confidence: number
  detectedAt: number
}

type OperatorState = {
  cameras: Camera[]
  primaryCameraId: string | null
  scriptureQueue: ScriptureItem[]
  currentScripture: ScriptureItem | null
  autoApproveEnabled: boolean
  autoApproveDelayMs: number
  translationStyle: 'subtitle' | 'split' | 'ticker'
  translationEnabledYoruba: boolean
  translationEnabledHausa: boolean
  translationEnabledIgbo: boolean
  translationEnabledFrench: boolean
  translationEngine: 'openai' | 'marian'
  scriptureDetectionEngine: 'openai' | 'offline'
  showScriptureOverlay: boolean
  recordingEnabled: boolean
  countdownEndAt: number | null
  approveScripture: (id: string) => void
  rejectScripture: (id: string) => void
  setPrimaryCamera: (id: string) => void
  loadQueue: () => Promise<void>
  loadCurrent: () => Promise<void>
  updateScripture: (id: string, patch: Partial<ScriptureItem>) => Promise<void>
  loadSettings: () => Promise<void>
  updateSettings: (patch: { autoApproveEnabled?: boolean; autoApproveDelayMs?: number }) => Promise<void>
  updateTranslationSettings: (patch: {
    translationStyle?: 'subtitle' | 'split' | 'ticker'
    translationEnabledYoruba?: boolean
    translationEnabledHausa?: boolean
    translationEnabledIgbo?: boolean
    translationEnabledFrench?: boolean
  }) => Promise<void>
  setTranslationEngine: (engine: 'openai' | 'marian') => Promise<void>
  setScriptureDetectionEngine: (engine: 'openai' | 'offline') => Promise<void>
  activeAudioCameraId: string | null
  setActiveAudioCamera: (id: string) => Promise<void>
  translations: { Yoruba?: string; Hausa?: string; Igbo?: string; French?: string }
  fetchTranslations: (text: string) => Promise<void>
  showLyricsOverlay: boolean
  currentSongId: string | null
  currentLineIndex: number
  loadCurrentLyric: () => Promise<void>
  setCurrentLyric: (payload: { songId: string | null; lineIndex: number; show: boolean }) => Promise<void>
  toggleScriptureOverlay: (show: boolean) => Promise<void>
  setRecordingEnabled: (enabled: boolean) => Promise<void>
  startCountdown: (ms: number) => Promise<void>
  stopCountdown: () => Promise<void>
  activePlaylistItem?: { id: string; type: string; title: string; url?: string | null }
  setActivePlaylistItem: (item?: { id: string; type: string; title: string; url?: string | null }) => void
  activePlaylistItemPage: number
  nextActivePlaylistItemPage: () => void
  prevActivePlaylistItemPage: () => void
  upsertCamera: (rec: { id: string; name?: string | null; previewPath?: string | null; battery?: number | null; signal?: number | null }) => void
  updateCameraPreview: (id: string, previewPath: string) => void
  updateCameraHeartbeat: (id: string, battery?: number | null, signal?: number | null) => void
  removeCamera: (id: string) => void
  liveStreams: Record<string, MediaStream | null>
  setLiveStream: (id: string, stream: MediaStream | null) => void
  iceServers: RTCIceServer[]
  loadIceServers: () => Promise<void>
  updateIceServers: (iceServers: RTCIceServer[]) => Promise<void>
  loadCameras: () => Promise<void>
  setScriptureQueue: (queue: ScriptureItem[]) => void
}

export const useOperatorStore = create<OperatorState>((set, get) => ({
  cameras: [
    {
      id: 'cam-default',
      name: 'Default',
      battery: 0,
      signal: 4,
      connected: true,
      previewUrl: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=A%20smartphone%20camera%20preview%20frame%20of%20a%20church%20pulpit%20with%20a%20speaker%20in%20soft%20studio%20lighting%2C%20bokeh%20background%2C%20broadcast%20look%20%2D%20clean%20composition%20and%20subtle%20grid%20overlays%2C%20photorealistic%20style%2C%20SDXL&image_size=landscape_16_9',
      audioLevel: 0,
    }
  ],
  primaryCameraId: 'cam-default',
  scriptureQueue: [],
  currentScripture: null,
  autoApproveEnabled: false,
  autoApproveDelayMs: 2000,
  translationStyle: 'subtitle',
  translationEnabledYoruba: true,
  translationEnabledHausa: true,
  translationEnabledIgbo: true,
  translationEnabledFrench: true,
  translationEngine: 'marian',
  scriptureDetectionEngine: 'offline',
  showScriptureOverlay: true,
  recordingEnabled: false,
  countdownEndAt: null,
  approveScripture: async (id) => {
    const approved = await api.approve(id)
    set((state) => ({
      scriptureQueue: state.scriptureQueue.filter((s) => s.id !== id),
      currentScripture: approved,
    }))
    publish('scripture-current', approved)
  },
  rejectScripture: async (id) => {
    await api.reject(id)
    set((state) => ({
      scriptureQueue: state.scriptureQueue.filter((s) => s.id !== id),
    }))
  },
  setPrimaryCamera: (id) => { set({ primaryCameraId: id }); publish('camera-primary', { id }) },
  // publish camera change
  setPrimaryCameraPublish: (id: string) => {
    set({ primaryCameraId: id })
    publish('camera-primary', { id })
  },
  loadQueue: async () => {
    const items = await api.getQueue()
    set({ scriptureQueue: items })
  },
  loadCurrent: async () => {
    const current = await api.getCurrent()
    set({ currentScripture: current })
  },
  updateScripture: async (id, patch) => {
    const updated = await api.update(id, patch)
    set({
      scriptureQueue: get().scriptureQueue.map((q) => (q.id === id ? { ...q, ...updated } : q)),
      currentScripture: get().currentScripture?.id === id ? { ...get().currentScripture!, ...updated } : get().currentScripture,
    })
  },
  loadSettings: async () => {
    const s = await api.getSettings() as Partial<import('@/../api/services/settingsStore').AppSettings>
    set({
      autoApproveEnabled: s.autoApproveEnabled ?? get().autoApproveEnabled,
      autoApproveDelayMs: s.autoApproveDelayMs ?? get().autoApproveDelayMs,
      translationStyle: s.translationStyle ?? get().translationStyle,
      translationEnabledYoruba: s.translationEnabledYoruba ?? get().translationEnabledYoruba,
      translationEnabledHausa: s.translationEnabledHausa ?? get().translationEnabledHausa,
      translationEnabledIgbo: s.translationEnabledIgbo ?? get().translationEnabledIgbo,
      translationEnabledFrench: s.translationEnabledFrench ?? get().translationEnabledFrench,
      recordingEnabled: s.recordingEnabled ?? get().recordingEnabled,
      countdownEndAt: s.countdownEndAt ?? get().countdownEndAt,
      scriptureDetectionEngine: s.scriptureDetectionEngine ?? get().scriptureDetectionEngine,
      translationEngine: s.translationEngine ?? get().translationEngine,
    })
  },
  updateSettings: async (patch) => {
    const s = await api.updateSettings(patch)
    set({ autoApproveEnabled: s.autoApproveEnabled, autoApproveDelayMs: s.autoApproveDelayMs })
  },
  updateTranslationSettings: async (patch) => {
    const s = await api.updateSettings(patch)
    set({
      translationStyle: s.translationStyle,
      translationEnabledYoruba: s.translationEnabledYoruba,
      translationEnabledHausa: s.translationEnabledHausa,
      translationEnabledIgbo: s.translationEnabledIgbo,
      translationEnabledFrench: s.translationEnabledFrench,
    })
    publish('translation-settings', patch)
  },
  toggleScriptureOverlay: async (show: boolean) => {
    const s = await api.updateSettings({ showScriptureOverlay: show })
    set({ showScriptureOverlay: s.showScriptureOverlay })
    publish('settings', { showScriptureOverlay: s.showScriptureOverlay })
  },
  setTranslationEngine: async (engine) => {
    const s = await api.updateSettings({ translationEngine: engine })
    set({ translationEngine: s.translationEngine as 'openai' | 'marian' })
  },
  setScriptureDetectionEngine: async (engine) => {
    const s = await api.updateSettings({ scriptureDetectionEngine: engine })
    set({ scriptureDetectionEngine: s.scriptureDetectionEngine as 'openai' | 'offline' })
  },
  activeAudioCameraId: null,
  setActiveAudioCamera: async (id) => {
    const s = await api.updateSettings({ activeAudioCameraId: id })
    set({ activeAudioCameraId: s.activeAudioCameraId })
  },
  translations: {},
  fetchTranslations: async (text: string) => {
    const data = await api.translate(text, get().translationEngine)
    set({ translations: data || {} })
  },
  showLyricsOverlay: false,
  currentSongId: null,
  currentLineIndex: 0,
  loadCurrentLyric: async () => {
    const cur = await api.getCurrentLyric()
    set({ showLyricsOverlay: cur.show, currentSongId: cur.songId, currentLineIndex: cur.lineIndex })
  },
  setCurrentLyric: async (payload) => {
    const cur = await api.setCurrentLyric(payload)
    set({ showLyricsOverlay: cur.show, currentSongId: cur.songId, currentLineIndex: cur.lineIndex })
    publish('lyric-current', cur)
  },
  setRecordingEnabled: async (enabled) => {
    const s = await api.updateSettings({ recordingEnabled: enabled })
    set({ recordingEnabled: s.recordingEnabled ?? false })
    publish('settings', { recordingEnabled: s.recordingEnabled ?? false })
  },
  startCountdown: async (ms) => {
    const end = Date.now() + ms
    const s = await api.updateSettings({ countdownEndAt: end })
    set({ countdownEndAt: s.countdownEndAt ?? end })
    publish('settings', { countdownEndAt: s.countdownEndAt ?? end })
  },
  stopCountdown: async () => {
    const s = await api.updateSettings({ countdownEndAt: 0 })
    set({ countdownEndAt: s.countdownEndAt ?? null })
    publish('settings', { countdownEndAt: null })
  },
  activePlaylistItem: undefined,
  setActivePlaylistItem: (item) => { set({ activePlaylistItem: item }); publish('playlist-active', item) },
  activePlaylistItemPage: 1,
  nextActivePlaylistItemPage: () => set((s) => ({ activePlaylistItemPage: s.activePlaylistItemPage + 1 })),
  prevActivePlaylistItemPage: () => set((s) => ({ activePlaylistItemPage: Math.max(1, s.activePlaylistItemPage - 1) })),
  upsertCamera: (rec) => {
    const url = rec.previewPath ? (rec.previewPath.startsWith('/uploads') ? rec.previewPath : `/uploads/${rec.previewPath}`) : ''
    const cams = get().cameras
    const idx = cams.findIndex((c) => c.id === rec.id)
    if (idx >= 0) {
      const prev = cams[idx]
      const next = { 
        ...prev, 
        name: rec.name ?? prev.name, 
        previewUrl: url || prev.previewUrl, 
        connected: true,
        battery: rec.battery ?? prev.battery,
        signal: rec.signal ?? prev.signal
      }
      set({ cameras: [...cams.slice(0, idx), next, ...cams.slice(idx + 1)] })
    } else {
      const added: Camera = { 
        id: rec.id, 
        name: rec.name || rec.id, 
        battery: rec.battery ?? 100, 
        signal: rec.signal ?? 4, 
        connected: true, 
        previewUrl: url || '', 
        audioLevel: 0 
      }
      set({ cameras: [added, ...cams] })
    }
  },
  updateCameraPreview: (id, previewPath) => {
    const url = previewPath.startsWith('/uploads') ? previewPath : `/uploads/${previewPath}`
    set({ cameras: get().cameras.map((c) => (c.id === id ? { ...c, previewUrl: url, connected: true } : c)) })
  },
  updateCameraHeartbeat: (id, battery, signal) => {
    set({ cameras: get().cameras.map((c) => (c.id === id ? { 
      ...c, 
      connected: true,
      battery: battery ?? c.battery,
      signal: signal ?? c.signal
    } : c)) })
  },
  removeCamera: (id) => {
    set({ cameras: get().cameras.filter((c) => c.id !== id) })
  },
  liveStreams: {},
  setLiveStream: (id, stream) => {
    const next = { ...get().liveStreams }
    next[id] = stream
    set({ liveStreams: next })
  },
  iceServers: [],
  loadIceServers: async () => {
    const cfg = await api.getWebrtcConfig()
    set({ iceServers: cfg.iceServers })
  },
  updateIceServers: async (iceServers) => {
    const cfg = await api.setWebrtcConfig(iceServers)
    set({ iceServers: cfg.iceServers })
  },
  loadCameras: async () => {
    const list = await api.listCameras()
    const cams = get().cameras
    const map = new Map(cams.map((c) => [c.id, c]))
    for (const rec of list) {
      const prev = map.get(rec.id)
      const nextUrl = rec.previewPath ? rec.previewPath : prev?.previewUrl || ''
      map.set(rec.id, {
        id: rec.id,
        name: rec.name || prev?.name || rec.id,
        battery: rec.battery ?? prev?.battery ?? 100,
        signal: rec.signal ?? prev?.signal ?? 4,
        connected: true,
        previewUrl: nextUrl,
        audioLevel: prev?.audioLevel ?? 0,
      })
    }
    set({ cameras: Array.from(map.values()) })
  },
  setScriptureQueue: (queue) => set({ scriptureQueue: queue }),
}))
