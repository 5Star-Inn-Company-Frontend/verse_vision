import { useOperatorStore } from '@/store/useOperatorStore'

type SigMsg = { type: 'registered' | 'connect' | 'disconnect' | 'offer' | 'answer' | 'candidate'; from?: string; to?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }

let ws: WebSocket | null = null
let cachedConfig: RTCConfiguration | null = null
const peers = new Map<string, RTCPeerConnection>()

function sigUrl(): string {
  const u = new URL(window.location.href)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  u.pathname = '/ws'
  u.search = ''
  u.hash = ''
  return u.toString()
}

function ensureWs(): void {
  if (ws && ws.readyState === WebSocket.OPEN) return
  ws = new WebSocket(sigUrl())
  ws.addEventListener('open', () => {
    const id = localStorage.getItem('peerId') || `operator-${Math.random().toString(36).slice(2, 8)}`
    localStorage.setItem('peerId', id)
    ws?.send(JSON.stringify({ type: 'register', id }))
  })
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data)) as SigMsg
    if (msg.type === 'answer' && msg.from && msg.sdp) {
      const pc = peers.get(msg.from)
      if (pc) void pc.setRemoteDescription(msg.sdp)
    } else if (msg.type === 'candidate' && msg.from && msg.candidate) {
      const pc = peers.get(msg.from)
      if (pc) void pc.addIceCandidate(msg.candidate)
    }
  })
}

function send(to: string, payload: Omit<SigMsg, 'to'>): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  const from = localStorage.getItem('peerId') || ''
  const msg = { ...payload, to, from }
  ws.send(JSON.stringify(msg))
}

export async function connectToCamera(id: string): Promise<void> {
  ensureWs()
  if (!cachedConfig) {
    try {
      const res = await fetch('/api/webrtc/config')
      const json = await res.json()
      const iceServers = (json?.data?.iceServers || []) as RTCIceServer[]
      cachedConfig = { iceServers }
    } catch { cachedConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } }
  }
  const pc = new RTCPeerConnection(cachedConfig || { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
  peers.set(id, pc)
  const store = useOperatorStore.getState()
  const ms = new MediaStream()
  pc.addTransceiver('video', { direction: 'recvonly' })
  pc.addTransceiver('audio', { direction: 'recvonly' })
  pc.ontrack = (ev) => {
    ms.addTrack(ev.track)
    store.setLiveStream(id, ms)
  }
  pc.onicecandidate = (ev) => {
    if (ev.candidate) send(id, { type: 'candidate', candidate: ev.candidate })
  }
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  send(id, { type: 'connect' })
  send(id, { type: 'offer', sdp: offer })
}

export function disconnectCamera(id: string): void {
  const pc = peers.get(id)
  if (pc) {
    try { pc.close() } catch (e) { void e }
    peers.delete(id)
  }
  const store = useOperatorStore.getState()
  store.setLiveStream(id, null)
}
