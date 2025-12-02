type SigMsg = { type: 'registered' | 'connect' | 'disconnect' | 'offer' | 'answer' | 'candidate'; from?: string; to?: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }

let ws: WebSocket | null = null
let pc: RTCPeerConnection | null = null
let camId: string = ''
let remoteId: string = ''

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
    ws?.send(JSON.stringify({ type: 'register', id: camId }))
  })
  ws.addEventListener('message', async (ev) => {
    const msg = JSON.parse(String(ev.data)) as SigMsg
    if (msg.type === 'connect' && msg.from) {
      remoteId = msg.from
    }
    if (msg.type === 'offer' && msg.from && msg.sdp && pc) {
      remoteId = msg.from
      await pc.setRemoteDescription(msg.sdp)
      const ans = await pc.createAnswer()
      await pc.setLocalDescription(ans)
      ws?.send(JSON.stringify({ type: 'answer', to: remoteId, from: camId, sdp: ans }))
    } else if (msg.type === 'candidate' && msg.from && msg.candidate && pc) {
      await pc.addIceCandidate(msg.candidate)
    }
  })
}

export async function startCameraSender(id: string): Promise<MediaStream> {
  camId = id
  ensureWs()
  const ms = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  pc = new RTCPeerConnection()
  for (const track of ms.getTracks()) pc.addTrack(track, ms)
  pc.onicecandidate = (ev) => {
    if (ev.candidate) ws?.send(JSON.stringify({ type: 'candidate', to: remoteId, from: camId, candidate: ev.candidate }))
  }
  return ms
}

export function stopCameraSender(): void {
  try { pc?.close() } catch (e) { void e }
  pc = null
}
