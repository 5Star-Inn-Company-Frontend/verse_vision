import { useOperatorStore } from '@/store/useOperatorStore'

export default function CameraGrid() {
  const { cameras, setPrimaryCamera, activeAudioCameraId, setActiveAudioCamera } = useOperatorStore()
  return (
    <div className="h-full w-full bg-gray-900 rounded-lg border border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Camera Grid</h3>
        <span className="text-xs text-gray-400">{cameras.length} connected</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cameras.map((cam) => (
          <div key={cam.id} onClick={() => { setPrimaryCamera(cam.id); }} role="button" tabIndex={0} className="group relative bg-black rounded overflow-hidden border border-gray-700 cursor-pointer">
            <img src={cam.previewUrl} alt={cam.name} className="w-full aspect-video object-cover opacity-90 group-hover:opacity-100" />
            <div className="absolute top-1 left-1 bg-gray-900/80 text-white text-[10px] px-1.5 py-0.5 rounded">
              {cam.name}
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
          </div>
        ))}
      </div>
    </div>
  )
}
