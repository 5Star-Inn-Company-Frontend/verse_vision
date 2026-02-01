import { useEffect, useMemo, useRef, useState } from 'react'

export default function VideoOverlay({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedEnd, setBufferedEnd] = useState(0)
  const isHls = useMemo(() => src.endsWith('.m3u8'), [src])
  const canNativeHls = useMemo(() => {
    const v = document.createElement('video')
    return !!v.canPlayType && v.canPlayType('application/vnd.apple.mpegURL') !== ''
  }, [])
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const onTime = () => setTime(v.currentTime)
    const onMeta = () => setDuration(v.duration || 0)
    const onProgress = () => {
      try {
        const ranges = v.buffered
        const end = ranges.length ? ranges.end(ranges.length - 1) : 0
        setBufferedEnd(end)
      } catch (_e) { void _e }
    }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('progress', onProgress)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('progress', onProgress)
    }
  }, [])
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (playing) v.play().catch(() => {})
    else v.pause()
    v.muted = muted
  }, [playing, muted])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = ref.current
      if (!v) return
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
      else if (e.key.toLowerCase() === 'm') { setMuted((m) => !m) }
      else if (e.key === 'ArrowRight') { v.currentTime = Math.min(v.duration || 0, v.currentTime + 5) }
      else if (e.key === 'ArrowLeft') { v.currentTime = Math.max(0, v.currentTime - 5) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const r = Math.floor(s % 60)
    return `${m}:${String(r).padStart(2, '0')}`
  }
  return (
    <div className="w-full h-full">
      {!isHls && (
        <video ref={ref} src={src} className="w-full h-full object-contain" autoPlay muted={muted} />
      )}
      {isHls && canNativeHls && (
        <video ref={ref} className="w-full h-full object-contain" autoPlay muted={muted}>
          <source src={src} type="application/vnd.apple.mpegURL" />
        </video>
      )}
      {isHls && !canNativeHls && (
        <div className="w-full h-full flex items-center justify-center bg-black text-white text-xs">
          <div className="text-center">
            <div className="mb-1">HLS stream detected</div>
            <div className="opacity-75">Use Safari or provide MP4 fallback</div>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-2 rounded flex gap-2 items-center">
        <span className="opacity-80">{title}</span>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={() => setMuted((m) => !m)}>{muted ? 'Unmute' : 'Mute'}</button>
        <span className="opacity-80">{fmt(time)} / {fmt(duration)}</span>
        <div className="relative w-40 h-2 bg-gray-700 rounded">
          <div className="absolute left-0 top-0 h-2 bg-gray-500 rounded" style={{ width: `${duration ? Math.min(100, (bufferedEnd / duration) * 100) : 0}%` }} />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={(e) => {
              const v = ref.current
              if (v) {
                v.currentTime = Number(e.target.value)
                setTime(Number(e.target.value))
              }
            }}
            className="absolute -top-1 w-full"
          />
        </div>
      </div>
    </div>
  )
}
