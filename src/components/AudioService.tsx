import { useEffect, useRef } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { api } from '@/lib/api'

export default function AudioService() {
  const { activeAudioCameraId, liveStreams, setScriptureQueue, scriptureDetectionEngine, selectedMicrophoneId, showScriptureOverlay, setLastTranscription, liveTranslationEnabled } = useOperatorStore()
  const processingRef = useRef(false)
  const sessionRef = useRef<string>('')
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const transcriptionBufferRef = useRef<string>('')
  const voiceActivityRef = useRef<boolean>(false)
  const sttWsRef = useRef<WebSocket | null>(null)

  // Derived stream for the selected camera (if any)
  const cameraStream = activeAudioCameraId ? liveStreams[activeAudioCameraId] : null

  useEffect(() => {
    // Generate a new session ID for this effect run
    const sessionId = Math.random().toString(36)
    sessionRef.current = sessionId

    const start = async () => {
      let stream: MediaStream | null = null
      let sourceId = 'local-pc'

      if (activeAudioCameraId) {
        // 1. Camera Source Mode
        if (cameraStream) {
          stream = cameraStream
          sourceId = activeAudioCameraId
        } else {
            // Camera selected but stream not ready yet
            // We don't fallback to local mic here to avoid confusion; we just wait.
            console.log('[AudioService] Waiting for camera stream...', activeAudioCameraId)
            return 
        }
        
        // Cleanup local stream if it exists (release mic resource)
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop())
            localStreamRef.current = null
        }

      } else {
        // 2. Local PC Source Mode (Default)
        sourceId = 'local-pc'
        
        // Ensure we have a local stream or re-acquire if device changed
        // Force re-acquisition if we have a selectedMicrophoneId to ensure we match it
        if (localStreamRef.current) {
             localStreamRef.current.getTracks().forEach(t => t.stop())
             localStreamRef.current = null
        }

        try {
            console.log('[AudioService] Requesting local mic access...', selectedMicrophoneId ? `Device: ${selectedMicrophoneId}` : 'Default')
            localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
                audio: selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : true 
            })
        } catch (err) {
            console.error('[AudioService] Failed to get local audio:', err)
            return
        }
        stream = localStreamRef.current
      }

      if (!stream || !stream.active) {
          console.warn('[AudioService] Stream inactive or missing for', sourceId)
          return
      }
      
      // Double check session hasn't changed while we were awaiting (e.g. rapid switching)
      if (sessionRef.current !== sessionId) return

      // Setup Audio Analysis
      setupAnalysis(stream)

      const currentEngine = useOperatorStore.getState().scriptureDetectionEngine
      if (showScriptureOverlay || useOperatorStore.getState().liveTranslationEnabled) {
        if (currentEngine === 'openai' || currentEngine === 'offline') {
          ensureSttSocket(currentEngine, liveTranslationEnabled)
        }
        console.log(`[AudioService] Starting recording session ${sessionId.slice(0,4)} for ${sourceId}`)
        void recordLoop(stream, sessionId)
      } else {
        console.log(`[AudioService] Transcription Paused`)
      }
    }

    void start()

    return () => {
      // Cleanup of the effect simply invalidates the session.
      // We do NOT stop tracks here because we might be re-rendering with the same stream.
      // Specific track cleanup is handled logic inside start() or the unmount effect.
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      if (sttWsRef.current) {
        try { sttWsRef.current.close() } catch (e) { void e }
        sttWsRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAudioCameraId, cameraStream, selectedMicrophoneId, showScriptureOverlay, liveTranslationEnabled])

  useEffect(() => {
    const ws = sttWsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
       ws.send(JSON.stringify({ 
         type: 'config', 
         engine: scriptureDetectionEngine, 
         translate: liveTranslationEnabled 
       }))
       console.log('[AudioService] Updated STT config:', scriptureDetectionEngine, liveTranslationEnabled)
    }
  }, [scriptureDetectionEngine, liveTranslationEnabled])

  // Cleanup local stream on component unmount
  useEffect(() => {
      return () => {
          if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach(t => t.stop())
          }
          if (audioContextRef.current) {
              audioContextRef.current.close()
          }
          if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
          }
      }
  }, [])

  const setupAnalysis = (stream: MediaStream) => {
    try {
        if (audioContextRef.current) {
            audioContextRef.current.close()
        }
        
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        
        const update = () => {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') return
            analyser.getByteFrequencyData(dataArray)
            
            // Calculate average volume (0-255)
            let sum = 0
            for(let i = 0; i < bufferLength; i++) {
                sum += dataArray[i]
            }
            const average = sum / bufferLength
            
            // VAD Logic: Check for meaningful audio
            if (average > 20) { // Threshold (out of 255) - approx 8% volume - increased to avoid hallucinations
                voiceActivityRef.current = true
            }

            // Dispatch event for UI
            window.dispatchEvent(new CustomEvent('audio-level', { detail: average }))
            
            animationFrameRef.current = requestAnimationFrame(update)
        }
        update()
    } catch (err) {
        console.error('[AudioService] Analysis setup failed:', err)
    }
  }

  const recordLoop = async (stream: MediaStream, sessionId: string) => {
    // Check if this loop belongs to the current active session
    if (sessionRef.current !== sessionId) return

    // Reset VAD flag for this recording window
    voiceActivityRef.current = false

    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = async () => {
        // If session changed, we discard the result and stop looping
        if (sessionRef.current !== sessionId) return

        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' })
        if (blob.size > 0) {
           if (voiceActivityRef.current) {
               void processAudio(blob)
           } else {
               // Optional: clear buffer on prolonged silence? Or just skip.
               console.log('[AudioService] Skipping silent chunk')
           }
        }
        
        // Loop if still active session and stream is alive
        if (sessionRef.current === sessionId && stream.active) {
          recordLoop(stream, sessionId)
        }
      }

      recorder.start()
      // Record for 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000))
      
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    } catch (err) {
      console.error('[AudioService] Recorder error:', err)
      // Wait a bit before retrying to avoid tight loop on error
      await new Promise((resolve) => setTimeout(resolve, 2000))
      if (sessionRef.current === sessionId) recordLoop(stream, sessionId)
    }
  }

  const processAudio = async (blob: Blob) => {
    if (processingRef.current) return // Simple concurrency limit
    processingRef.current = true

    try {
      const state = useOperatorStore.getState()
      const engine = state.scriptureDetectionEngine
      const ws = sttWsRef.current

      if (ws && ws.readyState === WebSocket.OPEN && (engine === 'openai' || engine === 'offline')) {
        const buffer = await blob.arrayBuffer()
        console.log('[AudioService] Sending audio via STT WS, bytes =', buffer.byteLength, 'engine =', engine)
        ws.send(buffer)
      } else {
        const sttEngine = engine === 'offline' ? 'offline' : 'openai'
        console.log('[AudioService] Using HTTP transcribe fallback, size =', blob.size, 'engine =', sttEngine)
        const { text } = await api.transcribe(blob, sttEngine)
        if (!text || text.trim().length < 5) {
          processingRef.current = false
          return
        }
        await handleTranscript(text, engine)
      }
      
    } catch (err) {
      console.error('[AudioService] Process error:', err)
    } finally {
      processingRef.current = false
    }
  }

  const ensureSttSocket = (engine: 'openai' | 'offline', translate: boolean) => {
    const existing = sttWsRef.current
    if (existing && existing.readyState === WebSocket.OPEN) {
      existing.send(JSON.stringify({ type: 'config', engine, translate }))
      return
    }
    if (existing && existing.readyState === WebSocket.CONNECTING) {
      return
    }

    const wsUrl = 'ws://localhost:3332/ws/stt'

    const ws = new WebSocket(wsUrl)
    sttWsRef.current = ws

    ws.addEventListener('open', () => {
      const state = useOperatorStore.getState()
      const currentEngine = state.scriptureDetectionEngine
      const currentTranslate = state.liveTranslationEnabled
      console.log('[AudioService] STT WS open, sending config for engine =', currentEngine, 'translate =', currentTranslate)
      ws.send(JSON.stringify({ type: 'config', engine: currentEngine, translate: currentTranslate }))
    })

    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as { type?: string; text?: string; translations?: any }
        if (msg.type === 'transcript' && msg.text) {
          console.log('[AudioService] Received transcript:', msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : ''))
          const state = useOperatorStore.getState()
          const currentEngine = state.scriptureDetectionEngine
          const effectiveEngine = currentEngine === 'offline' ? 'offline' : 'openai'
          void handleTranscript(msg.text, effectiveEngine, msg.translations)
        }
      } catch (e) {
        console.error('[AudioService] STT WS message error', e)
      }
    })

    ws.addEventListener('error', (e) => {
      console.error('[AudioService] STT WS error', e)
    })

    ws.addEventListener('close', () => {
      sttWsRef.current = null
    })
  }

  const handleTranscript = async (text: string, engine: 'openai' | 'offline', precalculatedTranslations?: any) => {
    const state = useOperatorStore.getState()
    
    // Clean up text: remove trailing ellipses and trim
    let cleanText = text.replace(/\.\.\.$/, '').trim()
    
    if (!cleanText || cleanText.length < 5) {
      return
    }
    
    console.log('[AudioService] Transcribed:', cleanText)
    setLastTranscription(cleanText)

    if (state.liveTranslationEnabled) {
      try {
        let translations = precalculatedTranslations
        if (!translations) {
           const translationEngine = engine === 'offline' ? 'marian' : 'openai'
           translations = await api.translate(cleanText, translationEngine)
        }
        
        // Append to existing content if recent enough (simple buffer logic)
        // For now, we just update. To solve the "too fast" issue, we need a buffer in the UI or store.
        // Let's modify the store action to append instead of replace, or handle it here.
        // Ideally, the UI should show a running history.
        // For this quick fix, we will let the store handle appending logic if we change the store,
        // but since we can't easily change the store structure without breaking other things,
        // let's try to manage a local buffer and send combined text, 
        // OR better: Update the setLiveTranslationContent to support appending.
        
        // Actually, looking at the user request: "it takes away the initial ones which I might not have read all"
        // We should append new text to the existing text in the store, perhaps keeping the last N sentences.
        
        const currentContent = state.liveTranslationContent
        let newText = cleanText
        let newTranslations = translations
        
        if (currentContent && currentContent.text) {
             // Keep last 200 chars approx
             const combined = (currentContent.text + ' ' + cleanText).trim()
             // if too long, slice from start
             if (combined.length > 200) {
                 // find first space after cut to avoid cutting words
                 const cut = combined.slice(combined.length - 200)
                 newText = cut.substring(cut.indexOf(' ') + 1)
             } else {
                 newText = combined
             }
             
             // Merge translations similarly
             newTranslations = {}
             for (const key in translations) {
                 const oldT = currentContent.translations[key] || ''
                 const newT = translations[key]
                 const combinedT = (oldT + ' ' + newT).trim()
                 if (combinedT.length > 200) {
                     const cutT = combinedT.slice(combinedT.length - 200)
                     newTranslations[key] = cutT.substring(cutT.indexOf(' ') + 1)
                 } else {
                     newTranslations[key] = combinedT
                 }
             }
        }

        state.setLiveTranslationContent({ text: newText, translations: newTranslations })
      } catch (e) {
        console.error('[AudioService] Live Translation Error:', e)
      }
    }

    // Debounce Scripture Detection: Only check if text is long enough or after a pause
    // Current Logic: We append to buffer. If buffer gets too long, we might miss context.
    // New Logic: Check only every ~3rd chunk OR if chunk has sentence ending.
    
    const combinedText = (transcriptionBufferRef.current + ' ' + cleanText).trim()
    
    if (useOperatorStore.getState().showScriptureOverlay) {
      // Check if we should run detection (Optimization)
      // Run if:
      // 1. We have a significant amount of text (> 50 chars)
      // 2. AND (it ends with punctuation OR it's been a while since last check - implied by chunk arrival)
      // 3. OR the buffer is getting very full (> 200 chars)
      
      const shouldCheck = combinedText.length > 50 && (
        /[.!?]$/.test(cleanText) || // Ends with sentence
        combinedText.length > 200   // Buffer getting full
      )

      if (shouldCheck) {
          const detectionEngine = engine === 'offline' ? 'offline' : 'openai'
          const { queue, references } = await api.detectScripture(combinedText, detectionEngine)
    
          if (references && references.length > 0) {
            transcriptionBufferRef.current = ''
            console.log('[AudioService] Scripture detected, clearing buffer')
          } else {
            // Keep buffer but limit size
            if (combinedText.length > 500) {
              // Keep last 300 chars to maintain context for next check
              const cut = combinedText.slice(combinedText.length - 300)
              transcriptionBufferRef.current = cut.substring(cut.indexOf(' ') + 1)
            } else {
              transcriptionBufferRef.current = combinedText
            }
          }
    
          if (queue) setScriptureQueue(queue)
      } else {
          // Just update buffer without checking API
           if (combinedText.length > 500) {
              const cut = combinedText.slice(combinedText.length - 300)
              transcriptionBufferRef.current = cut.substring(cut.indexOf(' ') + 1)
            } else {
              transcriptionBufferRef.current = combinedText
            }
      }
    }
  }

  return null
}
