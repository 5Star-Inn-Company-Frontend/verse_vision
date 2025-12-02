import { useEffect } from 'react'
import { subscribe } from '@/lib/bus'
import { useOperatorStore } from '@/store/useOperatorStore'
import { connectToCamera } from '@/lib/webrtc'

export default function SyncBridge() {
  useEffect(() => {
    const off = subscribe((msg) => {
      const s = useOperatorStore.getState()
      if (msg.name === 'camera-primary') {
        const d = msg.data as { id?: string }
        if (typeof d.id === 'string') s.setPrimaryCamera(d.id)
      } else if (msg.name === 'playlist-active') {
        const d = msg.data as { id: string; type: string; title: string; url?: string | null } | undefined
        s.setActivePlaylistItem(d)
      } else if (msg.name === 'scripture-current') {
        const d = msg.data as { id?: string } & Partial<import('@/store/useOperatorStore').ScriptureItem>
        if (typeof d.id === 'string') s.updateScripture(d.id, d)
      } else if (msg.name === 'settings') {
        const d = msg.data as { showScriptureOverlay?: boolean; recordingEnabled?: boolean; countdownEndAt?: number | null }
        if (typeof d.showScriptureOverlay === 'boolean') s.toggleScriptureOverlay(d.showScriptureOverlay)
        if (typeof d.recordingEnabled === 'boolean') s.setRecordingEnabled(d.recordingEnabled)
        if (d.countdownEndAt !== undefined) {
          if (d.countdownEndAt) s.startCountdown(d.countdownEndAt - Date.now())
          else s.stopCountdown()
        }
      } else if (msg.name === 'lyric-current') {
        const d = msg.data as { songId: string | null; lineIndex: number; show: boolean }
        if (typeof d.lineIndex === 'number') s.setCurrentLyric(d)
      } else if (msg.name === 'translation-settings') {
        s.updateTranslationSettings(msg.data as {
          translationStyle?: 'subtitle' | 'split' | 'ticker'
          translationEnabledYoruba?: boolean
          translationEnabledHausa?: boolean
          translationEnabledIgbo?: boolean
          translationEnabledFrench?: boolean
        })
      } else if (msg.name === 'cameraRegistered') {
        const d = msg.data as { camera?: { id: string; name?: string; previewPath?: string | null } }
        const cam = d.camera
        if (cam?.id) {
          s.upsertCamera({ id: cam.id, name: cam.name, previewPath: cam.previewPath })
          void connectToCamera(cam.id)
        }
      } else if (msg.name === 'cameraHeartbeat') {
        const d = msg.data as { camera?: { id: string } }
        const cam = d.camera
        if (cam?.id) { s.updateCameraHeartbeat(cam.id); void connectToCamera(cam.id) }
      }
    })
    return () => off()
  }, [])
  return null
}
