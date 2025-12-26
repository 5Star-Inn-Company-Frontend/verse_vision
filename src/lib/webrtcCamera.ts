type SigMsg = { type: 'registered' | 'connect' | 'disconnect' | 'offer' | 'answer' | 'candidate'; from?: string; to?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }

let ws: WebSocket | null = null
const peers = new Map<string, RTCPeerConnection>()
let camId: string = ''
let localStream: MediaStream | null = null

function sigUrl(): string {
  const u = new URL(window.location.href)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  u.pathname = '/ws'
  u.search = ''
  u.hash = ''
  return u.toString()
}

async function getIceConfig(): Promise<RTCConfiguration> {
  try {
    const res = await fetch('/api/webrtc/config')
    const json = await res.json()
    const iceServers = (json?.data?.iceServers || []) as RTCIceServer[]
    return { iceServers }
  } catch {
    return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
  }
}

function ensureWs(): void {
  if (ws && ws.readyState === WebSocket.OPEN) return
  ws = new WebSocket(sigUrl())
  ws.addEventListener('open', () => {
    console.log('[CameraSender] WS Open')
    ws?.send(JSON.stringify({ type: 'register', id: camId }))
  })
  ws.addEventListener('message', async (ev) => {
    const msg = JSON.parse(String(ev.data)) as SigMsg
    const remoteId = msg.from
    if (!remoteId) return

    if (msg.type === 'offer' && msg.sdp) {
      console.log('[CameraSender] Received offer from', remoteId)
      let pc = peers.get(remoteId)
      if (!pc) {
        pc = await createPeerConnection(remoteId)
        peers.set(remoteId, pc)
      }
      await pc.setRemoteDescription(msg.sdp)
      const ans = await pc.createAnswer()
      await pc.setLocalDescription(ans)
      ws?.send(JSON.stringify({ type: 'answer', to: remoteId, from: camId, sdp: ans }))
    } else if (msg.type === 'candidate' && msg.candidate) {
      // console.log('[CameraSender] Received candidate from', remoteId)
      const pc = peers.get(remoteId)
      if (pc) await pc.addIceCandidate(msg.candidate)
    } else if (msg.type === 'disconnect') {
      console.log('[CameraSender] Received disconnect from', remoteId)
      const pc = peers.get(remoteId)
      pc?.close()
      peers.delete(remoteId)
    }
  })
}

async function createPeerConnection(remoteId: string): Promise<RTCPeerConnection> {
  const config = await getIceConfig()
  const pc = new RTCPeerConnection(config)
  if (localStream) {
    for (const track of localStream.getTracks()) pc.addTrack(track, localStream)
  }
  pc.onicecandidate = (ev) => {
    if (ev.candidate) ws?.send(JSON.stringify({ type: 'candidate', to: remoteId, from: camId, candidate: ev.candidate }))
  }
  pc.oniceconnectionstatechange = () => {
    console.log('[CameraSender] ICE State for', remoteId, ':', pc.iceConnectionState)
  }
  pc.onconnectionstatechange = () => {
    console.log('[CameraSender] Connection State for', remoteId, ':', pc.connectionState)
  }
  return pc
}

export async function startCameraSender(id: string): Promise<MediaStream> {
  camId = id
  ensureWs()
  const ms = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  localStream = ms
  return ms
}

export function stopCameraSender(): void {
  peers.forEach((pc) => pc.close())
  peers.clear()
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop())
    localStream = null
  }
}
