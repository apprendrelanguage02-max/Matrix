import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import Footer from "../../../components/layout/Footer";
import api from "../../../lib/api";
import { toast } from "sonner";
import {
  Plus, FileText, Trash2, Pencil, Download, Loader2,
  ArrowLeft, Clock, Search, Filter, Eye
} from "lucide-react";

const STATUS_MAP = {
  draft: { label: "Brouillon", cls: "bg-yellow-100 text-yellow-700" },
  published: { label: "Publie", cls: "bg-green-100 text-green-700" },
  archived: { label: "Archive", cls: "bg-zinc-200 text-zinc-600" },
};

export default function FichesListPage() {
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/fiches", { params: { status: statusFilter } });
      setFiches(data.fiches || []);
    } catch { toast.error("Erreur chargement des fiches"); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const deleteFiche = async (id) => {
    if (!window.confirm("Supprimer cette fiche ?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/fiches/${id}`);
      setFiches(f => f.filter(x => x.id !== id));
      toast.success("Fiche supprimee");
    } catch { toast.error("Erreur suppression"); }
    finally { setDeletingId(null); }
  };

  const downloadPdf = async (fiche) => {
    setDownloadingId(fiche.id);
    try {
      const { data } = await api.post(`/fiches/${fiche.id}/pdf`, {}, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `fiche_${fiche.title.replace(/\s+/g, "_").slice(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF telecharge");
    } catch { toast.error("Erreur generation PDF"); }
    finally { setDownloadingId(null); }
  };

  const filtered = fiches.filter(f =>
    !search || f.title?.toLowerCase().includes(search.toLowerCase()) ||
    f.country?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col" data-testid="fiches-list-page">
      <Header />
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/procedures" className="text-zinc-400 hover:text-[#FF6600] transition-colors" data-testid="back-to-procedures">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight text-black">Fiches de Procedure</h1>
            <p className="text-sm text-zinc-500">{filtered.length} fiche{filtered.length > 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => navigate("/admin/fiches/create")}
            className="bg-[#FF6600] text-white px-4 py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-[#e55b00] transition-colors flex items-center gap-2"
            data-testid="create-fiche-btn">
            <Plus className="w-4 h-4" /> Nouvelle fiche
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une fiche..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 text-sm focus:outline-none focus:border-[#FF6600]"
              data-testid="search-fiches" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:border-[#FF6600]"
            data-testid="filter-status">
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillons</option>
            <option value="published">Publies</option>
            <option value="archived">Archives</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white border border-zinc-200">
            <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">Aucune fiche de procedure</p>
            <button onClick={() => navigate("/admin/fiches/create")}
              className="mt-4 text-[#FF6600] font-bold text-sm hover:underline">
              Creer votre premiere fiche
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(f => (
              <div key={f.id} className="bg-white border border-zinc-200 p-4 hover:border-[#FF6600]/30 transition-colors" data-testid={`fiche-card-${f.id}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#FF6600]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[#FF6600]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm truncate">{f.title}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${STATUS_MAP[f.status]?.cls || STATUS_MAP.draft.cls}`}>
                        {STATUS_MAP[f.status]?.label || f.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      {f.country && <span>{f.country}</span>}
                      {f.category && <span>{f.category}</span>}
                      {f.estimated_delay && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{f.estimated_delay}</span>}
                      {f.updated_at && <span>Modifie: {new Date(f.updated_at).toLocaleDateString("fr-FR")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => navigate(`/admin/fiches/${f.id}/edit`)}
                      className="p-2 text-zinc-400 hover:text-[#FF6600] hover:bg-[#FF6600]/5 transition-colors" title="Modifier"
                      data-testid={`edit-fiche-${f.id}`}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => downloadPdf(f)} disabled={downloadingId === f.id}
                      className="p-2 text-zinc-400 hover:text-[#FF6600] hover:bg-[#FF6600]/5 transition-colors" title="Telecharger PDF"
                      data-testid={`download-fiche-${f.id}`}>
                      {downloadingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteFiche(f.id)} disabled={deletingId === f.id}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Supprimer"
                      data-testid={`delete-fiche-${f.id}`}>
                      {deletingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
