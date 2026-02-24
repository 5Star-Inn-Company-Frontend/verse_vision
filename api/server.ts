/**
 * local server entry file, for local development
 */
import app from './app.js';
import { WebSocketServer } from 'ws'
import path from 'path'
import fs from 'fs'
import { setWss } from './services/wsBus.js'
import { registerPeer, removePeer, sendTo, startSession, endSession } from './services/signaling.js'
import { offlineService } from './services/ai/offline.js'
import { marianService } from './services/ai/marian.js'
import { transcribeAudio, translateTextParallel } from './services/ai/openai.js'

/**
 * start server with port
 */
const PORT = process.env.PORT || 3332;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

const wss = new WebSocketServer({ noServer: true })
const sttWss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`)

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  } else if (pathname === '/ws/stt') {
    sttWss.handleUpgrade(request, socket, head, (ws) => {
      sttWss.emit('connection', ws, request)
    })
  } else {
    socket.destroy()
  }
})

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(String(data)) as { type: string; id?: string; to?: string; from?: string; sdp?: unknown; candidate?: unknown }
      console.log('ws:message', msg.type, { id: msg.id, from: msg.from, to: msg.to })
      if (msg.type === 'register' && msg.id) {
        console.log('ws:register', msg.id)
        registerPeer(msg.id, ws)
        ws.send(JSON.stringify({ type: 'registered', id: msg.id, ts: Date.now() }))
      } else if (msg.type === 'connect' && msg.to && msg.from) {
        console.log('ws:connect', { from: msg.from, to: msg.to })
        startSession(msg.from, msg.to)
        sendTo(msg.to, { type: 'connect', from: msg.from })
      } else if (msg.type === 'disconnect' && msg.to && msg.from) {
        console.log('ws:disconnect', { from: msg.from, to: msg.to })
        endSession(msg.from, msg.to)
        sendTo(msg.to, { type: 'disconnect', from: msg.from })
      } else if (msg.type === 'offer' && msg.to) {
        console.log('ws:offer', { from: msg.from, to: msg.to })
        sendTo(msg.to, { type: 'offer', from: msg.from, sdp: msg.sdp })
      } else if (msg.type === 'answer' && msg.to) {
        console.log('ws:answer', { from: msg.from, to: msg.to })
        sendTo(msg.to, { type: 'answer', from: msg.from, sdp: msg.sdp })
      } else if (msg.type === 'candidate' && msg.to) {
        console.log('ws:candidate', { from: msg.from, to: msg.to })
        sendTo(msg.to, { type: 'candidate', from: msg.from, candidate: msg.candidate })
      }
    } catch (e) { void e }
  })
  ws.on('close', () => removePeer(ws))
  console.log('ws:connection')
  ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }))
})
setWss(wss)

const sttTmpDir = process.env.VV_DATA_DIR
  ? path.join(process.env.VV_DATA_DIR, 'tmp')
  : path.resolve(__dirname, '../tmp')
if (!fs.existsSync(sttTmpDir)) fs.mkdirSync(sttTmpDir, { recursive: true })

// sttWss initialized above with noServer: true
sttWss.on('connection', (ws) => {
  let engine: 'openai' | 'offline' = 'openai'
  let translate = false

  console.log('[stt-ws] client connected')

  ws.on('message', async (data, isBinary) => {
    try {
      const isText = typeof data === 'string' || isBinary === false
      if (isText) {
        const msg = JSON.parse(String(data)) as { type?: string; engine?: string; translate?: boolean }
        if (msg.type === 'config') {
          if (msg.engine === 'openai' || msg.engine === 'offline') engine = msg.engine
          if (typeof msg.translate === 'boolean') translate = msg.translate
          console.log('[stt-ws] config received, engine =', engine, 'translate =', translate)
          ws.send(JSON.stringify({ type: 'config-ack', engine, translate }))
        }
        return
      }

      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
      console.log('[stt-ws] binary chunk received, bytes =', buf.length, 'engine =', engine)
      const tmpFile = path.join(
        sttTmpDir,
        `stt_${Date.now()}_${Math.random().toString(36).slice(2)}.webm`,
      )
      await fs.promises.writeFile(tmpFile, buf)

      let text = ''
      if (engine === 'offline') {
        console.log('[stt-ws] Using offline transcription')
        text = await offlineService.transcribe(tmpFile)
      } else {
        console.log('[stt-ws] Using OpenAI cloud transcription')
        text = await transcribeAudio(tmpFile)
      }

      if (text && text.trim().length > 0) {
        console.log('[stt-ws] sending transcript, length =', text.length)
        let translations = undefined
        if (translate) {
          try {
             if (engine === 'offline') {
                translations = await marianService.translate(text)
             } else {
                translations = await translateTextParallel(text)
             }
          } catch (e) {
             console.error('[stt-ws] Translation failed:', e)
          }
        }
        ws.send(JSON.stringify({ type: 'transcript', text, translations }))
      }

      fs.promises.unlink(tmpFile).catch(() => {})
    } catch (err) {
      console.error('[stt-ws] Error handling message:', err)
      try {
        ws.send(JSON.stringify({ type: 'error', error: 'transcription_failed' }))
      } catch (e) {
        void e
      }
    }
  })

  ws.send(JSON.stringify({ type: 'stt-hello', ts: Date.now() }))
})

/**
 * close server
 */
const gracefulShutdown = () => {
  console.log('Shutting down server...')
  offlineService.stop()
  marianService.stop()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  gracefulShutdown()
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  gracefulShutdown()
});

export default app;
