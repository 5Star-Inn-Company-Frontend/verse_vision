import ProgramPreview from '@/components/ProgramPreview'
import ScriptureApprovalQueue from '@/components/ScriptureApprovalQueue'
import CameraGrid from '@/components/CameraGrid'
import SettingsPanel from '@/components/SettingsPanel'
import TranslationPanel from '@/components/TranslationPanel'
import PairingPanel from '@/components/PairingPanel'
import ScenePanel from '@/components/ScenePanel'
import LyricsPanel from '@/components/LyricsPanel'
import PlaylistPanel from '@/components/PlaylistPanel'
import UtilityPanel from '@/components/UtilityPanel'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import SyncBridge from '@/components/SyncBridge'
import AudioService from '@/components/AudioService'
import MicrophoneSelector from '@/components/MicrophoneSelector'

export default function Home() {
  return (
    <div className="h-screen bg-neutral-900 text-gray-100 flex flex-col overflow-hidden">
      <KeyboardShortcuts />
      <SyncBridge />
      <AudioService />
      <header className="flex-none px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
        <h1 className="text-lg font-semibold">VerseVision</h1>
        <div className="text-xs text-gray-400">Preview • Program • Status OK</div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        <section className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          <ProgramPreview className="h-full w-full" />
        </section>
        <section className="lg:col-span-1 h-full overflow-y-auto space-y-4 pr-2">
          <MicrophoneSelector />
          <div className="h-64 shrink-0">
            <ScriptureApprovalQueue />
          </div>
          <SettingsPanel />
          <TranslationPanel />
          <PairingPanel />
          <ScenePanel />
          <LyricsPanel />
          <PlaylistPanel />
          <UtilityPanel />
          <div className="h-96 shrink-0">
            <CameraGrid />
          </div>
        </section>
      </main>
    </div>
  )
}
