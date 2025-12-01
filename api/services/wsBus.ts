import type { WebSocketServer } from 'ws'

let wss: WebSocketServer | null = null

export function setWss(server: WebSocketServer): void {
  wss = server
}

export function broadcast(payload: unknown): void {
  if (!wss) return
  const msg = JSON.stringify(payload)
  for (const client of wss.clients) {
    try { client.send(msg) } catch (e) { void e }
  }
}
