import { useOperatorStore } from '@/store/useOperatorStore'
import VideoOverlay from './VideoOverlay'
import PdfOverlay from './PdfOverlay'

export default function MediaOverlay() {
  const { activePlaylistItem, activePlaylistItemPage } = useOperatorStore()

  if (!activePlaylistItem) return null

  return (
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
  )
}
