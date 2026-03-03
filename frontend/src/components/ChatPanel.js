import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { X, Send, MessageSquare, Loader2, ArrowLeft, Circle } from "lucide-react";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function ChatPanel({ type, recipientId, recipientName, propertyId, propertyTitle, onClose }) {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Hide ChatHelp when this panel is open
  useEffect(() => {
    document.body.dataset.chatOpen = "true";
    return () => { delete document.body.dataset.chatOpen; };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch conversations
  useEffect(() => {
    if (!token) return;
    api.get(`/conversations?type=${type}`)
      .then(r => {
        setConversations(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, type]);

  // Auto-open conversation if recipientId is provided
  useEffect(() => {
    if (recipientId && token) {
      const params = new URLSearchParams({ recipient_id: recipientId, type });
      if (propertyId) params.append("property_id", propertyId);
      api.post(`/conversations?${params.toString()}`)
        .then(r => {
          setActiveConv(r.data);
          loadMessages(r.data.id);
        })
        .catch(err => toast.error(err.response?.data?.detail || "Erreur"));
    }
  }, [recipientId, token, type, propertyId]);

  // WebSocket connection
  useEffect(() => {
    if (!token || !activeConv) return;

    const wsUrl = process.env.REACT_APP_BACKEND_URL
      ?.replace("https://", "wss://")
      .replace("http://", "ws://");
    const ws = new WebSocket(`${wsUrl}/api/ws/chat?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_message" && data.message.conversation_id === activeConv.id) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(scrollToBottom, 100);
      }
      if (data.type === "typing" && data.conversation_id === activeConv.id) {
        setTyping(data.username);
        setTimeout(() => setTyping(null), 2000);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [token, activeConv, scrollToBottom]);

  const loadMessages = async (convId) => {
    try {
      const r = await api.get(`/conversations/${convId}/messages`);
      setMessages(r.data.messages || []);
      setTimeout(scrollToBottom, 200);
    } catch (err) {
      toast.error("Erreur de chargement des messages");
    }
  };

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || !activeConv) return;

    setSending(true);
    setNewMessage("");

    // Send via WebSocket if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "message",
        conversation_id: activeConv.id,
        content,
      }));
      setSending(false);
    } else {
      // Fallback: REST API would need to be added
      setSending(false);
      toast.error("Connexion perdue, veuillez rafraîchir");
    }
  };

  const handleTyping = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && activeConv) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        conversation_id: activeConv.id,
      }));
    }
  };

  const openConversation = (conv) => {
    setActiveConv(conv);
    loadMessages(conv.id);
  };

  const otherName = (conv) => {
    const idx = conv.participant_ids?.indexOf(user?.id);
    const names = conv.participant_names || [];
    return idx === 0 ? names[1] : names[0];
  };

  if (!token) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-white border border-zinc-200 shadow-2xl flex flex-col z-50" data-testid="chat-panel">
      {/* Header */}
      <div className="bg-black text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {activeConv && (
          <button onClick={() => { setActiveConv(null); setMessages([]); }} className="p-1 hover:bg-zinc-800 rounded" data-testid="chat-back-btn">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <MessageSquare className="w-5 h-5 text-[#FF6600] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold font-['Oswald'] uppercase tracking-wider truncate">
            {activeConv ? (recipientName || otherName(activeConv)) : (type === "immobilier" ? "Messages Immobilier" : "Messages Procédures")}
          </p>
          {activeConv && propertyTitle && (
            <p className="text-[10px] text-zinc-400 truncate">{propertyTitle}</p>
          )}
          {typing && <p className="text-[10px] text-[#FF6600]">{typing} écrit...</p>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded" data-testid="chat-close-btn">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" />
          </div>
        ) : !activeConv ? (
          /* Conversation List */
          <div className="divide-y divide-zinc-100">
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 text-zinc-300" />
                <p className="text-sm text-zinc-400 font-['Manrope']">Aucune conversation</p>
                <p className="text-xs text-zinc-300 font-['Manrope'] mt-1">
                  {type === "immobilier"
                    ? "Contactez un agent depuis une annonce"
                    : "Contactez-nous depuis une procédure"}
                </p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  data-testid={`conv-${conv.id}`}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FF6600] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(otherName(conv) || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold font-['Manrope'] truncate">{otherName(conv)}</p>
                        <span className="text-[10px] text-zinc-400">{formatDate(conv.last_message_at)}</span>
                      </div>
                      {conv.property_title && (
                        <p className="text-[10px] text-[#FF6600] truncate">{conv.property_title}</p>
                      )}
                      <p className="text-xs text-zinc-500 truncate">{conv.last_message || "Nouvelle conversation"}</p>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="bg-[#FF6600] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Messages */
          <div className="p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-xs text-zinc-400 py-8 font-['Manrope']">Début de la conversation</p>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === user?.id;
              const showDate = i === 0 || formatDate(msg.created_at) !== formatDate(messages[i - 1]?.created_at);
              return (
                <div key={msg.id || i}>
                  {showDate && (
                    <p className="text-center text-[10px] text-zinc-400 py-2">{formatDate(msg.created_at)}</p>
                  )}
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      data-testid={`msg-${msg.id}`}
                      className={`max-w-[80%] px-3 py-2 text-sm font-['Manrope'] ${
                        isMine
                          ? "bg-[#FF6600] text-white rounded-t-xl rounded-bl-xl"
                          : "bg-zinc-100 text-zinc-800 rounded-t-xl rounded-br-xl"
                      }`}
                    >
                      {!isMine && <p className="text-[10px] font-bold mb-0.5">{msg.sender_name}</p>}
                      <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[9px] mt-1 ${isMine ? "text-orange-200" : "text-zinc-400"}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {activeConv && (
        <div className="border-t border-zinc-200 p-2 flex items-center gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              else handleTyping();
            }}
            placeholder="Écrivez un message..."
            data-testid="chat-message-input"
            className="flex-1 bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm font-['Manrope'] rounded-full focus:outline-none focus:border-[#FF6600]"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            data-testid="chat-send-btn"
            className="p-2 bg-[#FF6600] text-white rounded-full hover:bg-[#CC5200] transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
