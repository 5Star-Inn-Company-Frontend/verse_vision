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
  const recognitionRef = useRef<any>(null)
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
      if (currentEngine === 'browser') {
        console.log('[AudioService] Browser STT enabled (Web Speech)')
        startBrowserRecognition()
        console.log('[AudioService] Browser STT Initiate restart')
      } else if (showScriptureOverlay || useOperatorStore.getState().liveTranslationEnabled) {
        if (currentEngine === 'openai' || currentEngine === 'offline') {
          ensureSttSocket(currentEngine)
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
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null
          recognitionRef.current.onerror = null
          recognitionRef.current.onend = null
          recognitionRef.current.stop()
        } catch (e) {
          console.error('[AudioService] Failed to stop recognition on cleanup', e)
        }
        recognitionRef.current = null
      }
      if (sttWsRef.current) {
        try { sttWsRef.current.close() } catch (e) { void e }
        sttWsRef.current = null
      }
    }
  }, [activeAudioCameraId, cameraStream, selectedMicrophoneId, showScriptureOverlay, liveTranslationEnabled])

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
            if (average > 10) { // Threshold (out of 255) - approx 4% volume
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
      // Record for 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000))
      
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

  const ensureSttSocket = (engine: 'openai' | 'offline') => {
    const existing = sttWsRef.current
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return
    }

    const wsUrl = 'ws://localhost:3332/ws/stt'

    const ws = new WebSocket(wsUrl)
    sttWsRef.current = ws

    ws.addEventListener('open', () => {
      console.log('[AudioService] STT WS open, sending config for engine =', engine)
      ws.send(JSON.stringify({ type: 'config', engine }))
    })

    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as { type?: string; text?: string }
        if (msg.type === 'transcript' && msg.text) {
          const state = useOperatorStore.getState()
          const currentEngine = state.scriptureDetectionEngine
          const effectiveEngine = currentEngine === 'offline' ? 'offline' : 'openai'
          void handleTranscript(msg.text, effectiveEngine)
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

  const handleTranscript = async (text: string, engine: 'openai' | 'offline' | 'browser') => {
    const state = useOperatorStore.getState()
    if (!text || text.trim().length < 5) {
      return
    }
    console.log('[AudioService] Transcribed:', text)
    setLastTranscription(text)

    if (state.liveTranslationEnabled) {
      try {
        const translationEngine = engine === 'offline' ? 'marian' : 'openai'
        const translations = await api.translate(text, translationEngine)
        state.setLiveTranslationContent({ text, translations })
      } catch (e) {
        console.error('[AudioService] Live Translation Error:', e)
      }
    }

    const combinedText = (transcriptionBufferRef.current + ' ' + text).trim()

    if (useOperatorStore.getState().showScriptureOverlay) {
      const detectionEngine = engine === 'offline' ? 'offline' : 'openai'
      const { queue, references } = await api.detectScripture(combinedText, detectionEngine)

      if (references && references.length > 0) {
        transcriptionBufferRef.current = ''
        console.log('[AudioService] Scripture detected, clearing buffer')
      } else {
        if (combinedText.length > 500) {
          transcriptionBufferRef.current = text
        } else {
          transcriptionBufferRef.current = combinedText
        }
      }

      if (queue) setScriptureQueue(queue)
    }
  }

  const startBrowserRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('[AudioService] Web Speech API not supported in this browser')
      setLastTranscription('Browser speech is not supported in this environment. Please use OpenAI or Offline.')
      return
    }

    if (recognitionRef.current) {
      return
    }

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onresult = (event: any) => {
      try {
        const results = event.results
        let finalText = ''
        for (let i = event.resultIndex; i < results.length; i++) {
          const res = results[i]
          if (res.isFinal && res[0]?.transcript) {
            finalText += res[0].transcript + ' '
          }
        }
        if (finalText.trim().length > 0) {
          void handleTranscript(finalText.trim(), 'browser')
        }
      } catch (e) {
        console.error('[AudioService] Web Speech onresult error', e)
      }
    }

    rec.onerror = (event: any) => {
      console.error('[AudioService] Web Speech error', event)
      const message = event && event.error ? `Browser speech error: ${event.error}` : 'Browser speech error'
      setLastTranscription(message)
      startBrowserRecognition()
    }

    rec.onend = () => {
      const state = useOperatorStore.getState()
      if (state.scriptureDetectionEngine === 'browser' && (state.showScriptureOverlay || state.liveTranslationEnabled)) {
        try {
          rec.start()
        } catch (e) {
          console.error('[AudioService] Failed to restart Web Speech', e)
        }
      }
    }

    try {
      rec.start()
      recognitionRef.current = rec
    } catch (e) {
      console.error('[AudioService] Failed to start Web Speech', e)
    }
  }

  return null
}
