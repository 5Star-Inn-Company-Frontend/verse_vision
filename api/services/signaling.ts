import type { WebSocket } from 'ws'

const peers = new Map<string, WebSocket>()
const sessions = new Map<string, { from: string; to: string; startedAt: number }>()

export function registerPeer(id: string, ws: WebSocket): void {
  peers.set(id, ws)
}

export function removePeer(ws: WebSocket): void {
  for (const [id, sock] of peers.entries()) {
    if (sock === ws) peers.delete(id)
  }
  for (const [key, s] of sessions.entries()) {
    if (!peers.has(s.from) || !peers.has(s.to)) sessions.delete(key)
  }
}

export function sendTo(id: string, payload: unknown): void {
  const sock = peers.get(id)
  if (!sock) {
    console.warn(`[Signaling] sendTo failed: peer ${id} not found`)
    return
  }
  try { sock.send(JSON.stringify(payload)) } catch (e) { void e }
}

export function listPeers(): string[] {
  return Array.from(peers.keys())
}

export function startSession(from: string, to: string): void {
  const key = `${from}->${to}`
  sessions.set(key, { from, to, startedAt: Date.now() })
}

export function endSession(from: string, to: string): void {
  const key = `${from}->${to}`
  sessions.delete(key)
}

export function listSessions(): Array<{ from: string; to: string; startedAt: number }> {
  return Array.from(sessions.values())
}
