type EventListener = (payload: any) => void;

class SSEEventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  /**
   * Subscribe to a specific SSE event (e.g. 'opportunity_updated', 'task_created', or '*' for all events)
   */
  on(event: string, listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: string, payload?: any): void {
    // Notify specific event listeners
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error(`[SSEEventBus] Error handling event '${event}':`, err);
        }
      });
    }

    // Notify global listeners '*'
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach((listener) => {
        try {
          listener({ event, payload });
        } catch (err) {
          console.error(`[SSEEventBus] Error handling global listener for event '${event}':`, err);
        }
      });
    }
  }
}

export const sseEventBus = new SSEEventBus();
