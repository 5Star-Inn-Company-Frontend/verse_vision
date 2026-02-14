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

export type PlaylistItem = {
  id: string
  type: 'scripture' | 'lyric' | 'image' | 'video' | 'pdf' | 'ppt'
  title?: string
  url?: string
}

type OperatorState = {
  cameras: Camera[]
  primaryCameraId: string | null
  activeAudioCameraId: string | null
  selectedMicrophoneId: string | null
  setSelectedMicrophoneId: (id: string | null) => void

  scriptureQueue: ScriptureItem[]
  currentScripture: ScriptureItem | null
  autoApproveEnabled: boolean
  autoApproveDelayMs: number
  translationStyle: 'subtitle' | 'split' | 'ticker'
  translationEnabledYoruba: boolean
  translationEnabledHausa: boolean
  translationEnabledIgbo: boolean
  translationEnabledFrench: boolean
  translations: Record<string, string | undefined> | null
  translationEngine: 'openai' | 'marian'
  scriptureDetectionEngine: 'openai' | 'offline'
  offlineStatus: 'stopped' | 'starting' | 'downloading' | 'loading' | 'ready' | 'error' | 'installing_deps' | 'python_missing'
  offlineDetails: string
  cloudApiToken: string | null
  userPlan: string | null
  setUserPlan: (plan: string | null) => void
  showScriptureOverlay: boolean
  recordingEnabled: boolean
  countdownEndAt: number | null
  approveScripture: (id: string) => void
  rejectScripture: (id: string) => void
  setPrimaryCamera: (id: string) => void
  setActiveAudioCamera: (id: string | null) => void
  syncPrimaryCamera: (id: string) => void
  setScriptureQueue: (items: ScriptureItem[]) => void
  loadQueue: () => Promise<void>
  loadCurrent: () => Promise<void>
  updateScripture: (id: string, patch: Partial<ScriptureItem>) => Promise<void>
  syncScripture: (item: ScriptureItem | null) => void
  loadSettings: () => Promise<void>
  updateSettings: (patch: { autoApproveEnabled?: boolean; autoApproveDelayMs?: number }) => Promise<void>
  syncSettings: (settings: any) => void
  updateOverlaySettings: (patch: {
    overlayBackgroundColor?: string
    overlayBackgroundImage?: string | null
    overlayTextColor?: string
    overlayTextScale?: number
    overlayFontFamily?: string
  }) => Promise<void>
  overlayBackgroundColor: string
  overlayBackgroundImage: string | null
  overlayTextColor: string
  overlayTextScale: number
  overlayFontFamily: string
  updateTranslationSettings: (patch: {
    translationStyle?: 'subtitle' | 'split' | 'ticker'
    translationEnabledYoruba?: boolean
    translationEnabledHausa?: boolean
    translationEnabledIgbo?: boolean
    translationEnabledFrench?: boolean
  }) => Promise<void>
  syncTranslationSettings: (settings: any) => void
  fetchTranslations: (text: string) => Promise<void>
  setTranslationEngine: (engine: 'openai' | 'marian') => Promise<void>
  setScriptureDetectionEngine: (engine: 'openai' | 'offline') => Promise<void>
  checkOfflineStatus: () => Promise<void>
  setCloudToken: (token: string | null) => Promise<void>
  
  // Lyrics
  showLyricsOverlay: boolean
  currentSongId: string | null
  currentLineIndex: number
  currentSongLines: string[]
  setLyricsOverlay: (show: boolean) => Promise<void>
  toggleScriptureOverlay: (show: boolean) => Promise<void>
  setCurrentSong: (songId: string | null) => Promise<void>

  // Debug/Feedback
  lastTranscription: string
  setLastTranscription: (text: string) => void
  
  // Live Translation
  liveTranslationEnabled: boolean
  liveTranslationContent: { text: string; translations: Record<string, string> } | null
  setLiveTranslationEnabled: (enabled: boolean) => void
  setLiveTranslationContent: (content: { text: string; translations: Record<string, string> } | null) => void

  setCurrentLineIndex: (index: number) => Promise<void>
  setCurrentLyric: (payload: { show: boolean; songId: string | null; lineIndex: number }) => Promise<void>
  loadCurrentLyric: () => Promise<void>
  syncLyricState: (payload: { show: boolean; songId: string | null; lineIndex: number }) => Promise<void>
  
  // Recording
  setRecordingEnabled: (enabled: boolean) => Promise<void>
  
  // Countdown
  startCountdown: (ms: number) => Promise<void>
  stopCountdown: () => Promise<void>

  // Playlist
  activePlaylistItem?: PlaylistItem
  setActivePlaylistItem: (item?: PlaylistItem) => void
  syncPlaylistState: (item?: PlaylistItem) => void
  activePlaylistItemPage: number
  nextActivePlaylistItemPage: () => void
  prevActivePlaylistItemPage: () => void

  // Camera Management
  upsertCamera: (rec: Partial<Camera> & { id: string; previewPath?: string }) => void
  updateCameraPreview: (id: string, previewPath: string) => void
  updateCameraHeartbeat: (id: string, battery?: number, signal?: number) => void
  removeCamera: (id: string) => void
  loadCameras: () => Promise<void>
  
  // Live Streams
  liveStreams: Record<string, MediaStream>
  setLiveStream: (id: string, stream: MediaStream) => void
  
  // WebRTC Config
  iceServers: RTCIceServer[]
  loadIceServers: () => Promise<void>
  updateIceServers: (servers: RTCIceServer[]) => Promise<void>
  
  // Primary Camera Publish (helper)
  setPrimaryCameraPublish: (id: string) => void

  // Panel Visibility
  panelTranslationVisible: boolean
  panelPairingVisible: boolean
  panelCameraGridVisible: boolean
  panelLyricsVisible: boolean
  panelPlaylistVisible: boolean
  panelSceneVisible: boolean
  togglePanel: (panel: 'translation' | 'pairing' | 'cameraGrid' | 'lyrics' | 'playlist' | 'scene') => void
}

