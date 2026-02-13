const BASE = '/api'
export const CLOUD = 'https://versevision.5starcompany.com.ng/api'
let authToken: string | null = null

export const api = {
  setToken: (token: string | null) => {
    authToken = token
  },
  _headers: () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authToken) h['Authorization'] = `Bearer ${authToken}`
    return h
  },
  me: async () => {
    try {
      const res = await fetch(`${CLOUD}/auth/me`, { headers: api._headers() })
      if (!res.ok) return null
      const json = await res.json()
      return json.user
    } catch {
      return null
    }
  },
  transcribe: async (audioBlob: Blob, engine: 'openai' | 'offline' = 'openai'): Promise<{ text: string }> => {
    const fd = new FormData()
    fd.append('audio', audioBlob, 'audio.webm')
    fd.append('engine', engine)
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    
    const res = await fetch(`${BASE}/ai/transcribe`, {
      method: 'POST',
      headers,
      body: fd,
    })
    const json = await res.json()
    return json.data
  },
  detectScripture: async (text: string, engine: 'openai' | 'offline' = 'openai') => {
    const res = await fetch(`${BASE}/ai/scripture/detect`, {
      method: 'POST',
      headers: api._headers(),
      body: JSON.stringify({ text, engine }),
    })
    const json = await res.json()
    return json.data // returns { references, queue }
  },
  addManualScripture: async (data: { reference: string; translation: string; text?: string }) => {
    const res = await fetch(`${BASE}/ai/scripture/detect`, {
      method: 'POST',
      headers: api._headers(),
      body: JSON.stringify({ text: data.reference + " " + data.translation, engine: 'offline' }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    return json.data
  },
  addManualText: async (data: { title?: string; text: string; translate?: boolean }) => {
    const res = await fetch(`${BASE}/scripture/manual-text`, {
      method: 'POST',
      headers: api._headers(),
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    return json.data
  },
  getAvailableTranslations: async () => {
    const res = await fetch(`${BASE}/scripture/translations`)
    const json = await res.json()
    return json.data || []
  },
  getChapter: async (translation: string, book: string, chapter: string): Promise<Record<string, string> | null> => {
    try {
      const res = await fetch(`${BASE}/scripture/chapter?translation=${encodeURIComponent(translation)}&book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data
    } catch {
      return null
    }
  },
  getOfflineStatus: async () => {
    try {
      const res = await fetch(`${BASE}/ai/offline/status`)
      if (!res.ok) return { status: 'stopped', details: '' }
      const json = await res.json()
      return json.data
    } catch {
      return { status: 'stopped', details: 'Network Error' }
    }
  },
  getQueue: async () => {
    try {
      const res = await fetch(`${BASE}/scripture/queue`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data
    } catch {
      return []
    }
  },
  getCurrent: async () => {
    try {
      const res = await fetch(`${BASE}/scripture/current`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data
    } catch {
      return null
    }
  },
  approve: async (id: string) => {
    const res = await fetch(`${BASE}/scripture/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    return json.data
  },
  reject: async (id: string) => {
    await fetch(`${BASE}/scripture/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  },
  update: async (id: string, patch: Record<string, unknown>) => {
    const res = await fetch(`${BASE}/scripture/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    return json.data
  },
  getSettings: async () => {
    try {
      const res = await fetch(`${BASE}/settings`)
      if (!res.ok) return {}
      const json = await res.json()
      return json.data
    } catch {
      return {}
    }
  },
  updateSettings: async (patch: Record<string, unknown>) => {
    const res = await fetch(`${BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    return json.data
  },
  pairCamera: async (customIp?: string) => {
    const res = await fetch(`${BASE}/camera/pair`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customIp })
    })
    const json = await res.json()
    return json.data
  },
  getLocalIp: async () => {
    try {
      const res = await fetch(`${BASE}/camera/ip`)
      const json = await res.json()
      return json.data as string
    } catch {
      return ''
    }
  },
  listCameras: async () => {
    try {
      const res = await fetch(`${BASE}/camera/list`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data as Array<{ 
        id: string; 
        name?: string | null; 
        previewPath?: string | null; 
        battery?: number | null; 
        signal?: number | null 
      }>
    } catch {
      return []
    }
  },
  listScenes: async () => {
    try {
      const res = await fetch(`${BASE}/scenes`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data
    } catch {
      return []
    }
  },
  createScene: async (payload: { name: string; primaryCameraId: string | null; translationStyle: string; showScriptureOverlay: boolean }) => {
    const res = await fetch(`${BASE}/scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    return json.data
  },
  translate: async (text: string, engine?: 'openai' | 'marian') => {
    const res = await fetch(`${BASE}/ai/translate`, {
      method: 'POST',
      headers: api._headers(),
      body: JSON.stringify({ text, engine }),
    })
    const json = await res.json()
    return json.data
  },
  fetchLyrics: async (title: string) => {
    try {
      const res = await fetch(`${BASE}/ai/lyrics/fetch`, {
        method: 'POST',
        headers: api._headers(),
        body: JSON.stringify({ title }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch lyrics')
      }
      const json = await res.json()
      return json.data as { title: string; lines: string[] }
    } catch (e) {
      throw e
    }
  },
  listSongs: async () => {
    try {
      const res = await fetch(`${BASE}/lyrics/songs`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data
    } catch {
      return []
    }
  },
  createSong: async (payload: { title: string; language?: string | null; lines: string[]; source?: 'default' | 'ai' | 'uploaded' }) => {
    try {
      const res = await fetch(`${BASE}/lyrics/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.data
    } catch {
      return null
    }
  },
  getSong: async (id: string) => {
    try {
      const res = await fetch(`${BASE}/lyrics/${id}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data as { id: string; title: string; language?: string | null; lines: string[]; source?: string }
    } catch {
      return null
    }
  },
  getCurrentLyric: async () => {
    try {
      const res = await fetch(`${BASE}/lyrics/current`)
      if (!res.ok) return { songId: null, lineIndex: 0, show: false }
      const json = await res.json()
      return json.data
    } catch {
      return { songId: null, lineIndex: 0, show: false }
    }
  },
  setCurrentLyric: async (payload: { songId: string | null; lineIndex: number; show: boolean }) => {
    const res = await fetch(`${BASE}/lyrics/current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    return json.data
  },
  getWebrtcConfig: async () => {
    try {
      const res = await fetch(`${BASE.replace('/api','')}/api/webrtc/config`)
      if (!res.ok) return { iceServers: [] as RTCIceServer[] }
      const json = await res.json()
      return json.data as { iceServers: RTCIceServer[] }
    } catch {
      return { iceServers: [] as RTCIceServer[] }
    }
  },
  listPlans: async () => {
    try {
      const res = await fetch(`${CLOUD}/plans`, { headers: api._headers() })
      if (!res.ok) return []
      return await res.json() as Array<{ id: number; name: string; slug: string; price: number }>
    } catch {
      return []
    }
  },
  initializeSubscription: async (planSlug: string) => {
    const res = await fetch(`${CLOUD}/subscription/initialize`, {
      method: 'POST',
      headers: api._headers(),
      body: JSON.stringify({ plan_slug: planSlug }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to initialize subscription')
    }
    return await res.json()
  },
  setWebrtcConfig: async (iceServers: RTCIceServer[]) => {
    const res = await fetch(`${BASE.replace('/api','')}/api/webrtc/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iceServers }),
    })
    const json = await res.json()
    return json.data as { iceServers: RTCIceServer[] }
  },
  listPlaylists: async () => {
    try {
      const res = await fetch(`${BASE}/playlists`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data
    } catch {
      return []
    }
  },
  createPlaylist: async (name: string) => {
    try {
      const res = await fetch(`${BASE}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.data
    } catch {
      return null
    }
  },
  listPlaylistItems: async (id: string) => {
    try {
      const res = await fetch(`${BASE}/playlists/${id}/items`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data
    } catch {
      return []
    }
  },
  addPlaylistItem: async (id: string, item: { type: string; title: string; path?: string | null }) => {
    try {
      const res = await fetch(`${BASE}/playlists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.data
    } catch {
      return null
    }
  },
  removePlaylistItem: async (itemId: string) => {
    await fetch(`${BASE}/playlists/items/${itemId}`, { method: 'DELETE' })
  },
  uploadMedia: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${BASE}/media/upload`, { method: 'POST', body: fd })
    const json = await res.json()
    return json.data
  },
  enqueueMediaProcess: async (path: string, title?: string) => {
    try {
      const res = await fetch(`${BASE}/media/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, title }),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.data
    } catch {
      return null
    }
  },
  listMediaJobs: async () => {
    try {
      const res = await fetch(`${BASE}/media/jobs`)
      if (!res.ok) return []
      const json = await res.json()
      return json.data
    } catch {
      return []
    }
  },
  getMediaJob: async (id: string) => {
    try {
      const res = await fetch(`${BASE}/media/jobs/${id}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data
    } catch {
      return null
    }
  },
}
