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
    <div className="min-h-screen bg-neutral-900 text-gray-100">
      <KeyboardShortcuts />
      <SyncBridge />
      <AudioService />
      <header className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
        <h1 className="text-lg font-semibold">VerseVision</h1>
        <div className="text-xs text-gray-400">Preview • Program • Status OK</div>
      </header>
      <main className="container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2">
          <ProgramPreview />
        </section>
        <section className="lg:col-span-1 space-y-4">
          <MicrophoneSelector />
          <div className="h-64">
            <ScriptureApprovalQueue />
          </div>
          <SettingsPanel />
          <TranslationPanel />
          <PairingPanel />
          <ScenePanel />
          <LyricsPanel />
          <PlaylistPanel />
          <UtilityPanel />
          <div className="h-[calc(100vh-18rem-7.5rem)]">
            <CameraGrid />
          </div>
        </section>
      </main>
    </div>
  )
}
