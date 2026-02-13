import { useEffect, useRef, useState } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import VideoLive from './VideoLive'
import ScriptureOverlay from './ScriptureOverlay'
import LiveTranslationOverlay from './LiveTranslationOverlay'
import LyricsOverlay from './LyricsOverlay'
import MediaOverlay from './MediaOverlay'

export default function PreviewPlayer() {
  const { cameras, primaryCameraId, liveStreams, recordingEnabled, countdownEndAt } = useOperatorStore()
  const cam = primaryCameraId === 'none' ? null : (cameras.find((c) => c.id === primaryCameraId) || cameras[0])
  const prevCamId = useRef<string | null>(primaryCameraId)
  const [crossfade, setCrossfade] = useState(false)

  useEffect(() => {
    if (prevCamId.current && prevCamId.current !== primaryCameraId) {
      setCrossfade(true)
      const t = window.setTimeout(() => setCrossfade(false), 400)
      prevCamId.current = primaryCameraId
      return () => window.clearTimeout(t)
    }
    prevCamId.current = primaryCameraId
  }, [primaryCameraId])

  return (
    <div className="relative w-full aspect-video bg-black flex items-center justify-center" style={{ containerType: 'size' }}>
      {cam ? (
        liveStreams[cam.id] ? (
          <VideoLive stream={liveStreams[cam.id]!} />
        ) : (
          <img src={cam.previewUrl} alt={cam.name} className={`w-full aspect-video object-cover ${crossfade ? 'opacity-0 transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300'}`} />
        )
      ) : (
        <div className="w-full aspect-video bg-transparent" />
      )}
      {prevCamId.current && prevCamId.current !== primaryCameraId && prevCamId.current !== 'none' && (
        <img src={(cameras.find((c) => c.id === prevCamId.current) || cameras[0]).previewUrl} alt="prev" className={`w-full aspect-video object-cover absolute inset-0 ${crossfade ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`} />
      )}
      {cam && (
        <div className="absolute bottom-2 right-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
          Signal {cam.signal}/4 • Battery {cam.battery}%
        </div>
      )}
      {recordingEnabled && (
        <div className="absolute top-2 right-2 bg-red-600/80 text-white text-xs px-2 py-1 rounded">REC</div>
      )}
      {countdownEndAt && countdownEndAt > Date.now() && (
        <div className="absolute top-2 left-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
          {new Date(Math.max(0, countdownEndAt - Date.now())).toISOString().substring(14, 19)}
        </div>
      )}
      
      <ScriptureOverlay />
      <LiveTranslationOverlay />
      <LyricsOverlay />
      <MediaOverlay />
    </div>
  )
}
