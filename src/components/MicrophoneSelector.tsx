import { useState, useEffect } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { Mic, MicOff, ChevronDown } from 'lucide-react'

export default function MicrophoneSelector() {
  const { selectedMicrophoneId, setSelectedMicrophoneId, activeAudioCameraId, setActiveAudioCamera } = useOperatorStore()
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [volume, setVolume] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission if not already granted to get labels
        await navigator.mediaDevices.getUserMedia({ audio: true })
        const devs = await navigator.mediaDevices.enumerateDevices()
        setDevices(devs.filter(d => d.kind === 'audioinput'))
      } catch (err) {
        console.error('Failed to get devices:', err)
      }
    }
    getDevices()
    navigator.mediaDevices.addEventListener('devicechange', getDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices)
  }, [])

  useEffect(() => {
    const handleLevel = (e: CustomEvent<number>) => {
      // Normalize 0-255 to 0-100
      const normalized = (e.detail / 255) * 100
      // Apply simple smoothing
      setVolume(prev => {
          const diff = normalized - prev
          return prev + diff * 0.5
      })
    }
    window.addEventListener('audio-level', handleLevel as any)
    return () => window.removeEventListener('audio-level', handleLevel as any)
  }, [])

  const currentLabel = activeAudioCameraId 
    ? 'Camera Audio Source' 
    : (devices.find(d => d.deviceId === selectedMicrophoneId)?.label || 'Default Microphone')
  
  const isSilent = volume < 2 // Threshold for silence

  const handleSelectMic = (id: string | null) => {
      setSelectedMicrophoneId(id)
      setActiveAudioCamera(null) // Switch to local mic mode
      setIsOpen(false)
  }

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-900/50 hover:bg-neutral-800 transition-colors border border-neutral-800 w-full"
        title="Microphone Settings"
      >
        <div className="relative shrink-0">
            {isSilent ? (
                <MicOff className="w-5 h-5 text-neutral-500" />
            ) : (
                <Mic className={`w-5 h-5 ${volume > 80 ? 'text-red-500' : 'text-green-500'}`} />
            )}
            
            {/* Activity Ring */}
            {!isSilent && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse border-2 border-neutral-900"></span>
            )}
        </div>
        
        <div className="flex flex-col items-start overflow-hidden flex-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Audio Input</span>
            <div className="flex items-center gap-2 w-full">
                <span className="text-sm font-medium truncate text-gray-200">{currentLabel}</span>
            </div>
        </div>

        {/* Visualizer Bar */}
        <div className="flex flex-col gap-0.5 shrink-0">
             <div className="w-20 h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div 
                    className={`h-full transition-all duration-100 ease-out ${
                        volume > 90 ? 'bg-red-500' : 
                        volume > 60 ? 'bg-yellow-500' : 
                        'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, volume * 3)}%` }} // Boost visual gain
                />
            </div>
            <div className="flex justify-between px-0.5">
                <div className="w-0.5 h-1 bg-neutral-800"></div>
                <div className="w-0.5 h-1 bg-neutral-800"></div>
                <div className="w-0.5 h-1 bg-neutral-800"></div>
                <div className="w-0.5 h-1 bg-neutral-800"></div>
            </div>
        </div>
        
        <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl z-50 p-1 overflow-hidden">
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    <button
                        onClick={() => handleSelectMic(null)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group ${!selectedMicrophoneId && !activeAudioCameraId ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-neutral-800 text-gray-300'}`}
                    >
                        <span>Default System Microphone</span>
                        {!selectedMicrophoneId && !activeAudioCameraId && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                    </button>
                    {devices.map(device => (
                        <button
                            key={device.deviceId}
                            onClick={() => handleSelectMic(device.deviceId)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group ${selectedMicrophoneId === device.deviceId && !activeAudioCameraId ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-neutral-800 text-gray-300'}`}
                        >
                            <span className="truncate pr-4">{device.label || `Microphone ${device.deviceId.slice(0, 4)}...`}</span>
                            {selectedMicrophoneId === device.deviceId && !activeAudioCameraId && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                        </button>
                    ))}
                </div>
            </div>
        </>
      )}
    </div>
  )
}
