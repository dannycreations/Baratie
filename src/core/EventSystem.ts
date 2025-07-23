import { logger } from '../app/container';

import type { AppEvents } from '../app/events';

type EventName = keyof AppEvents;
type Listener<E extends EventName> = (payload: AppEvents[E]) => void;

export class EventSystem {
  private readonly listeners: Map<EventName, Set<Listener<any>>> = new Map();

  public on<E extends EventName>(eventName: E, listener: Listener<E>): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(listener);

    return () => this.off(eventName, listener);
  }

  public once<E extends EventName>(eventName: E, listener: Listener<E>): () => void {
    const onceListener: Listener<E> = (payload) => {
      this.off(eventName, onceListener);
      listener(payload);
    };
    return this.on(eventName, onceListener);
  }

  public off<E extends EventName>(eventName: E, listener: Listener<E>): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  public dispatch<E extends EventName>(eventName: E, payload: AppEvents[E]): void {
    logger.trace(`Event dispatched: ${eventName}`, payload);
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          logger.error(`Error in event listener for '${String(eventName)}':`, error);
        }
      });
    }
  }
}
