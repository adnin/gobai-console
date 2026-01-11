// src/realtime/useRealtimeBus.ts
import { useEffect } from 'react';
import { subscribeRealtimeEvents, type RealtimeEvent } from './realtimeBus';

export function useRealtimeBus(onEvent: (evt: RealtimeEvent) => void) {
  useEffect(() => {
    return subscribeRealtimeEvents(onEvent);
  }, [onEvent]);
}
