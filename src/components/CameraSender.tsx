import { useEffect, useRef, useState } from 'react'
import { startCameraSender, stopCameraSender } from '@/lib/webrtcCamera'

export default function CameraSender() {
  const [camId, setCamId] = useState('cam-browser')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const v = ref.current
    if (!v || !stream) return
    v.srcObject = stream
    v.play().catch(() => {})
  }, [stream])
  return (
    <div className="max-w-xl mx-auto mt-8 p-4 bg-gray-900 text-gray-100 rounded border border-gray-800">
      <div className="mb-3 text-sm font-semibold">Browser Camera Sender</div>
      <div className="flex items-center gap-2 mb-3">
        <input value={camId} onChange={(e) => setCamId(e.target.value)} className="flex-1 bg-gray-800 text-gray-100 text-xs px-2 py-1 rounded" />
        <button
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          onClick={async () => {
            const s = await startCameraSender(camId)
            setStream(s)
          }}
        >
          Start
        </button>
        <button
          className="px-2 py-1 text-xs bg-gray-700 text-white rounded"
          onClick={() => { stopCameraSender(); setStream(null) }}
        >
          Stop
        </button>
      </div>
      <div className="bg-black rounded overflow-hidden">
        <video ref={ref} className="w-full aspect-video object-cover" muted />
      </div>
    </div>
  )
}
