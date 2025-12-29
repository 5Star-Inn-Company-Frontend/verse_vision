import { useEffect, useMemo, useRef, useState, memo } from 'react'
import { api } from '@/lib/api'
import { useOperatorStore } from '@/store/useOperatorStore'
import { connectToCamera } from '@/lib/webrtc'

export default function ProgramPreview({ className, style, hideHeader }: { className?: string; style?: React.CSSProperties; hideHeader?: boolean }) {
  const { cameras, primaryCameraId, currentScripture, loadCurrent, translationStyle, translationEnabledYoruba, translationEnabledHausa, translationEnabledIgbo, translationEnabledFrench, translations, fetchTranslations, translationEngine, activeAudioCameraId, showScriptureOverlay, showLyricsOverlay, currentSongId, currentLineIndex, loadCurrentLyric, recordingEnabled, countdownEndAt, activePlaylistItem, activePlaylistItemPage, liveStreams, loadCameras } = useOperatorStore()
  const cam = primaryCameraId === 'none' ? null : (cameras.find((c) => c.id === primaryCameraId) || cameras[0])
  
  // Debug log
  // console.log('ProgramPreview render:', { primaryCameraId, cam })

  const prevCamId = useRef<string | null>(primaryCameraId)
  const [crossfade, setCrossfade] = useState(false)
  const [showObsModal, setShowObsModal] = useState(false)
  const [obsTab, setObsTab] = useState<'window' | 'browser' | 'easyworship'>('window')
  const [, force] = useState(0)
  const connectingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    void loadCameras()
  }, [loadCameras])

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
        <div className="flex items-center gap-4">
          <span>Program Preview</span>
          {window.location.pathname !== '/program' && (
            <>
              <button
                onClick={() => window.open('/program', '_blank', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no')}
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
        <span className="opacity-75">{cam?.name || 'No Camera'}</span>
      </div>
      <div 
        className="relative w-full aspect-video bg-black"
        style={!cam ? {
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cg fill='%23444444' fill-opacity='1'%3E%3Crect x='0' y='0' width='10' height='10'/%3E%3Crect x='10' y='10' width='10' height='10'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '20px 20px'
        } : {}}
      >
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
              <LyricsText />
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
            {activePlaylistItem.type === 'ppt' && activePlaylistItem.url && activePlaylistItem.url.endsWith('.pdf') && (
              <PdfOverlay url={activePlaylistItem.url} title={activePlaylistItem.title} page={activePlaylistItemPage} />
            )}
            {activePlaylistItem.type === 'ppt' && (!activePlaylistItem.url || !activePlaylistItem.url.endsWith('.pdf')) && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-3 py-2 rounded">
                Presenting: {activePlaylistItem.title} • Page {activePlaylistItemPage}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-3 py-2 text-xs text-gray-300">Audio source: {cameras.find(c=>c.id===activeAudioCameraId)?.name || 'None'}</div>
      {showObsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
              <h2 className="text-xl font-bold text-white">Connect to External Software</h2>
              <button 
                onClick={() => setShowObsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="flex gap-4 border-b border-gray-700 mb-4 overflow-x-auto shrink-0">
                <button 
                  onClick={() => setObsTab('window')}
                  className={`pb-2 text-sm font-medium whitespace-nowrap ${obsTab === 'window' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                  Window Capture
                </button>
                <button 
                  onClick={() => setObsTab('browser')}
                  className={`pb-2 text-sm font-medium whitespace-nowrap ${obsTab === 'browser' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                  Browser Source
                </button>
                <button 
                  onClick={() => setObsTab('easyworship')}
                  className={`pb-2 text-sm font-medium whitespace-nowrap ${obsTab === 'easyworship' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}
                >
                  EasyWorship
                </button>
              </div>

              {obsTab === 'easyworship' && (
                <div className="space-y-4 text-gray-300 text-sm">
                  <p>To use VerseVision with EasyWorship 7+, you can use the Web method or Chroma Key (Green Screen).</p>
                  
                  <h3 className="text-white font-medium mt-4">Method 1: Web (Best Quality)</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>In EasyWorship, go to <strong>Media</strong> tab &rarr; <strong>Web</strong>.</li>
                    <li>Click <strong>Add</strong>.</li>
                    <li>Enter URL: <code className="bg-gray-800 px-1 rounded">{window.location.origin}/program?bg=transparent</code></li>
                    <li>Drag this Web item onto your schedule or live output.</li>
                  </ol>

                  <h3 className="text-white font-medium mt-4">Method 2: Green Screen (Compatible)</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Open the Program Window with Green Background: <br/>
                      <a 
                         href="#" 
                         onClick={(e) => { e.preventDefault(); window.open('/program?bg=green', '_blank', 'width=1920,height=1080,menubar=no,toolbar=no') }}
                         className="text-blue-400 hover:underline"
                      >
                        Open Green Screen Window
                      </a>
                    </li>
                    <li>In EasyWorship, add a <strong>Feed</strong> (if capturing screen) or use NDI Scan Converter to send this window as NDI.</li>
                    <li>If using NDI, add the NDI source in EasyWorship.</li>
                    <li>Right-click the source &rarr; <strong>Properties</strong> &rarr; Enable <strong>Chroma Key</strong>.</li>
                    <li>Select the bright green color to remove it.</li>
                  </ol>
                </div>
              )}

              {obsTab === 'window' && (
                <div className="space-y-4 text-gray-300 text-sm">
                  <p>Follow these steps to bring VerseVision into OBS Studio:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      Click the <span className="text-red-400 font-semibold">Go Live</span> button to open the Program Output window.
                    </li>
                    <li>
                      In OBS Studio, click the <span className="text-blue-400 font-semibold">+</span> icon under <strong>Sources</strong>.
                    </li>
                    <li>
                      Select <strong>Window Capture</strong>.
                    </li>
                    <li>
                      Name it "VerseVision" and click OK.
                    </li>
                    <li>
                      In the Window dropdown, select: <br/>
                      <code className="bg-gray-800 px-1 py-0.5 rounded text-white">[chrome.exe]: VerseVision - Program Output</code>
                    </li>
                    <li>
                      Click OK. You can now resize and position the layer as needed.
                    </li>
                  </ol>
                  <div className="bg-gray-800 p-3 rounded border border-gray-700 mt-4">
                    <p className="text-xs text-yellow-400 mb-1">💡 Pro Tip:</p>
                    <p className="text-xs">
                      If the window is black in OBS, try toggling "Capture Method" to "Windows 10 (1903 and up)" in the Window Capture properties.
                    </p>
                  </div>
                </div>
              )}

              {obsTab === 'browser' && (
                <div className="space-y-4 text-gray-300 text-sm">
                  <p>Use this method for the highest quality and transparency support:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      In OBS Studio, click the <span className="text-blue-400 font-semibold">+</span> icon under <strong>Sources</strong>.
                    </li>
                    <li>
                      Select <strong>Browser</strong>.
                    </li>
                    <li>
                      Name it "VerseVision Browser" and click OK.
                    </li>
                    <li>
                      In the URL field, paste this address:
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-gray-800 px-2 py-1 rounded text-white flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{window.location.origin}/program</code>
                        <button 
                          onClick={() => navigator.clipboard.writeText(window.location.origin + '/program')}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                          title="Copy to clipboard"
                        >
                          Copy
                        </button>
                      </div>
                    </li>
                    <li>
                      Set Width to <strong>1920</strong> and Height to <strong>1080</strong>.
                    </li>
                    <li>
                      Check <strong>Control audio via OBS</strong> if you want to manage audio levels in OBS.
                    </li>
                    <li>
                      Click OK.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700 flex justify-end shrink-0">
              <button
                onClick={() => setShowObsModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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

function LyricsText() {
  const { currentSongLines, currentLineIndex } = useOperatorStore()
  const text = currentSongLines[currentLineIndex] || ''
  return <div className="text-sm whitespace-pre-wrap leading-relaxed">{text}</div>
}
const VideoLive = memo(function VideoLive({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.srcObject = stream
    v.play().catch(() => {})
  }, [stream])
  return <video ref={ref} className="w-full aspect-video object-cover" muted />
})
