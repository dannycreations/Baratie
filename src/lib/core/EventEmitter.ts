import { logger } from '../app/container';

import type { AppEvents } from '../app/events';

type EventName = keyof AppEvents;
type Listener<E extends EventName = EventName> = (payload: AppEvents[E]) => void | Promise<void>;
type WrappedListener<E extends EventName = EventName> = Listener<E>;

export class EventEmitter {
  private readonly _listeners: Map<EventName, WrappedListener[]> = new Map();

  public on<E extends EventName>(eventName: E, listener: Listener<E>): this {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, []);
    }
    this._listeners.get(eventName)!.push(listener);
    return this;
  }

  public once<E extends EventName>(eventName: E, listener: Listener<E>): this {
    const onceListener: WrappedListener<E> = (payload) => {
      this.off(eventName, onceListener);
      listener(payload);
    };
    this.on(eventName, onceListener);
    return this;
  }

  public off<E extends EventName>(eventName: E, listener: Listener<E>): this {
    const eventListeners = this._listeners.get(eventName);
    if (!eventListeners) {
      return this;
    }

    let index = -1;
    for (let i = eventListeners.length - 1; i >= 0; i--) {
      const currentListener = eventListeners[i];
      if (currentListener === listener) {
        index = i;
        break;
      }
    }

    if (index > -1) {
      eventListeners.splice(index, 1);
      if (eventListeners.length === 0) {
        this._listeners.delete(eventName);
      }
    }
    return this;
  }

  public emit<E extends EventName>(eventName: E, payload: AppEvents[E]): boolean {
    logger.trace(`Event emitted: ${String(eventName)}`, payload);
    const eventListeners = this._listeners.get(eventName);

    if (!eventListeners || eventListeners.length === 0) {
      return false;
    }

    const listeners = [...eventListeners];
    for (const listener of listeners) {
      try {
        const result = listener(payload);
        if (result instanceof Promise) {
          result.catch((error) => logger.error(`Error in async event listener for '${String(eventName)}':`, error));
        }
      } catch (error) {
        logger.error(`Error in sync event listener for '${String(eventName)}':`, error);
      }
    }

    return true;
  }

  public removeAllListeners(eventName?: EventName): this {
    if (eventName) {
      this._listeners.delete(eventName);
    } else {
      this._listeners.clear();
    }
    return this;
  }

  public listeners(eventName: EventName): Listener[] {
    return this._listeners.get(eventName) ?? [];
  }

  public listenerCount(eventName: EventName): number {
    const eventListeners = this._listeners.get(eventName);
    return eventListeners ? eventListeners.length : 0;
  }
}
