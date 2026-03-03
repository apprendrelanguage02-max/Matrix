import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import ChatPanel from "./ChatPanel";
import api from "../lib/api";

export default function MessageButton() {
  const { token, user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unreadImmo, setUnreadImmo] = useState(0);
  const [unreadProc, setUnreadProc] = useState(0);
  const wsRef = useRef(null);

  const isImmobilier = location.pathname.startsWith("/immobilier");
  const isProcedures = location.pathname.startsWith("/procedures");
  const isVisible = isImmobilier || isProcedures;

  // Global WebSocket for real-time unread updates
  useEffect(() => {
    if (!token) return;

    const wsUrl = process.env.REACT_APP_BACKEND_URL
      ?.replace("https://", "wss://")
      .replace("http://", "ws://");
    const ws = new WebSocket(`${wsUrl}/api/ws/chat?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "unread_update") {
          setUnreadImmo(data.immobilier || 0);
          setUnreadProc(data.procedures || 0);
        }
        if (data.type === "new_message") {
          // If chat panel is not open, the WS update will handle the badge
          // If it IS open, ChatPanel handles it directly
        }
      } catch {}
    };

    ws.onclose = () => {
      // Attempt reconnect after 3s
      setTimeout(() => {
        if (wsRef.current === ws) wsRef.current = null;
      }, 3000);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      wsRef.current = null;
    };
  }, [token]);

  // Also fetch initial counts via REST
  useEffect(() => {
    if (!token) return;
    api.get("/conversations/unread-count?type=immobilier")
      .then(r => setUnreadImmo(r.data.unread_count))
      .catch(() => {});
    api.get("/conversations/unread-count?type=procedures")
      .then(r => setUnreadProc(r.data.unread_count))
      .catch(() => {});
  }, [token]);

  if (!token || !isVisible) return null;

  const type = isImmobilier ? "immobilier" : "procedures";
  const unread = isImmobilier ? unreadImmo : unreadProc;

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        data-testid="message-toggle-btn"
        className="relative p-1.5 text-zinc-400 hover:text-[#FF6600] transition-colors"
        title="Messages"
      >
        <MessageSquare className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[#FF6600] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1" data-testid="message-unread-badge">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <ChatPanel
          type={type}
          onClose={() => {
            setOpen(false);
            // Refresh counts after closing
            api.get(`/conversations/unread-count?type=immobilier`)
              .then(r => setUnreadImmo(r.data.unread_count)).catch(() => {});
            api.get(`/conversations/unread-count?type=procedures`)
              .then(r => setUnreadProc(r.data.unread_count)).catch(() => {});
          }}
        />
      )}
    </>
  );
}
