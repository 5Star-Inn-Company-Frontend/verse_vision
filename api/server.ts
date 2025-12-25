/**
 * local server entry file, for local development
 */
import app from './app.js';
import { WebSocketServer } from 'ws'
import { setWss } from './services/wsBus.js'
import { registerPeer, removePeer, sendTo, startSession, endSession } from './services/signaling.js'

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' })
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

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
