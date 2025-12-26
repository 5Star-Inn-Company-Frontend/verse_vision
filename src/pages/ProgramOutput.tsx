import ProgramPreview from '@/components/ProgramPreview'
import SyncBridge from '@/components/SyncBridge'

export default function ProgramOutput() {
  // Ensure Program View has a unique Peer ID (distinct from Operator View)
  // causing window.open to copy sessionStorage
  if (typeof window !== 'undefined') {
    const key = 'vv_rtc_peer_id'
    const id = sessionStorage.getItem(key)
    if (id && !id.endsWith('-program')) {
      sessionStorage.setItem(key, `${id}-program`)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SyncBridge />
      <ProgramPreview />
    </div>
  )
}
