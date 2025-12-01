/**
 * local server entry file, for local development
 */
import app from './app.js';
import { WebSocketServer } from 'ws'
import { setWss } from './services/wsBus.js'

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' })
wss.on('connection', (ws) => {
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
