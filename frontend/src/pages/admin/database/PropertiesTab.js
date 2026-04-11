import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../../lib/api";
import { toast } from "sonner";
import { Search, Download, Loader2, Eye, Edit, Trash2 } from "lucide-react";
import { formatPrice, Pagination, ConfirmModal } from "./SharedComponents";

const PROPERTY_TYPES = [
  { value: "", label: "Tous les types" },
  { value: "vente", label: "Vente" },
  { value: "achat", label: "Achat" },
  { value: "location", label: "Location" },
];

const PROPERTY_STATUSES = [
  { value: "", label: "Tous les statuts" },
  { value: "disponible", label: "Disponible" },
  { value: "reserve", label: "Reserve" },
  { value: "vendu", label: "Vendu" },
  { value: "loue", label: "Loue" },
];

export function PropertiesTab() {
  const [properties, setProperties] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchProperties = useCallback(() => {
    setLoading(true);
    api.get("/admin/properties", { params: { page, limit: 20, search, type: typeFilter, status: statusFilter } })
      .then(r => { setProperties(r.data.properties); setPages(r.data.pages); })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const updateStatus = async (prop, newStatus) => {
    try {
      await api.put(`/admin/properties/${prop.id}/status?status=${newStatus}`);
      toast.success("Statut mis a jour");
      fetchProperties();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const deleteProperty = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/properties/${confirmDelete.id}`);
      toast.success("Annonce supprimee");
      setConfirmDelete(null);
      fetchProperties();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get("/admin/export/properties", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "annonces.csv"; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Erreur lors du telechargement"); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher une annonce..."
            className="w-full pl-10 pr-4 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
          {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
          {PROPERTY_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-['Manrope']">
            <thead className="bg-zinc-100 text-xs uppercase tracking-wider text-zinc-600">
              <tr>
                <th className="text-left px-3 py-3">Titre</th>
                <th className="text-left px-3 py-3">Type</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">Prix</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">Ville</th>
                <th className="text-left px-3 py-3 hidden lg:table-cell">Agent</th>
                <th className="text-center px-3 py-3">Statut</th>
                <th className="text-right px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {properties.map(p => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-3 font-semibold max-w-[180px] truncate">{p.title}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                      p.type === "vente" ? "bg-[#FF6600]/10 text-[#FF6600]" :
                      p.type === "achat" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>{p.type}</span>
                  </td>
                  <td className="px-3 py-3 text-zinc-600 hidden sm:table-cell">{formatPrice(p.price, p.currency)}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden md:table-cell">{p.city}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden lg:table-cell">{p.author_username || "-"}</td>
                  <td className="px-3 py-3 text-center">
                    <select value={p.status} onChange={e => updateStatus(p, e.target.value)}
                      className={`text-[10px] font-bold uppercase px-2 py-1 border-0 rounded cursor-pointer ${
                        p.status === "disponible" ? "bg-green-100 text-green-700" :
                        p.status === "reserve" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                      }`}>
                      {PROPERTY_STATUSES.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/immobilier/${p.id}`} className="p-1.5 text-zinc-500 hover:text-[#FF6600] transition-colors"><Eye className="w-4 h-4" /></Link>
                      <Link to={`/immobilier/modifier/${p.id}`} className="p-1.5 text-zinc-500 hover:text-blue-600 transition-colors"><Edit className="w-4 h-4" /></Link>
                      <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-zinc-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {properties.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-zinc-400">Aucune annonce trouvee</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onPageChange={setPage} />
      <ConfirmModal open={!!confirmDelete} title="Supprimer l'annonce" message={`Supprimer "${confirmDelete?.title}" ?`}
        onConfirm={deleteProperty} onCancel={() => setConfirmDelete(null)} confirmText="Supprimer" danger />
    </div>
  );
}
