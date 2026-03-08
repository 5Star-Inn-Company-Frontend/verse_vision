import { useEffect } from 'react'
import { subscribe } from '@/lib/bus'
import { useOperatorStore, type PlaylistItem } from '@/store/useOperatorStore'
import { connectToCamera } from '@/lib/webrtc'

export default function SyncBridge() {
  useEffect(() => {
    const off = subscribe((msg) => {
      const s = useOperatorStore.getState()
      if (msg.name === 'camera-primary') {
        const d = msg.data as { id?: string }
        if (typeof d.id === 'string') s.syncPrimaryCamera(d.id)
      } else if (msg.name === 'playlist-active') {
        const d = msg.data as PlaylistItem | undefined
        s.syncPlaylistState(d)
      } else if (msg.name === 'scripture-current') {
        const d = msg.data as { id?: string } & Partial<import('@/store/useOperatorStore').ScriptureItem>
        s.syncScripture(d as import('@/store/useOperatorStore').ScriptureItem)
      } else if (msg.name === 'settings') {
        const d = msg.data as { showScriptureOverlay?: boolean; recordingEnabled?: boolean; countdownEndAt?: number | null }
        s.syncSettings(d)
      } else if (msg.name === 'lyric-current') {
        const d = msg.data as { songId: string | null; lineIndex: number; show: boolean }
        if (typeof d.lineIndex === 'number') void s.syncLyricState(d)
      } else if (msg.name === 'translation-settings') {
        s.syncTranslationSettings(msg.data as {
          translationStyle?: 'subtitle' | 'split' | 'ticker'
          translationEnabledYoruba?: boolean
          translationEnabledHausa?: boolean
          translationEnabledIgbo?: boolean
          translationEnabledFrench?: boolean
          translationEnabledEnglish?: boolean
        })
      } else if (msg.name === 'live-translation') {
        const d = msg.data as { text: string; translations: Record<string, string> } | null
        s.setLiveTranslationContent(d, true)
      } else if (msg.name === 'live-translation-enabled') {
        const d = msg.data as { enabled: boolean }
        if (typeof d.enabled === 'boolean') s.setLiveTranslationEnabled(d.enabled, true)
      } else if (msg.name === 'settings') {
        const d = msg.data as { showScriptureOverlay?: boolean }
        s.syncSettings({ showScriptureOverlay: d.showScriptureOverlay ?? false })
      } else if (msg.name === 'cameraRegistered') {
        const d = msg.data as { camera?: { id: string; name?: string; previewPath?: string | null } }
        const cam = d.camera
        if (cam?.id) {
          s.upsertCamera({ id: cam.id, name: cam.name, previewPath: cam.previewPath })
          void connectToCamera(cam.id)
        }
      } else if (msg.name === 'cameraHeartbeat') {
        const d = msg.data as { camera?: { id: string; battery?: number; signal?: number } }
        const cam = d.camera
        if (cam?.id) { s.updateCameraHeartbeat(cam.id, cam.battery, cam.signal) }
      }
    })
    return () => off()
  }, [])
  return null
}
