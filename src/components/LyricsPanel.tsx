import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useOperatorStore } from '@/store/useOperatorStore'

type Song = { id: string; title: string; language?: string | null; lines: string[] }

export default function LyricsPanel() {
  const { showLyricsOverlay } = useOperatorStore()
  const [songs, setSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [current, setCurrent] = useState<{ songId: string | null; lineIndex: number; show: boolean }>({ songId: null, lineIndex: 0, show: false })
  useEffect(() => {
    void (async () => {
      const list = await api.listSongs()
      if (list.length === 0) {
        await api.createSong({ title: 'Amazing Grace', language: 'English', lines: ['Amazing grace! how sweet the sound', 'That saved a wretch like me!', 'I once was lost, but now am found;', 'Was blind, but now I see.'] })
        await api.createSong({ title: 'Great Is Thy Faithfulness', language: 'English', lines: ['Great is Thy faithfulness, O God my Father', 'There is no shadow of turning with Thee'] })
      }
      const refreshed = await api.listSongs()
      setSongs(refreshed)
      const cur = await api.getCurrentLyric()
      setCurrent(cur)
    })()
  }, [])
  const filtered = songs.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Lyrics</h3>
        <div className="text-[10px] text-gray-400">Overlay: {showLyricsOverlay ? 'on' : 'off'}</div>
      </div>
      <input className="w-full bg-gray-800 text-xs text-white rounded px-2 py-1 mb-2" placeholder="Search songs" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="space-y-2">
        {filtered.map((song) => (
          <div key={song.id} className="bg-gray-800 rounded p-2">
            <div className="text-xs font-medium text-gray-100 mb-1">{song.title}</div>
            <div className="grid grid-cols-2 gap-1">
              {song.lines.map((line, idx) => (
                <button
                  key={idx}
                  className={`text-left px-2 py-1 text-[11px] rounded ${current.songId === song.id && current.lineIndex === idx ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'}`}
                  onClick={async () => {
                    const updated = await api.setCurrentLyric({ songId: song.id, lineIndex: idx, show: true })
                    setCurrent(updated)
                  }}
                >
                  {line}
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
