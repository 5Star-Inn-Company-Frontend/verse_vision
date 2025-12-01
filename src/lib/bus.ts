let channel: BroadcastChannel | null = null
try {
  channel = new BroadcastChannel('versevision')
} catch {
  channel = null
}

type Payload = { name: string; data: unknown }

export function publish(name: string, data: unknown) {
  if (channel) channel.postMessage({ name, data } as Payload)
}

export function subscribe(handler: (p: Payload) => void) {
  if (!channel) return () => {}
  const fn = (ev: MessageEvent) => handler(ev.data as Payload)
  channel.addEventListener('message', fn as EventListener)
  return () => channel?.removeEventListener('message', fn as EventListener)
}
