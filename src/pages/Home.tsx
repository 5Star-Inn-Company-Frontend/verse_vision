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
import OfflineIndicator from '@/components/OfflineIndicator'
import WelcomeModal from '@/components/WelcomeModal'
import PermissionModal from '@/components/PermissionModal'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function Home() {
  const {
    panelTranslationVisible,
    panelPairingVisible,
    panelCameraGridVisible,
    panelLyricsVisible,
    panelPlaylistVisible,
    panelSceneVisible
  } = useOperatorStore()

  return (
    <div className="h-screen bg-neutral-900 text-gray-100 flex flex-col overflow-hidden">
      <PermissionModal />
      <WelcomeModal />
      <KeyboardShortcuts />
      <SyncBridge />
      <AudioService />
      <header className="flex-none px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">VerseVision</h1>
          <OfflineIndicator />
        </div>
        <div className="text-xs text-gray-400">Preview • Program • Status OK</div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        <section className="flex flex-col h-full overflow-hidden gap-4">
          <div className="h-1/2 min-h-0">
            <ProgramPreview className="h-full w-full" />
          </div>
          <div className="h-1/2 min-h-0">
            <ScriptureApprovalQueue />
          </div>
        </section>
        <section className="h-full overflow-y-auto space-y-4 pr-2">
          <MicrophoneSelector />
          <SettingsPanel />
          <UtilityPanel />
          {panelTranslationVisible && <TranslationPanel />}
          {panelSceneVisible && <ScenePanel />}
          {panelLyricsVisible && <LyricsPanel />}
          {panelPlaylistVisible && <PlaylistPanel />}
          {panelPairingVisible && <PairingPanel />}
          {panelCameraGridVisible && (
            <div className="h-96 shrink-0">
              <CameraGrid />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
