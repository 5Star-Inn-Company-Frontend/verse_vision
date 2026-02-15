import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useOperatorStore } from '@/store/useOperatorStore'
import hymnsData from '../assets/hymns.json'
import hymnsDefaultData from '../assets/hymns-default.json'
import rccgHymns from '../assets/RCCGHymnTable.json'
import HelpModal from './HelpModal'

type Song = { id: string; title: string; language?: string | null; lines: string[] }

export default function LyricsPanel() {
  const { showLyricsOverlay, currentSongId, currentLineIndex, setCurrentLyric, cloudApiToken } = useOperatorStore()
  const [songs, setSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [fetching, setFetching] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    void (async () => {
      const list = await api.listSongs()

      // if (list.length === 0) {
        // for (const h of hymnsDefaultData) {
        //   await api.createSong({ title: h.title, language: h.language ?? null, lines: h.lines, source: 'default' })
        // }
      const hasRccg = list.some((s: any) => typeof s.title === 'string' && s.title.startsWith('RCCG '))
      if (!hasRccg) {
        for (const raw of rccgHymns as any[]) {
          const num = raw?._hymn_number
          const titleText = raw?.hymn_title as string | undefined
          if (!num || !titleText) continue

          const verses: string[] = []
          const chorus = (raw?.chorus as string | undefined)?.trim()
          if (chorus) {
            verses.push(`Chorus\n${chorus}`)
          }

          const count = Number(raw?.number_of_verses || 0)
          for (let i = 1; i <= count; i++) {
            const key = `verse_${i}` as keyof typeof raw
            const text = (raw[key] as string | undefined)?.trim()
            if (!text) continue
            verses.push(`Verse ${i}\n${text}`)
          }

          if (verses.length === 0) continue

          const title = `RCCG ${num}. ${titleText}`
          const exists = list.some((s: any) => s.title === title)
          if (exists) continue

          await api.createSong({ title, language: 'English', lines: verses, source: 'uploaded' })
        }
      }

      // }
      const refreshed = await api.listSongs()
      setSongs(refreshed)
    })()
  }, [])

  const downloadSample = () => {
    const blob = new Blob([JSON.stringify(hymnsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-hymns.json'
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const uploadFromJson = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Array<{ title: string; language?: string | null; lines: string[] }>
      if (!Array.isArray(data)) { alert('Invalid JSON: expected an array'); return }
      for (const h of data) {
        if (!h?.title || !Array.isArray(h?.lines)) continue
        await api.createSong({ title: h.title, language: h.language ?? null, lines: h.lines, source: 'uploaded' })
      }
      const refreshed = await api.listSongs()
      setSongs(refreshed)
      alert('Hymns uploaded successfully')
    } catch (e) {
      alert('Failed to read JSON file')
    }
  }

  const exportDbSongs = async () => {
    const data = await api.listSongs() as Array<{ id: string; title: string; language?: string | null; lines: string[]; source?: string }>
    const payload = data.map((s) => ({ title: s.title, language: s.language ?? null, lines: s.lines, source: s.source ?? 'uploaded' }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hymns-export.json'
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const fetchFromAI = async () => {
    if (!cloudApiToken) {
      alert('Please connect to the cloud first to use AI lyrics search')
      return
    }
    if (!search || search.length < 3) return
    setFetching(true)
    try {
      const data = await api.fetchLyrics(search)
      setFetching(false)
      if (!data) {
        alert('Could not find lyrics for: ' + search)
        return
      }
      const created = await api.createSong({ title: data.title, lines: data.lines, language: 'English', source: 'ai' })
      if (created) {
        const refreshed = await api.listSongs()
        setSongs(refreshed)
        setSearch('') 
      }
    } catch (e: any) {
      setFetching(false)
      alert(e.message || 'Failed to fetch lyrics')
    }
  }

  const filtered = songs.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-100">Hymns</h3>
          <button 
            onClick={() => setShowHelp(true)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Help"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={downloadSample} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded">Download Sample</button>
          <label className="text-[10px] bg-indigo-700 hover:bg-indigo-600 text-white px-2 py-0.5 rounded cursor-pointer">
            Import Hymns
            <input type="file" accept="application/json" className="hidden" onChange={(e) => uploadFromJson(e.target.files?.[0] || null)} />
          </label>
          {/* <button onClick={exportDbSongs} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded">Export DB</button> */}
          <button
            onClick={() => setCurrentLyric({ songId: currentSongId, lineIndex: currentLineIndex, show: !showLyricsOverlay })}
            className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded"
          >
            {showLyricsOverlay ? 'Hide Lyrics' : 'Show Lyrics'}
          </button>
          <div className="text-[10px] text-gray-400">Overlay: {showLyricsOverlay ? 'on' : 'off'}</div>
        </div>
      </div>

      <HelpModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="Lyrics & Hymns Help"
        content={
          <div className="space-y-4">
            <p>Display song lyrics and hymns on the live program output.</p>
            
            <div>
              <h4 className="font-semibold text-white mb-1">Finding Songs</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Search:</strong> Type in the search box to find songs by title or lyrics.</li>
                <li><strong>AI Search:</strong> If you can't find a song, use the 'Ask AI' button (requires cloud account) to fetch lyrics from the internet.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-1">Live Control</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Projecting:</strong> Click any line of a song to project it immediately. The active line is highlighted in blue.</li>
                <li><strong>Hide/Show:</strong> Use the button in the header to toggle the entire lyrics overlay on or off.</li>
                <li className="text-yellow-400"><strong>Note:</strong> Lyrics Overlay will automatically hide if Scripture Overlay is activated (and vice versa).</li>
              </ul>
            </div>
          </div>
        }
      />

      <input className="w-full bg-gray-800 text-xs text-white rounded px-2 py-1 mb-2" placeholder="Search for Hymns or songs" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {search.length > 2 && filtered.length === 0 && (
          <div className="mb-2">
             <button 
              onClick={fetchFromAI} 
              disabled={fetching}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 rounded flex items-center justify-center gap-2"
            >
              {fetching ? 'Searching AI...' : `Ask AI to find "${search}"`}
            </button>
          </div>
        )}
        {filtered.map((song) => (
          <div key={song.id} className="bg-gray-800 rounded p-2">
            <div className="text-xs font-medium text-gray-100 mb-1">{song.title}</div>
            <div className="grid grid-cols-1 gap-1">
              {song.lines.map((line, idx) => (
                <button
                  key={idx}
                  className={`text-left px-2 py-1 text-[11px] rounded ${currentSongId === song.id && currentLineIndex === idx ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}
                  onClick={async () => {
                    await setCurrentLyric({ songId: song.id, lineIndex: idx, show: true })
                  }}
                >
                  <span className="block truncate">{line.split('\n')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-xs text-gray-400">No songs found</div>}
      </div>
    </div>
  )
}
