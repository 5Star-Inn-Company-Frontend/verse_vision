import { useEffect, useRef, useState } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { connectToCamera } from '@/lib/webrtc'
import PreviewPlayer from './preview/PreviewPlayer'
import ObsConnectionModal from './preview/ObsConnectionModal'

export default function ProgramPreview({ className, style, hideHeader }: { className?: string; style?: React.CSSProperties; hideHeader?: boolean }) {
  const { 
    cameras, 
    primaryCameraId, 
    currentScripture, 
    loadCurrent, 
    fetchTranslations, 
    translationEngine, 
    activeAudioCameraId, 
    loadCurrentLyric, 
    liveStreams, 
    loadCameras, 
    loadSettings 
  } = useOperatorStore()

  const [showObsModal, setShowObsModal] = useState(false)
  const [, force] = useState(0)
  const connectingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    void loadCameras()
    void loadSettings()
  }, [loadCameras, loadSettings])

  useEffect(() => {
    if (window.location.pathname === '/program' && primaryCameraId && primaryCameraId !== 'none' && !liveStreams[primaryCameraId]) {
      if (!connectingRef.current.has(primaryCameraId)) {
        connectingRef.current.add(primaryCameraId)
        void connectToCamera(primaryCameraId).finally(() => {
          setTimeout(() => connectingRef.current.delete(primaryCameraId!), 5000)
        })
      }
    }
  }, [primaryCameraId, liveStreams])

  useEffect(() => {
    void loadCurrent()
  }, [loadCurrent])
  useEffect(() => {
    void loadCurrentLyric()
  }, [loadCurrentLyric])
  useEffect(() => {
    if (currentScripture?.text) {
      void fetchTranslations(currentScripture.text)
    }
  }, [currentScripture, fetchTranslations, translationEngine])
  
  useEffect(() => {
    const id = window.setInterval(() => force((x) => x + 1), 500)
    return () => window.clearInterval(id)
  }, [])

  const goLive = async () => {
    // Check for Electron environment
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron')
        await ipcRenderer.invoke('go-live')
        return
      } catch (e) {
        console.warn('Electron IPC failed, falling back to window.open', e)
      }
    }
    // Web fallback
    window.open('/program', '_blank', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no')
  }

  return (
    <div className={`w-full bg-black rounded-lg overflow-hidden border border-gray-700 ${className || ''}`} style={{ ...style, height: style?.height || '100%' }}>
      {!hideHeader && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-900 text-gray-100 text-sm">
          <div className="flex items-center gap-4">
            <span>Program Preview</span>
            {window.location.pathname !== '/program' && (
              <>
                <button
                  onClick={goLive}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Go Live
                </button>
                <button
                  onClick={() => setShowObsModal(true)}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium flex items-center gap-1 transition-colors"
                >
                  Connect to OBS
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      <PreviewPlayer />
      
      <div className="px-3 py-2 text-xs text-gray-300">Audio source: {cameras.find(c=>c.id===activeAudioCameraId)?.name || 'None'}</div>
      
      <ObsConnectionModal isOpen={showObsModal} onClose={() => setShowObsModal(false)} />
    </div>
  )
}
