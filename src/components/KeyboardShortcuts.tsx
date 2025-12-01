import { useEffect } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'

export default function KeyboardShortcuts() {
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const s = useOperatorStore.getState()
      if (e.key === 'a') {
        const first = s.scriptureQueue[0]
        if (first) await s.approveScripture(first.id)
      } else if (e.key === 'r') {
        const first = s.scriptureQueue[0]
        if (first) await s.rejectScripture(first.id)
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = Number(e.key) - 1
        const cam = s.cameras[idx]
        if (cam) s.setPrimaryCamera(cam.id)
      } else if (e.key.toLowerCase() === 's') {
        await s.toggleScriptureOverlay(!s.showScriptureOverlay)
      } else if (e.key.toLowerCase() === 'l') {
        await s.setCurrentLyric({ songId: s.currentSongId, lineIndex: s.currentLineIndex, show: !s.showLyricsOverlay })
      } else if (e.key.toLowerCase() === 'p') {
        await s.startCountdown(2 * 60 * 1000)
      } else if (e.key.toLowerCase() === 'o') {
        await s.stopCountdown()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}