export const useOperatorStore = create<OperatorState>((set, get) => ({
  cameras: [
    {
      id: 'cam-default',
      name: 'Default',
      battery: 0,
      signal: 4,
      connected: true,
      previewUrl: '/f8c992521ace21d14c000c81e44fd203.jpeg',
      audioLevel: 0,
    }
  ],
  primaryCameraId: 'cam-default',
  activeAudioCameraId: null,
  selectedMicrophoneId: null,
  scriptureQueue: [],
  currentScripture: null,
  autoApproveEnabled: false,
  autoApproveDelayMs: 2000,
  translationStyle: 'subtitle',
  translationEnabledYoruba: false,
  translationEnabledHausa: false,
  translationEnabledIgbo: false,
  translationEnabledFrench: false,
  translations: null,
  translationEngine: 'marian',
  scriptureDetectionEngine: 'offline',
  offlineStatus: 'stopped',
  offlineDetails: '',
  cloudApiToken: null,
  userPlan: null,
  overlayBackgroundColor: 'rgba(0,0,0,0.7)',
  overlayBackgroundImage: null,
  overlayTextColor: '#ffffff',
  overlayTextScale: 1.0,
  overlayFontFamily: 'sans-serif',
  showScriptureOverlay: false,
  recordingEnabled: false,
  countdownEndAt: null,
  approveScripture: async (id) => {
    const approved = await api.approve(id)
    
    // Auto-enable scripture overlay and disable lyrics
    const { showScriptureOverlay, showLyricsOverlay } = get()
    if (!showScriptureOverlay || showLyricsOverlay) {
      await api.updateSettings({ showScriptureOverlay: true, showLyricsOverlay: false })
      set({ showScriptureOverlay: true, showLyricsOverlay: false })
      publish('settings', { showScriptureOverlay: true, showLyricsOverlay: false })
    }

    set((state) => ({
            scriptureQueue: state.scriptureQueue.filter((s) => s.id !== id),
            currentScripture: approved,
          }))
          publish('scripture-current', approved)
          
          // Fetch translations for the approved scripture
          if (approved.translation !== 'RAW') {
             await get().fetchTranslations(approved.text)
          } else {
             set({ translations: null })
          }
        },
  rejectScripture: async (id) => {
    await api.reject(id)
    set((state) => ({
      scriptureQueue: state.scriptureQueue.filter((s) => s.id !== id),
    }))
  },
  setPrimaryCamera: (id) => { 
    set({ primaryCameraId: id })
    publish('camera-primary', { id }) 
  },
  setActiveAudioCamera: (id) => {
    set({ activeAudioCameraId: id })
  },
  setSelectedMicrophoneId: (id) => set({ selectedMicrophoneId: id }),
  syncPrimaryCamera: (id) => {
    set({ primaryCameraId: id })
  },
  // publish camera change
  setPrimaryCameraPublish: (id: string) => {
    set({ primaryCameraId: id })
    publish('camera-primary', { id })
  },
  setScriptureQueue: (items) => set({ scriptureQueue: items }),
  loadQueue: async () => {
    const items = await api.getQueue()
    set({ scriptureQueue: items })
  },
  loadCurrent: async () => {
    const current = await api.getCurrent()
    set({ currentScripture: current })
    if (current && current.translation !== 'RAW') {
      await get().fetchTranslations(current.text)
    }
  },
  updateScripture: async (id, patch) => {
    const updated = await api.update(id, patch)
    const isCurrent = get().currentScripture?.id === id
    const newCurrent = isCurrent ? { ...get().currentScripture!, ...updated } : get().currentScripture
    set({
      scriptureQueue: get().scriptureQueue.map((q) => (q.id === id ? { ...q, ...updated } : q)),
      currentScripture: newCurrent,
    })
    if (isCurrent) publish('scripture-current', newCurrent)
  },
  syncScripture: (item) => {
    set({ currentScripture: item })
    if (item && item.translation !== 'RAW' && item.text) {
      get().fetchTranslations(item.text)
    }
  },
  loadSettings: async () => {
    const s = await api.getSettings() as Partial<import('@/../api/services/settingsStore').AppSettings>
    let plan = get().userPlan
    if (s.cloudApiToken) {
      api.setToken(s.cloudApiToken)
      const user = await api.me()
      if (user) {
        plan = user.active_subscription?.plan?.slug || 'starter'
      }
    }
    set({
      userPlan: plan,
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
      cloudApiToken: s.cloudApiToken ?? get().cloudApiToken,
      showScriptureOverlay: (s.showScriptureOverlay ?? get().showScriptureOverlay) && !(s.showLyricsOverlay ?? get().showLyricsOverlay),
      showLyricsOverlay: s.showLyricsOverlay ?? get().showLyricsOverlay,
      overlayBackgroundColor: s.overlayBackgroundColor ?? get().overlayBackgroundColor,
      overlayBackgroundImage: s.overlayBackgroundImage ?? get().overlayBackgroundImage,
      overlayTextColor: s.overlayTextColor ?? get().overlayTextColor,
      overlayTextScale: s.overlayTextScale ?? get().overlayTextScale,
      overlayFontFamily: s.overlayFontFamily ?? get().overlayFontFamily,
    })
  },
  updateSettings: async (patch) => {
    const s = await api.updateSettings(patch)
    set({ autoApproveEnabled: s.autoApproveEnabled, autoApproveDelayMs: s.autoApproveDelayMs })
  },
  updateOverlaySettings: async (patch: {
    overlayBackgroundColor?: string
    overlayBackgroundImage?: string | null
    overlayTextColor?: string
    overlayTextScale?: number
    overlayFontFamily?: string
  }) => {
    const s = await api.updateSettings(patch)
    set({
      overlayBackgroundColor: s.overlayBackgroundColor ?? get().overlayBackgroundColor,
      overlayBackgroundImage: s.overlayBackgroundImage !== undefined ? s.overlayBackgroundImage : get().overlayBackgroundImage,
      overlayTextColor: s.overlayTextColor ?? get().overlayTextColor,
      overlayTextScale: s.overlayTextScale ?? get().overlayTextScale,
      overlayFontFamily: s.overlayFontFamily ?? get().overlayFontFamily,
    })
    publish('settings', {
      overlayBackgroundColor: s.overlayBackgroundColor,
      overlayBackgroundImage: s.overlayBackgroundImage,
      overlayTextColor: s.overlayTextColor,
      overlayTextScale: s.overlayTextScale,
      overlayFontFamily: s.overlayFontFamily,
    })
  },
  syncSettings: (s) => set((prev) => {
    // Determine target states
    const nextScripture = s.showScriptureOverlay ?? prev.showScriptureOverlay
    const nextLyrics = s.showLyricsOverlay ?? prev.showLyricsOverlay
    
    // Mutual exclusion logic for sync
    let finalScripture = nextScripture
    let finalLyrics = nextLyrics
    
    // If we receive an update to show one, we must hide the other
    if (s.showScriptureOverlay === true) {
      finalLyrics = false
    } else if (s.showLyricsOverlay === true) {
      finalScripture = false
    }

    return {
    autoApproveEnabled: s.autoApproveEnabled ?? prev.autoApproveEnabled,
    autoApproveDelayMs: s.autoApproveDelayMs ?? prev.autoApproveDelayMs,
    recordingEnabled: s.recordingEnabled ?? prev.recordingEnabled,
    countdownEndAt: s.countdownEndAt ?? prev.countdownEndAt,
    scriptureDetectionEngine: s.scriptureDetectionEngine ?? prev.scriptureDetectionEngine,
    translationEngine: s.translationEngine ?? prev.translationEngine,
    cloudApiToken: s.cloudApiToken ?? prev.cloudApiToken,
    showScriptureOverlay: finalScripture,
      showLyricsOverlay: finalLyrics,
      overlayBackgroundColor: s.overlayBackgroundColor ?? prev.overlayBackgroundColor,
      overlayBackgroundImage: s.overlayBackgroundImage !== undefined ? s.overlayBackgroundImage : prev.overlayBackgroundImage,
      overlayTextColor: s.overlayTextColor ?? prev.overlayTextColor,
      overlayTextScale: s.overlayTextScale ?? prev.overlayTextScale,
      overlayFontFamily: s.overlayFontFamily ?? prev.overlayFontFamily,
    }}),
  updateTranslationSettings: async (patch) => {
    const s = await api.updateSettings(patch)
    set({
      translationStyle: s.translationStyle,
      translationEnabledYoruba: s.translationEnabledYoruba,
      translationEnabledHausa: s.translationEnabledHausa,
      translationEnabledIgbo: s.translationEnabledIgbo,
      translationEnabledFrench: s.translationEnabledFrench,
    })
      publish('translation-settings', {
      translationStyle: s.translationStyle,
      translationEnabledYoruba: s.translationEnabledYoruba,
      translationEnabledHausa: s.translationEnabledHausa,
      translationEnabledIgbo: s.translationEnabledIgbo,
      translationEnabledFrench: s.translationEnabledFrench,
    })
  },
  syncTranslationSettings: (s) => set((prev) => ({
    translationStyle: s.translationStyle ?? prev.translationStyle,
    translationEnabledYoruba: s.translationEnabledYoruba ?? prev.translationEnabledYoruba,
    translationEnabledHausa: s.translationEnabledHausa ?? prev.translationEnabledHausa,
    translationEnabledIgbo: s.translationEnabledIgbo ?? prev.translationEnabledIgbo,
    translationEnabledFrench: s.translationEnabledFrench ?? prev.translationEnabledFrench,
  })),
  fetchTranslations: async (text) => {
    if (!text) {
      set({ translations: null })
      return
    }
    const res = await api.translate(text, get().translationEngine)
    set({ translations: res })
  },
  setTranslationEngine: async (engine) => {
    const s = await api.updateSettings({ translationEngine: engine })
    set({ translationEngine: s.translationEngine })
    publish('settings', { translationEngine: s.translationEngine })
  },
  setScriptureDetectionEngine: async (engine) => {
    const s = await api.updateSettings({ scriptureDetectionEngine: engine })
    set({ scriptureDetectionEngine: s.scriptureDetectionEngine })
    publish('settings', { scriptureDetectionEngine: s.scriptureDetectionEngine })
  },
  checkOfflineStatus: async () => {
    const data = await api.getOfflineStatus()
    set({ offlineStatus: data.status, offlineDetails: data.details })
  },
  setCloudToken: async (token) => {
    api.setToken(token)
    const s = await api.updateSettings({ cloudApiToken: token })
    set({ cloudApiToken: s.cloudApiToken })
  },
  setUserPlan: (plan) => set({ userPlan: plan }),
  
  showLyricsOverlay: false,
  currentSongId: null,
  currentLineIndex: 0,
  currentSongLines: [],
  
  lastTranscription: '',
  setLastTranscription: (text) => set({ lastTranscription: text }),

  // Live Translation
  liveTranslationEnabled: false,
  liveTranslationContent: null,
  setLiveTranslationEnabled: (enabled) => set({ liveTranslationEnabled: enabled }),
  setLiveTranslationContent: (content) => set({ liveTranslationContent: content }),

  setLyricsOverlay: async (show) => {
    const patch: any = { showLyricsOverlay: show }
    if (show) patch.showScriptureOverlay = false
    const s = await api.updateSettings(patch)
    set({ 
      showLyricsOverlay: s.showLyricsOverlay ?? false,
      showScriptureOverlay: (s.showScriptureOverlay ?? get().showScriptureOverlay) && !(s.showLyricsOverlay ?? false)
    })
    publish('lyric-current', { show: s.showLyricsOverlay ?? false, songId: get().currentSongId, lineIndex: get().currentLineIndex })
    if (show) publish('settings', { showScriptureOverlay: false })
  },
  toggleScriptureOverlay: async (show) => {
    const patch: any = { showScriptureOverlay: show }
    if (show) patch.showLyricsOverlay = false
    const s = await api.updateSettings(patch)
    set({ 
      showScriptureOverlay: s.showScriptureOverlay ?? show,
      showLyricsOverlay: s.showLyricsOverlay ?? get().showLyricsOverlay
    })
    publish('settings', { showScriptureOverlay: s.showScriptureOverlay ?? show })
    if (show) {
      publish('lyric-current', { show: false, songId: get().currentSongId, lineIndex: get().currentLineIndex })
    }
  },
  setCurrentSong: async (songId) => {
    const s = await api.updateSettings({ currentSongId: songId, currentLineIndex: 0 })
    set({ currentSongId: s.currentSongId ?? null, currentLineIndex: 0, currentSongLines: [] }) // Lines will be loaded by UI
    publish('lyric-current', { show: get().showLyricsOverlay, songId: s.currentSongId ?? null, lineIndex: 0 })
  },
  setCurrentLineIndex: async (index) => {
    const s = await api.updateSettings({ currentLineIndex: index })
    set({ currentLineIndex: s.currentLineIndex ?? 0 })
    publish('lyric-current', { show: get().showLyricsOverlay, songId: get().currentSongId, lineIndex: s.currentLineIndex ?? 0 })
  },
  loadCurrentLyric: async () => {
    const cur = await api.getCurrentLyric()
    await get().syncLyricState(cur)
  },
  syncLyricState: async (cur) => {
    let lines: string[] = get().currentSongLines
    if (cur.songId && cur.songId !== get().currentSongId) {
      // We don't have song data in store, so we can't really set lines here easily without fetching
      // But usually this sync comes from Program view which might not need lines, 
      // or this store is used by Operator.
      // For now, let's just fetch song details if we can, or just set ID.
      const song = await api.getSong(cur.songId)
      if (song) {
        lines = song.lines || []
      }
    } else if (!cur.songId) {
      lines = []
    }
    set({ 
      showLyricsOverlay: cur.show, 
      currentSongId: cur.songId, 
      currentLineIndex: cur.lineIndex, 
      currentSongLines: lines,
      showScriptureOverlay: cur.show ? false : get().showScriptureOverlay
    })
  },
  setCurrentLyric: async (payload) => {
    if (payload.show) {
      // Mutual exclusion: Turn off scripture if lyrics are being shown
      await api.updateSettings({ showScriptureOverlay: false })
      set({ showScriptureOverlay: false })
      publish('settings', { showScriptureOverlay: false })
    }
    const cur = await api.setCurrentLyric(payload)
    await get().syncLyricState(cur)
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
  syncPlaylistState: (item) => { set({ activePlaylistItem: item }) },
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
        battery: rec.battery ?? prev?.battery ?? 0,
        signal: rec.signal ?? prev?.signal ?? 0,
        connected: true,
        previewUrl: nextUrl,
        audioLevel: prev?.audioLevel ?? 0
      })
    }
    set({ cameras: Array.from(map.values()) })
  },
  
  // Panel Visibility
  panelTranslationVisible: false,
  panelPairingVisible: false,
  panelCameraGridVisible: false,
  panelLyricsVisible: false,
  panelPlaylistVisible: false,
  panelSceneVisible: false,
  togglePanel: (panel) => {
    if (panel === 'translation') set((s) => ({ panelTranslationVisible: !s.panelTranslationVisible }))
    if (panel === 'pairing') set((s) => ({ panelPairingVisible: !s.panelPairingVisible }))
    if (panel === 'cameraGrid') set((s) => ({ panelCameraGridVisible: !s.panelCameraGridVisible }))
    if (panel === 'lyrics') set((s) => ({ panelLyricsVisible: !s.panelLyricsVisible }))
    if (panel === 'playlist') set((s) => ({ panelPlaylistVisible: !s.panelPlaylistVisible }))
    if (panel === 'scene') set((s) => ({ panelSceneVisible: !s.panelSceneVisible }))
  }
}))
