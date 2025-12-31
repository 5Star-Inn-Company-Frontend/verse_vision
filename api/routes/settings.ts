import { Router, type Request, type Response } from 'express'
import { settingsStore } from '../services/settingsStore.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const data = await settingsStore.get()
  res.json({ success: true, data })
})

router.put('/', async (req: Request, res: Response) => {
  const { autoApproveEnabled, autoApproveDelayMs, translationStyle, translationEnabledYoruba, translationEnabledHausa, translationEnabledIgbo, translationEnabledFrench, activeAudioCameraId, showScriptureOverlay, recordingEnabled, countdownEndAt, translationEngine, scriptureDetectionEngine, cloudApiToken, overlayBackgroundColor, overlayTextScale, overlayFontFamily } = req.body || {}
  const styles = ['subtitle', 'split', 'ticker'] as const
  const engines = ['openai', 'marian', 'offline'] as const
  const data = await settingsStore.set({
    autoApproveEnabled: typeof autoApproveEnabled === 'boolean' ? autoApproveEnabled : undefined,
    autoApproveDelayMs: typeof autoApproveDelayMs === 'number' ? autoApproveDelayMs : undefined,
    translationStyle: styles.includes(translationStyle) ? translationStyle : undefined,
    translationEnabledYoruba: typeof translationEnabledYoruba === 'boolean' ? translationEnabledYoruba : undefined,
    translationEnabledHausa: typeof translationEnabledHausa === 'boolean' ? translationEnabledHausa : undefined,
    translationEnabledIgbo: typeof translationEnabledIgbo === 'boolean' ? translationEnabledIgbo : undefined,
    translationEnabledFrench: typeof translationEnabledFrench === 'boolean' ? translationEnabledFrench : undefined,
    activeAudioCameraId: typeof activeAudioCameraId === 'string' ? activeAudioCameraId : undefined,
    showScriptureOverlay: typeof showScriptureOverlay === 'boolean' ? showScriptureOverlay : undefined,
    recordingEnabled: typeof recordingEnabled === 'boolean' ? recordingEnabled : undefined,
    countdownEndAt: typeof countdownEndAt === 'number' ? countdownEndAt : undefined,
    translationEngine: (translationEngine === 'openai' || translationEngine === 'marian') ? translationEngine : undefined,
    scriptureDetectionEngine: (scriptureDetectionEngine === 'openai' || scriptureDetectionEngine === 'offline') ? scriptureDetectionEngine : undefined,
    cloudApiToken: typeof cloudApiToken === 'string' || cloudApiToken === null ? cloudApiToken : undefined,
    overlayBackgroundColor: typeof overlayBackgroundColor === 'string' ? overlayBackgroundColor : undefined,
    overlayTextScale: typeof overlayTextScale === 'number' ? overlayTextScale : undefined,
    overlayFontFamily: typeof overlayFontFamily === 'string' ? overlayFontFamily : undefined,
  })
  res.json({ success: true, data })
})

export default router
