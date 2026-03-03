import { useState, useEffect } from "react";
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

  const isImmobilier = location.pathname.startsWith("/immobilier");
  const isProcedures = location.pathname.startsWith("/procedures");
  const isVisible = isImmobilier || isProcedures;

  useEffect(() => {
    if (!token || !isVisible) return;
    const type = isImmobilier ? "immobilier" : "procedures";
    api.get(`/conversations/unread-count?type=${type}`)
      .then(r => {
        if (isImmobilier) setUnreadImmo(r.data.unread_count);
        else setUnreadProc(r.data.unread_count);
      })
      .catch(() => {});
  }, [token, location.pathname, isVisible, isImmobilier]);

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
            // Refresh unread count
            api.get(`/conversations/unread-count?type=${type}`)
              .then(r => {
                if (isImmobilier) setUnreadImmo(r.data.unread_count);
                else setUnreadProc(r.data.unread_count);
              })
              .catch(() => {});
          }}
        />
      )}
    </>
  );
}
