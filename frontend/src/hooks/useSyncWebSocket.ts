import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuthStore } from "../store/auth";
import { getAccessToken } from "../lib/api";
import type { SyncEvent } from "../lib/types";

type SyncEventHandler = (event: SyncEvent) => void;

const STOMP_RECONNECT_DELAY = 3000;

export function useSyncWebSocket(onSyncEvent: SyncEventHandler) {
  const user = useAuthStore((s) => s.user);
  const clientRef = useRef<Client | null>(null);
  const handlerRef = useRef<SyncEventHandler>(onSyncEvent);
  handlerRef.current = onSyncEvent;

  const connect = useCallback(() => {
    if (!user) return;

    const token = getAccessToken();
    const client = new Client({
      webSocketFactory: () => new SockJS(`${window.location.origin}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: STOMP_RECONNECT_DELAY,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        client.subscribe(`/topic/sync/${user.id}`, (message) => {
          try {
            const event: SyncEvent = JSON.parse(message.body);
            handlerRef.current(event);
          } catch {}
        });
      },
      onStompError: () => {},
    });

    client.activate();
    clientRef.current = client;
  }, [user]);

  useEffect(() => {
    connect();
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [connect]);
}
