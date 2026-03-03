import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../context/WebSocketContext";
import api from "../lib/api";
import { toast } from "sonner";
import { X, Send, MessageSquare, Loader2, ArrowLeft, ExternalLink, Trash2 } from "lucide-react";

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

function TypingDots({ username }) {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
        <span className="text-[10px] font-bold text-[#FF6600]">{username}</span>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-[#FF6600] rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
          <span className="w-2 h-2 bg-[#FF6600] rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.6s" }} />
          <span className="w-2 h-2 bg-[#FF6600] rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.6s" }} />
        </div>
      </div>
    </div>
  );
}

function PropertyBanner({ conv, onNavigate }) {
  const title = conv?.property_title;
  const image = conv?.property_image;
  const propertyId = conv?.property_id;
  if (!title) return null;

  return (
    <button
      onClick={() => propertyId && onNavigate(`/immobilier/${propertyId}`)}
      className="w-full mx-0 mb-3 bg-white border border-zinc-200 rounded-xl p-2.5 flex items-center gap-3 hover:border-[#FF6600] hover:shadow-sm transition-all text-left group cursor-pointer"
      data-testid="property-banner"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-100">
        {image ? (
          <img src={image} alt="" className="w-12 h-12 object-cover" onError={(e) => { e.target.style.display = "none"; }} />
        ) : (
          <div className="w-12 h-12 bg-[#FF6600] flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Annonce</p>
        <p className="text-sm font-semibold font-['Manrope'] text-black truncate group-hover:text-[#FF6600] transition-colors">{title}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-zinc-300 group-hover:text-[#FF6600] flex-shrink-0 transition-colors" />
    </button>
  );
}

export default function ChatPanel({ type, recipientId, recipientName, propertyId, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { send, subscribe, onlineUsers } = useWebSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [deletingConvId, setDeletingConvId] = useState(null);
  const messagesEndRef = useRef(null);
  const activeConvRef = useRef(null);
  const isTypingRef = useRef(false);

  // Keep refs in sync for use in closures
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { isTypingRef.current = isTyping; }, [isTyping]);

  // Hide ChatHelp when open
  useEffect(() => {
    document.body.dataset.chatOpen = "true";
    return () => { delete document.body.dataset.chatOpen; };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Subscribe to WebSocket events from the shared context
  useEffect(() => {
    const unsubscribe = subscribe((data) => {
      const conv = activeConvRef.current;

      if (data.type === "new_message") {
        if (conv && data.message.conversation_id === conv.id) {
          setMessages((prev) => {
            // Avoid duplicate messages
            if (prev.some((m) => m.id === data.message.id)) return prev;
            return [...prev, data.message];
          });
          setTimeout(scrollToBottom, 100);
          // Mark as read immediately
          if (data.message.sender_id !== user?.id) {
            send({ type: "mark_read", conversation_id: conv.id });
          }
        }
        // Update last_message in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === data.message.conversation_id
              ? { ...c, last_message: data.message.content, last_message_at: data.message.created_at }
              : c
          )
        );
      }

      if (data.type === "typing_start" && conv && data.conversation_id === conv.id) {
        setTyping(data.username);
      }
      if (data.type === "typing_stop" && conv && data.conversation_id === conv.id) {
        setTyping(null);
      }
    });

    return unsubscribe;
  }, [subscribe, send, user?.id, scrollToBottom]);

  // Fetch conversations
  useEffect(() => {
    api.get(`/conversations?type=${type}`)
      .then((r) => { setConversations(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [type]);

  // Auto-open conversation when recipientId provided (from property page)
  useEffect(() => {
    if (!recipientId) return;
    const params = new URLSearchParams({ recipient_id: recipientId, type });
    if (propertyId) params.append("property_id", propertyId);
    api.post(`/conversations?${params.toString()}`)
      .then((r) => {
        setActiveConv(r.data);
        loadMessages(r.data.id);
      })
      .catch((err) => toast.error(err.response?.data?.detail || "Erreur"));
  }, [recipientId, type, propertyId]);

  const loadMessages = async (convId) => {
    try {
      const r = await api.get(`/conversations/${convId}/messages`);
      setMessages(r.data.messages || []);
      // Update conv with full data (including property_image)
      if (r.data.conversation) {
        setActiveConv((prev) => prev ? { ...prev, ...r.data.conversation } : r.data.conversation);
      }
      setTimeout(scrollToBottom, 200);
      // Mark as read on open
      send({ type: "mark_read", conversation_id: convId });
    } catch {
      toast.error("Erreur de chargement");
    }
  };

  const handleSend = () => {
    const content = newMessage.trim();
    if (!content || !activeConvRef.current) return;

    setSending(true);
    setNewMessage("");

    // Stop typing indicator
    if (isTypingRef.current) {
      send({ type: "typing_stop", conversation_id: activeConvRef.current.id });
      setIsTyping(false);
    }

    // Prepend property info on first message
    let finalContent = content;
    if (messages.length === 0 && activeConvRef.current.property_title) {
      finalContent = `[Annonce: ${activeConvRef.current.property_title}]\n\n${content}`;
    }

    const sent = send({
      type: "message",
      conversation_id: activeConvRef.current.id,
      content: finalContent,
    });

    if (!sent) {
      toast.error("Connexion perdue, reconnexion...");
    }
    setSending(false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!activeConvRef.current) return;

    if (e.target.value.trim().length > 0 && !isTypingRef.current) {
      send({ type: "typing_start", conversation_id: activeConvRef.current.id });
      setIsTyping(true);
    }
    if (e.target.value.trim().length === 0 && isTypingRef.current) {
      send({ type: "typing_stop", conversation_id: activeConvRef.current.id });
      setIsTyping(false);
    }
  };

  const handleInputBlur = () => {
    if (isTypingRef.current && activeConvRef.current) {
      send({ type: "typing_stop", conversation_id: activeConvRef.current.id });
      setIsTyping(false);
    }
  };

  const openConversation = (conv) => {
    setActiveConv(conv);
    setTyping(null);
    setMessages([]);
    loadMessages(conv.id);
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation(); // don't open the conversation
    if (!window.confirm("Supprimer cette conversation ? Cette action est irréversible.")) return;
    setDeletingConvId(convId);
    try {
      await api.delete(`/conversations/${convId}`);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      toast.success("Conversation supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingConvId(null);
    }
  };

  const handleBack = () => {
    if (isTypingRef.current && activeConvRef.current) {
      send({ type: "typing_stop", conversation_id: activeConvRef.current.id });
      setIsTyping(false);
    }
    setActiveConv(null);
    setMessages([]);
    setTyping(null);
    setNewMessage("");
    // Refresh conversation list
    api.get(`/conversations?type=${type}`).then((r) => setConversations(r.data)).catch(() => {});
  };

  const otherName = (conv) => {
    const idx = conv.participant_ids?.indexOf(user?.id);
    return idx === 0 ? conv.participant_names?.[1] : conv.participant_names?.[0];
  };

  const otherId = (conv) => {
    const idx = conv.participant_ids?.indexOf(user?.id);
    return idx === 0 ? conv.participant_ids?.[1] : conv.participant_ids?.[0];
  };

  const handleNavProperty = (path) => {
    onClose();
    navigate(path);
  };

  const activeOtherId = activeConv ? otherId(activeConv) : null;
  const activeIsOnline = activeOtherId ? !!onlineUsers?.[activeOtherId] : false;

  return (
    <div className="fixed bottom-4 right-4 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-white border border-zinc-200 shadow-2xl flex flex-col z-50 rounded-xl overflow-hidden" data-testid="chat-panel">
      {/* Header */}
      <div className="bg-black text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {activeConv && (
          <button onClick={handleBack} className="p-1 hover:bg-zinc-800 rounded" data-testid="chat-back-btn">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <MessageSquare className="w-5 h-5 text-[#FF6600] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold font-['Oswald'] uppercase tracking-wider truncate">
              {activeConv
                ? (recipientName || otherName(activeConv))
                : (type === "immobilier" ? "Messages Immobilier" : "Messages Procédures")}
            </p>
            {activeConv && activeIsOnline && (
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 ring-2 ring-green-500/30" data-testid="chat-header-online" />
            )}
          </div>
          {activeConv && activeIsOnline && <p className="text-[10px] text-green-400">En ligne</p>}
          {activeConv && !activeIsOnline && <p className="text-[10px] text-zinc-500">Hors ligne</p>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded" data-testid="chat-close-btn">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-zinc-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" />
          </div>
        ) : !activeConv ? (
          <div className="divide-y divide-zinc-100 bg-white">
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
              conversations.map((conv) => {
                const oId = otherId(conv);
                const isOnline = oId ? !!onlineUsers?.[oId] : false;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    data-testid={`conv-${conv.id}`}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors group/conv relative"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[#FF6600] flex items-center justify-center text-white font-bold text-sm">
                          {(otherName(conv) || "?")[0].toUpperCase()}
                        </div>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" data-testid={`online-${oId}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold font-['Manrope'] truncate">{otherName(conv)}</p>
                          <span className="text-[10px] text-zinc-400 group-hover/conv:opacity-0 transition-opacity">{formatDate(conv.last_message_at)}</span>
                        </div>
                        {conv.property_title && (
                          <p className="text-[10px] text-[#FF6600] truncate">{conv.property_title}</p>
                        )}
                        <p className="text-xs text-zinc-500 truncate">{conv.last_message || "Nouvelle conversation"}</p>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="bg-[#FF6600] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 group-hover/conv:opacity-0 transition-opacity">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    {/* Delete button appears on hover */}
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      data-testid={`delete-conv-${conv.id}`}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/conv:opacity-100 transition-opacity p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded"
                      title="Supprimer la conversation"
                    >
                      {deletingConvId === conv.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="p-3">
            <PropertyBanner conv={activeConv} onNavigate={handleNavProperty} />

            {messages.length === 0 && (
              <p className="text-center text-xs text-zinc-400 py-8 font-['Manrope']">Début de la conversation</p>
            )}
            <div className="space-y-4">
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
                        className={`max-w-[80%] px-3.5 py-2.5 text-sm font-['Manrope'] shadow-sm ${
                          isMine
                            ? "bg-[#FF6600] text-white rounded-2xl rounded-br-sm"
                            : "bg-white text-zinc-800 border border-zinc-200 rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        {!isMine && <p className="text-[10px] font-bold text-[#FF6600] mb-1">{msg.sender_name}</p>}
                        <p className="break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <p className={`text-[9px] mt-1.5 ${isMine ? "text-orange-200" : "text-zinc-400"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {typing && <TypingDots username={typing} />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {activeConv && (
        <div className="border-t border-zinc-200 p-2.5 flex items-center gap-2 flex-shrink-0 bg-white">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Écrivez un message..."
            data-testid="chat-message-input"
            className="flex-1 bg-zinc-100 border border-zinc-200 px-4 py-2.5 text-sm text-black font-['Manrope'] rounded-full focus:outline-none focus:border-[#FF6600] focus:bg-white placeholder:text-zinc-400"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            data-testid="chat-send-btn"
            className="p-2.5 bg-[#FF6600] text-white rounded-full hover:bg-[#CC5200] transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
