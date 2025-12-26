import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function ProgramPreview() {
  const { cameras, primaryCameraId, currentScripture, loadCurrent, translationStyle, translationEnabledYoruba, translationEnabledHausa, translationEnabledIgbo, translationEnabledFrench, translations, fetchTranslations, translationEngine, activeAudioCameraId, showScriptureOverlay, showLyricsOverlay, currentSongId, currentLineIndex, loadCurrentLyric, recordingEnabled, countdownEndAt, activePlaylistItem, activePlaylistItemPage, liveStreams } = useOperatorStore()
  const cam = cameras.find((c) => c.id === primaryCameraId) || cameras[0]
  const prevCamId = useRef<string | null>(primaryCameraId)
  const [crossfade, setCrossfade] = useState(false)
  const [, force] = useState(0)
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
    if (prevCamId.current && prevCamId.current !== primaryCameraId) {
      setCrossfade(true)
      const t = window.setTimeout(() => setCrossfade(false), 400)
      prevCamId.current = primaryCameraId
      return () => window.clearTimeout(t)
    }
    prevCamId.current = primaryCameraId
  }, [primaryCameraId])
  useEffect(() => {
    const id = window.setInterval(() => force((x) => x + 1), 500)
    return () => window.clearInterval(id)
  }, [])
  const activeTranslations = useMemo(() => {
    const t = (translations || {}) as Record<string, string | undefined>
    // console.log('activeTranslations calc:', t)
    const langs: { label: string; text: string; color: string }[] = []
    
    const getVal = (k: string) => t[k] || t[k.toLowerCase()] || t[k.toUpperCase()]

    const yo = getVal('Yoruba')
    if (translationEnabledYoruba && yo) langs.push({ label: 'Yoruba', text: yo, color: 'text-emerald-300' })
    
    const ha = getVal('Hausa')
    if (translationEnabledHausa && ha) langs.push({ label: 'Hausa', text: ha, color: 'text-blue-300' })
    
    const ig = getVal('Igbo')
    if (translationEnabledIgbo && ig) langs.push({ label: 'Igbo', text: ig, color: 'text-pink-300' })
    
    const fr = getVal('French')
    if (translationEnabledFrench && fr) langs.push({ label: 'French', text: fr, color: 'text-yellow-300' })
    
    return langs
  }, [translations, translationEnabledYoruba, translationEnabledHausa, translationEnabledIgbo, translationEnabledFrench])

  return (
    <div className="h-full w-full bg-black rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 text-gray-100 text-sm">
        <span>Program Preview</span>
        <span className="opacity-75">{cam?.name}</span>
      </div>
      <div className="relative">
        {liveStreams[cam.id] ? (
          <VideoLive stream={liveStreams[cam.id]!} />
        ) : (
          <img src={cam.previewUrl} alt={cam.name} className={`w-full aspect-video object-cover ${crossfade ? 'opacity-0 transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300'}`} />
        )}
        {prevCamId.current && prevCamId.current !== primaryCameraId && (
          <img src={(cameras.find((c) => c.id === prevCamId.current) || cameras[0]).previewUrl} alt="prev" className={`w-full aspect-video object-cover absolute inset-0 ${crossfade ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`} />
        )}
        <div className="absolute bottom-2 right-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
          Signal {cam.signal}/4 • Battery {cam.battery}%
        </div>
        {recordingEnabled && (
          <div className="absolute top-2 right-2 bg-red-600/80 text-white text-xs px-2 py-1 rounded">REC</div>
        )}
        {countdownEndAt && countdownEndAt > Date.now() && (
          <div className="absolute top-2 left-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
            {new Date(Math.max(0, countdownEndAt - Date.now())).toISOString().substring(14, 19)}
          </div>
        )}
        {currentScripture && showScriptureOverlay && translationStyle === 'subtitle' && (
          <div className="absolute bottom-0 left-0 w-full px-6 py-4 space-y-2">
            <div className="bg-black/70 text-white rounded-md p-3">
              <div className="text-xs opacity-80 mb-1">
                {currentScripture.reference} • {currentScripture.translation}
              </div>
              <div className="text-sm leading-relaxed">
                {currentScripture.text}
              </div>
            </div>
            {activeTranslations.map((t) => (
              <div key={t.label} className="bg-black/60 text-white rounded-md p-2">
                <div className={`text-[11px] opacity-80 mb-1 ${t.color}`}>{t.label}</div>
                <div className="text-xs leading-relaxed">{t.text}</div>
              </div>
            ))}
          </div>
        )}
        {currentScripture && showScriptureOverlay && translationStyle === 'split' && (
          <div className="absolute bottom-0 left-0 w-full px-6 py-4 grid grid-cols-2 gap-3">
            <div className={`bg-black/70 text-white rounded-md p-3 ${activeTranslations.length === 0 ? 'col-span-2' : ''}`}>
              <div className="text-xs opacity-80 mb-1">
                {currentScripture.reference} • {currentScripture.translation}
              </div>
              <div className="text-sm leading-relaxed">{currentScripture.text}</div>
            </div>
            {activeTranslations.map((t) => (
              <div className="bg-black/60 text-white rounded-md p-3" key={t.label}>
                <div className={`text-[11px] opacity-80 mb-1 ${t.color}`}>{t.label}</div>
                <div className="text-sm leading-relaxed">{t.text}</div>
              </div>
            ))}
          </div>
        )}
        {currentScripture && showScriptureOverlay && translationStyle === 'ticker' && (
          <div className="absolute bottom-0 left-0 w-full">
            <div className="bg-black/70 text-white text-xs whitespace-nowrap overflow-hidden">
              <div className="animate-[ticker_15s_linear_infinite] inline-block px-4">
                {[{ label: 'English', text: currentScripture.text, color: 'text-white' }, ...activeTranslations].map((t) => (
                  <span key={t.label} className="px-6">
                    <span className={`mr-1 ${t.color}`}>{t.label}:</span>
                    {t.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        {showLyricsOverlay && (
          <div className="absolute bottom-16 left-0 w-full px-6">
            <div className="bg-black/70 text-white rounded-md p-3 text-center">
              <LyricsText currentSongId={currentSongId} currentLineIndex={currentLineIndex} />
            </div>
          </div>
        )}
        {activePlaylistItem && (
          <div className="absolute inset-0">
            {activePlaylistItem.type === 'image' && activePlaylistItem.url && (
              <img src={activePlaylistItem.url} alt={activePlaylistItem.title} className="w-full h-full object-contain" />
            )}
            {activePlaylistItem.type === 'video' && activePlaylistItem.url && (
              <VideoOverlay src={activePlaylistItem.url} title={activePlaylistItem.title} />
            )}
            {activePlaylistItem.type === 'pdf' && activePlaylistItem.url && (
              <PdfOverlay url={activePlaylistItem.url} title={activePlaylistItem.title} page={activePlaylistItemPage} />
            )}
            {activePlaylistItem.type === 'ppt' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-3 py-2 rounded">
                Presenting: {activePlaylistItem.title} • Page {activePlaylistItemPage}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-3 py-2 text-xs text-gray-300">Audio source: {cameras.find(c=>c.id===activeAudioCameraId)?.name || 'None'}</div>
    </div>
  )
}

function VideoOverlay({ src, title }: { src: string; title: string }) {
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

function PdfOverlay({ url, title, page }: { url: string; title: string; page: number }) {
  const src = `${url}#page=${page}`
  return (
    <div className="w-full h-full">
      <iframe src={src} className="w-full h-full" />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-2 rounded">
        {title} • Page {page}
      </div>
    </div>
  )
}

function LyricsText({ currentSongId, currentLineIndex }: { currentSongId: string | null; currentLineIndex: number }) {
  const [text, setText] = useState<string>('')
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!currentSongId) { setText(''); return }
      const songs = await api.listSongs() as Array<{ id: string; lines: string[] }>
      const song = songs.find((s) => s.id === currentSongId)
      if (!song) { setText(''); return }
      const line = song.lines[currentLineIndex] || ''
      if (mounted) setText(line)
    })()
    return () => { mounted = false }
  }, [currentSongId, currentLineIndex])
  return <div className="text-sm whitespace-pre-wrap leading-relaxed">{text}</div>
}
function VideoLive({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.srcObject = stream
    v.play().catch(() => {})
  }, [stream])
  return <video ref={ref} className="w-full aspect-video object-cover" muted />
}
