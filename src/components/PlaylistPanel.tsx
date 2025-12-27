import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useOperatorStore, type PlaylistItem } from '@/store/useOperatorStore'

export default function PlaylistPanel() {
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string }>>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ id: string; type: string; title: string; path?: string | null }>>([])
  const [busy, setBusy] = useState(false)
  const [newType, setNewType] = useState<'image' | 'video' | 'pdf' | 'ppt'>('image')
  const [newTitle, setNewTitle] = useState('New Item')
  const [file, setFile] = useState<File | null>(null)
  const acceptByType = (t: typeof newType): string => {
    switch (t) {
      case 'image': return 'image/*'
      case 'video': return 'video/*'
      case 'pdf': return '.pdf'
      case 'ppt': return '.ppt,.pptx'
      default: return '*/*'
    }
  }
  const validateFileForType = (f: File | null, t: typeof newType): boolean => {
    if (!f) return true
    const name = f.name.toLowerCase()
    const mime = f.type.toLowerCase()
    if (t === 'image') return mime.startsWith('image/')
    if (t === 'video') return mime.startsWith('video/')
    if (t === 'pdf') return name.endsWith('.pdf')
    if (t === 'ppt') return name.endsWith('.ppt') || name.endsWith('.pptx')
    return true
  }
  useEffect(() => {
    void (async () => {
      const list = await api.listPlaylists()
      if (list.length === 0) {
        const created = await api.createPlaylist('Default Service')
        setPlaylists([created])
        setActiveId(created.id)
        const item1 = await api.addPlaylistItem(created.id, { type: 'ppt', title: 'Sunday Announcements' })
        const item2 = await api.addPlaylistItem(created.id, { type: 'video', title: 'Opening Loop' })
        setItems([item1, item2])
      } else {
        setPlaylists(list)
        setActiveId(list[0].id)
        const its = await api.listPlaylistItems(list[0].id)
        setItems(its)
      }
    })()
  }, [])
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-100">Playlist</h3>
        <button
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
          onClick={async () => {
            setBusy(true)
            const created = await api.createPlaylist(`Service ${new Date().toLocaleDateString()}`)
            setPlaylists([created, ...playlists])
            setActiveId(created.id)
            setItems([])
            setBusy(false)
          }}
          disabled={busy}
        >
          {busy ? 'Creating...' : 'New'}
        </button>
      </div>
      <div className="flex gap-2 mb-2 overflow-x-auto">
        {playlists.map((p) => (
          <button key={p.id} className={`px-2 py-1 text-xs rounded ${activeId === p.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`} onClick={async () => {
            setActiveId(p.id)
            const its = await api.listPlaylistItems(p.id)
            setItems(its)
          }}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="bg-gray-800 rounded p-2 text-xs text-gray-200 flex items-center justify-between">
            <span className="px-1.5 py-0.5 bg-gray-700 rounded mr-2">{it.type}</span>
            <span className="flex-1">{it.title}</span>
            <ItemActions item={it} onChanged={async () => {
              if (activeId) {
                const its = await api.listPlaylistItems(activeId)
                setItems(its)
              }
            }} />
          </div>
        ))}
        {items.length === 0 && <div className="text-xs text-gray-400">No items in this playlist</div>}
      </div>
      <div className="mt-3 border-t border-gray-800 pt-2">
        <div className="text-xs text-gray-300 mb-1">Add Item</div>
        <div className="grid grid-cols-4 gap-2 items-center">
          <select className="bg-gray-800 text-white text-xs rounded px-2 py-1" value={newType} onChange={(e) => setNewType(e.target.value as 'image' | 'video' | 'pdf' | 'ppt')}>
            <option value="image">image</option>
            <option value="video">video</option>
            <option value="pdf">pdf</option>
            {/* <option value="ppt">ppt</option> */}
          </select>
          <input className="bg-gray-800 text-white text-xs rounded px-2 py-1" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <input
            type="file"
            className="text-xs"
            accept={acceptByType(newType)}
            onChange={(e) => {
              const f = e.target.files?.[0] || null
              if (f && !validateFileForType(f, newType)) {
                alert(`Invalid file type for ${newType}.`)
                e.currentTarget.value = ''
                setFile(null)
                return
              }
              setFile(f)
            }}
          />
          <button
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            onClick={async () => {
              if (!activeId) return
              let url: string | undefined
              let jobId: string | undefined
              if (file) {
                const up = await api.uploadMedia(file)
                url = up.path
                jobId = up.jobId
              }
              const created = await api.addPlaylistItem(activeId, { type: newType, title: newTitle, path: url })
              setItems([...items, created])
              setFile(null)
              if (jobId) {
                let tries = 0
                const poll = async () => {
                  const job = await api.getMediaJob(jobId!)
                  if (job && job.status === 'completed' && job.outputPath) {
                    const its = await api.listPlaylistItems(activeId)
                    setItems(its)
                  } else if (tries < 20) {
                    tries++
                    setTimeout(poll, 2000)
                  }
                }
                poll()
              }
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemActions({ item, onChanged }: { item: { id: string; type: string; title: string; path?: string | null }; onChanged: () => void }) {
  const { setActivePlaylistItem, nextActivePlaylistItemPage, prevActivePlaylistItemPage, activePlaylistItem } = useOperatorStore()
  return (
    <div className="flex gap-2">
      <button className="px-2 py-1 text-[10px] bg-green-600 hover:bg-green-700 text-white rounded" onClick={() => setActivePlaylistItem({ id: item.id, type: item.type as PlaylistItem['type'], title: item.title, url: item.path || undefined })}>Show</button>
      <button className="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-800 text-white rounded" onClick={() => setActivePlaylistItem(undefined)}>Hide</button>
      {(item.type === 'pdf' || item.type === 'ppt') && activePlaylistItem?.id === item.id && (
        <>
          <button className="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-800 text-white rounded" onClick={() => prevActivePlaylistItemPage()}>Prev</button>
          <button className="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-800 text-white rounded" onClick={() => nextActivePlaylistItemPage()}>Next</button>
        </>
      )}
      <button className="px-2 py-1 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded" onClick={async () => { await api.removePlaylistItem(item.id); onChanged() }}>Delete</button>
    </div>
  )
}
