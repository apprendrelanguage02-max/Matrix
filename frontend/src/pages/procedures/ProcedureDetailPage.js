import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import ChatPanel from "../../components/ChatPanel";
import api from "../../lib/api";
import { Loader2, Calendar, Eye, ArrowLeft, Edit, Trash2, User, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

const LOGO = "https://customer-assets.emergentagent.com/job_2b66c898-0ce0-4fc9-a685-24a9ac754e60/artifacts/p7stxwf9_ChatGPT%20Image%20Feb%2017%2C%202026%2C%2005_57_11%20PM.png";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ProcedureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [procedure, setProcedure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [adminContact, setAdminContact] = useState(null);
  
  useEffect(() => {
    api.get(`/procedures/${id}`)
      .then(r => setProcedure(r.data))
      .catch(() => setError("Procédure introuvable."))
      .finally(() => setLoading(false));
    // Fetch current admin contact info
    api.get("/admin/contact")
      .then(r => setAdminContact(r.data))
      .catch(() => {});
  }, [id]);
  
  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette procédure ?")) return;
    setDeleting(true);
    try {
      await api.delete(`/procedures/${id}`);
      toast.success("Procédure supprimée");
      navigate("/procedures");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };
  
  const isAdmin = user?.role === "admin";
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
      </div>
    );
  }
  
  if (error || !procedure) {
    return (
      <div className="min-h-screen bg-white font-['Manrope']">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="font-['Oswald'] text-3xl uppercase text-zinc-300">{error || "Procédure introuvable"}</p>
          <Link to="/procedures" className="mt-4 inline-block text-[#FF6600] font-bold hover:underline">
            ← Retour aux procédures
          </Link>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white font-['Manrope']">
      <Header />
      
      {/* Hero */}
      <section className="bg-black py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <img src={LOGO} alt="GIMO" className="w-12 h-12 sm:w-16 sm:h-16 object-contain flex-shrink-0" />
            <div className="flex items-start gap-3">
              <div className="w-1 h-12 bg-[#FF6600] flex-shrink-0 mt-1" />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{procedure.subcategory_flag}</span>
                  <span className="text-[#FF6600] text-xs font-bold uppercase tracking-widest">
                    {procedure.subcategory_name}
                  </span>
                </div>
                <h1 className="font-['Oswald'] text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight text-white leading-tight">
                  {procedure.title}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="h-1 bg-[#FF6600]" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back & Admin actions */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/procedures" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-[#FF6600] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour aux procédures
          </Link>
          
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                to={`/procedures/modifier/${procedure.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-zinc-100 text-zinc-700 hover:bg-[#FF6600] hover:text-white transition-colors"
              >
                <Edit className="w-3.5 h-3.5" /> Modifier
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> {deleting ? "..." : "Supprimer"}
              </button>
            </div>
          )}
        </div>
        
        {/* Cover image */}
        {procedure.image_url && (
          <div className="mb-8 overflow-hidden">
            <img
              src={procedure.image_url}
              alt={procedure.title}
              className="w-full max-h-[400px] object-cover"
            />
          </div>
        )}
        
        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 mb-8 pb-6 border-b border-zinc-200">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            {procedure.author_username || "Admin"}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {formatDate(procedure.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {procedure.views} vue{procedure.views !== 1 ? "s" : ""}
          </span>
        </div>
        
        {/* Content */}
        <article
          className="prose prose-lg max-w-none
            prose-headings:font-['Oswald'] prose-headings:uppercase prose-headings:tracking-tight
            prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
            prose-p:font-['Manrope'] prose-p:text-zinc-700 prose-p:leading-relaxed
            prose-a:text-[#FF6600] prose-a:no-underline hover:prose-a:underline
            prose-strong:text-black
            prose-img:rounded-lg prose-img:shadow-md
            prose-blockquote:border-l-[#FF6600] prose-blockquote:bg-zinc-50 prose-blockquote:py-2 prose-blockquote:px-4
            prose-ul:list-disc prose-ol:list-decimal
            prose-li:text-zinc-700"
          dangerouslySetInnerHTML={{ __html: procedure.content }}
        />
        
        {/* Back to list + Contact button */}
        <div className="mt-12 pt-8 border-t border-zinc-200 flex items-center justify-between flex-wrap gap-4">
          <Link
            to="/procedures"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voir toutes les procédures
          </Link>
          {user && (!procedure.author_id || procedure.author_id !== user?.id) && (
            <button
              onClick={() => setShowChat(true)}
              data-testid="contact-admin-btn"
              className="inline-flex items-center gap-2 bg-[#FF6600] text-white text-sm font-bold uppercase tracking-wider px-5 py-2.5 hover:bg-[#CC5200] transition-colors"
            >
              <MessageSquare className="w-4 h-4" /> Poser une question
            </button>
          )}
        </div>
      </main>

      {showChat && (
        <ChatPanel
          type="procedures"
          recipientId={adminContact?.id || procedure.author_id}
          recipientName={adminContact?.username || procedure.author_username || "Admin"}
          onClose={() => setShowChat(false)}
        />
      )}
      
      <Footer />
    </div>
  );
}
