import { useEffect, useRef } from 'react'
import { ExternalLink, Radio, PowerOff } from 'lucide-react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { connectToCamera, disconnectCamera } from '@/lib/webrtc'

export default function CameraGrid() {
  const { cameras, setPrimaryCamera, activeAudioCameraId, setActiveAudioCamera, liveStreams, loadCameras } = useOperatorStore()
  const popouts = useRef<Record<string, Window>>({})

  useEffect(() => {
    void loadCameras()
  }, [loadCameras])

  // Keep popout windows in sync with live streams
  useEffect(() => {
    Object.entries(popouts.current).forEach(([id, win]) => {
      if (win.closed) {
        delete popouts.current[id]
        return
      }
      const stream = liveStreams[id]
      const video = win.document.getElementById('vid') as HTMLVideoElement
      if (video && stream && video.srcObject !== stream) {
        video.srcObject = stream
        video.play().catch(() => {})
      }
    })
  }, [liveStreams])

  const openPopout = (cam: { id: string; name: string }) => {
    if (popouts.current[cam.id] && !popouts.current[cam.id].closed) {
      popouts.current[cam.id].focus()
      return
    }

    const win = window.open('', `vv-cam-${cam.id}`, 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no')
    if (!win) return

    win.document.title = `VerseVision - ${cam.name}`
    win.document.body.innerHTML = `
      <style>
        body { margin: 0; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
        video { width: 100%; height: 100%; object-fit: contain; }
      </style>
      <video id="vid" autoplay muted playsinline></video>
    `
    
    const stream = liveStreams[cam.id]
    if (stream) {
      const v = win.document.getElementById('vid') as HTMLVideoElement
      v.srcObject = stream
    }

    // cleanup on close
    win.addEventListener('beforeunload', () => {
      delete popouts.current[cam.id]
    })

    popouts.current[cam.id] = win
  }

  return (
    <div className="h-full w-full bg-gray-900 rounded-lg border border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Camera Grid</h3>
        <span className="text-xs text-gray-400">{cameras.length} connected</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div 
          onClick={() => { setPrimaryCamera('none'); }} 
          role="button" 
          tabIndex={0} 
          className="group relative bg-gray-800 rounded overflow-hidden border border-gray-700 cursor-pointer flex flex-col items-center justify-center aspect-video hover:bg-gray-700 transition-colors"
        >
          <div className="text-3xl mb-2">🚫</div>
          <div className="text-xs text-gray-300">Turn Off Camera</div>
        </div>
        {cameras.map((cam) => (
          <div key={cam.id} onClick={() => { setPrimaryCamera(cam.id); }} role="button" tabIndex={0} className="group relative bg-black rounded overflow-hidden border border-gray-700 cursor-pointer">
            <CamPreview stream={liveStreams[cam.id]} fallback={cam.previewUrl} name={cam.name} />
            <div className="absolute top-1 left-1 bg-gray-900/80 text-white text-[10px] px-1.5 py-0.5 rounded">
              {cam.id}
            </div>
            <div className="absolute bottom-1 right-1 bg-gray-900/80 text-white text-[10px] px-1.5 py-0.5 rounded">
              🔊 {cam.audioLevel}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void setActiveAudioCamera(cam.id) }}
              className={`absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded ${activeAudioCameraId === cam.id ? 'bg-green-600 text-white' : 'bg-gray-700 text-white'}`}
            >
              {activeAudioCameraId === cam.id ? 'Audio Active' : 'Set Audio'}
            </button>
            <div className="absolute top-1 right-1 flex gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openPopout(cam) }}
                className="p-1.5 rounded bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                title="Pop Out"
              >
                <ExternalLink size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void connectToCamera(cam.id) }}
                className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                title="Connect Live"
              >
                <Radio size={14} />
              </button>
              {cam.id !== 'cam-default' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); disconnectCamera(cam.id) }}
                  className="p-1.5 rounded bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                  title="Disconnect"
                >
                  <PowerOff size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CamPreview({ stream, fallback, name }: { stream?: MediaStream | null; fallback: string; name: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el && stream) {
      el.srcObject = stream
      el.play().catch(() => {})
    }
  }, [stream])
  if (stream) return <video ref={ref} className="w-full aspect-video object-cover opacity-90 group-hover:opacity-100" muted playsInline />
  return <img src={fallback == "" ? "/img_preview.png" : fallback} alt={name} className="w-full aspect-video object-cover opacity-90 group-hover:opacity-100" />
}
