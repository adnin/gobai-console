import { io, Socket } from "socket.io-client";
import { getAuthToken } from "@/lib/tokenStore";

let socket: Socket | null = null;

type SocketConfig = {
  path: string;
  url: string;
};

function resolveSocketConfig(): SocketConfig {
  const envUrl = String((import.meta as any).env?.VITE_SOCKET_URL ?? "").trim();
  const envPath = String((import.meta as any).env?.VITE_SOCKET_PATH ?? "").trim();

  const url = envUrl || "http://localhost:3001";
  const path = envPath || "/socket.io";

  return { url, path };
}

/**
 * Web socket client for the realtime server (socket.io).
 * - Sends token in handshake auth.token
 * - Also emits "auth" on connect for backward compatibility
 */
export function getSocket() {
  if (socket) return socket;

  const { url, path } = resolveSocketConfig();

  socket = io(url, {
    autoConnect: true,
    path,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    timeout: 10_000,
    transports: ["websocket", "polling"],
    auth: { token: getAuthToken() || "" },
  });

  socket.on("connect", () => {
    const token = getAuthToken();
    if (!token) return;

    (socket as any).auth = { token };

    socket?.emit("auth", { token }, () => {
      // ack ignored
    });
  });

  return socket;
}
