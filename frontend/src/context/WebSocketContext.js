import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { isAuthenticated, user, logout, refreshUser } = useAuth();
  const wsRef = useRef(null);
  const subscribersRef = useRef(new Set());
  const reconnectTimerRef = useRef(null);
  const isUnmountedRef = useRef(false);

  const [onlineUsers, setOnlineUsers] = useState({});
  const [unreadImmo, setUnreadImmo] = useState(0);
  const [unreadProc, setUnreadProc] = useState(0);

  const connect = useCallback(() => {
    if (!isAuthenticated || isUnmountedRef.current) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const wsUrl = process.env.REACT_APP_BACKEND_URL
      ?.replace("https://", "wss://")
      .replace("http://", "ws://");

    const ws = new WebSocket(`${wsUrl}/api/ws/chat`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "role_update") {
          if (data.action === "approved") {
            toast.success(data.message || "Votre role a ete mis a jour !");
            refreshUser().then(() => {
              const role = data.role;
              if (role === "agent") window.location.href = "/immobilier";
              else if (role === "auteur") window.location.href = "/admin";
            });
          } else if (data.action === "rejected") {
            toast.error(data.message || "Votre demande a ete refusee. Acces revoque.");
            setTimeout(() => { logout(); window.location.href = "/connexion"; }, 2000);
          }
          return;
        }

        if (data.type === "content_update" && data.action === "created") {
          const label = data.content_type === "article" ? "Nouvel article" : "Nouvelle annonce";
          toast.info(`${label} : ${data.title || ""}`, { duration: 5000 });
        }

        if (data.type === "unread_update") {
          setUnreadImmo(data.immobilier || 0);
          setUnreadProc(data.procedures || 0);
        }
        if (data.type === "status") {
          setOnlineUsers((prev) => ({ ...prev, [data.user_id]: data.online }));
        }

        subscribersRef.current.forEach((handler) => {
          try { handler(data); } catch {}
        });
      } catch {}
    };

    ws.onclose = () => {
      if (!isUnmountedRef.current && isAuthenticated) {
        reconnectTimerRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => { ws.close(); };
  }, [isAuthenticated, logout, refreshUser]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();
    return () => {
      isUnmountedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((handler) => {
    subscribersRef.current.add(handler);
    return () => subscribersRef.current.delete(handler);
  }, []);

  return (
    <WebSocketContext.Provider value={{ onlineUsers, unreadImmo, unreadProc, send, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);
