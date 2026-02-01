import { useEffect, useRef } from 'react'
import { useOperatorStore } from '@/store/useOperatorStore'
import { api } from '@/lib/api'

export default function AudioService() {
  const { activeAudioCameraId, liveStreams, setScriptureQueue, scriptureDetectionEngine, selectedMicrophoneId, showScriptureOverlay } = useOperatorStore()
  const processingRef = useRef(false)
  const sessionRef = useRef<string>('')
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const transcriptionBufferRef = useRef<string>('')

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

      if (showScriptureOverlay) {
        console.log(`[AudioService] Starting recording session ${sessionId.slice(0,4)} for ${sourceId}`)
        void recordLoop(stream, sessionId)
      } else {
        console.log(`[AudioService] Scripture Overlay OFF - Transcription Paused`)
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
    }
  }, [activeAudioCameraId, cameraStream, selectedMicrophoneId, showScriptureOverlay])

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
           void processAudio(blob)
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
      const engine = useOperatorStore.getState().scriptureDetectionEngine
      // 1. Transcribe
      const { text } = await api.transcribe(blob, engine)
      if (!text || text.trim().length < 5) {
        // If silence/noise, we don't clear buffer yet, we just wait for more meaningful text
        processingRef.current = false
        return
      }
      console.log('[AudioService] Transcribed:', text)

      // 2. Combine with buffer for context (handling split references like "John" ... "3:16")
      const combinedText = (transcriptionBufferRef.current + ' ' + text).trim()
      
      // 3. Detect
      const { queue, references } = await api.detectScripture(combinedText, engine)
      
      // 4. Update Buffer Strategy
      if (references && references.length > 0) {
        // Scripture found! Clear buffer as we successfully used the context
        transcriptionBufferRef.current = ''
        console.log('[AudioService] Scripture detected, clearing buffer')
      } else {
        // No scripture found yet. Keep this text in buffer for next turn to provide context.
        // If buffer gets too large (e.g. > 500 chars), we drop the old part to avoid carrying stale context forever.
        if (combinedText.length > 500) {
             transcriptionBufferRef.current = text
        } else {
             transcriptionBufferRef.current = combinedText
        }
      }

      // 5. Update Store
      if (queue) setScriptureQueue(queue)
      
    } catch (err) {
      console.error('[AudioService] Process error:', err)
    } finally {
      processingRef.current = false
    }
  }

  return null
}
