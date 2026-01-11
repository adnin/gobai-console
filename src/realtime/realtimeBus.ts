// src/realtime/realtimeBus.ts
/**
 * Tiny in-memory pub/sub bus for realtime events.
 * Keeps socket + push listeners in ONE place (ViewerContext),
 * while screens can subscribe without duplicating socket listeners.
 */
export type RealtimeEvent = any;

type Listener = (evt: RealtimeEvent) => void;

const listeners = new Set<Listener>();

export function emitRealtimeEvent(evt: RealtimeEvent) {
  for (const fn of listeners) {
    try {
      fn(evt);
    } catch {
      // ignore listener errors
    }
  }
}

export function subscribeRealtimeEvents(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
