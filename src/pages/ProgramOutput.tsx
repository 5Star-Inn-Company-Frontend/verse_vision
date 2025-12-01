import ProgramPreview from '@/components/ProgramPreview'
import SyncBridge from '@/components/SyncBridge'

export default function ProgramOutput() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SyncBridge />
      <ProgramPreview />
    </div>
  )
}
