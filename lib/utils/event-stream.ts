type Listener = (data: string) => void

class EventBroadcaster {
  private listeners: Set<Listener> = new Set()

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  broadcast(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    this.listeners.forEach(listener => {
      try { listener(payload) } catch { /* client disconnected */ }
    })
  }

  get connectionCount(): number {
    return this.listeners.size
  }
}

const globalForEvents = globalThis as unknown as { eventBroadcaster?: EventBroadcaster }
export const eventBroadcaster = globalForEvents.eventBroadcaster ?? new EventBroadcaster()
globalForEvents.eventBroadcaster = eventBroadcaster
