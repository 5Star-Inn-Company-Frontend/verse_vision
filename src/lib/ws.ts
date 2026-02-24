import { useOperatorStore } from '@/store/useOperatorStore'
import { connectToCamera } from '@/lib/webrtc'

function url(): string {
  return 'ws://localhost:3332/ws'
}

export function startWs(): void {
  let ws: WebSocket | null = null
  let tries = 0
  const connected = new Set<string>()
  const open = () => {
    ws = new WebSocket(url())
    ws.addEventListener('open', () => {
      tries = 0
      const id = sessionStorage.getItem('vv_app_peer_id') || `app-${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem('vv_app_peer_id', id)
      ws?.send(JSON.stringify({ type: 'register', id }))
    })
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as { type: string; camera?: { id?: string; name?: string | null; previewPath?: string | null; battery?: number | null; signal?: number | null }; cameraId?: string; previewPath?: string }
        const store = useOperatorStore.getState()
        if (msg.type === 'cameraRegistered' && msg.camera?.id) {
          store.upsertCamera({ id: msg.camera.id, name: msg.camera.name ?? null, previewPath: msg.camera.previewPath ?? null, battery: msg.camera.battery ?? undefined, signal: msg.camera.signal ?? undefined })
          if (!connected.has(msg.camera.id)) { connected.add(msg.camera.id); void connectToCamera(msg.camera.id) }
        } else if (msg.type === 'cameraHeartbeat' && msg.camera?.id) {
          store.updateCameraHeartbeat(msg.camera.id, msg.camera.battery ?? undefined, msg.camera.signal ?? undefined)
          if (!connected.has(msg.camera.id)) { connected.add(msg.camera.id); void connectToCamera(msg.camera.id) }
        } else if (msg.type === 'cameraFrame' && msg.cameraId && msg.previewPath) {
          store.updateCameraPreview(msg.cameraId, msg.previewPath)
        } else if (msg.type === 'cameraRemoved' && msg.cameraId) {
          store.removeCamera(msg.cameraId)
        }
      } catch (e) { void e }
    })
    ws.addEventListener('close', () => {
      const delay = Math.min(10000, 500 * Math.pow(2, tries++))
      setTimeout(() => open(), delay)
    })
    ws.addEventListener('error', () => {
      try { ws?.close() } catch (e) { void e }
    })
  }
  open()
}
