import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../../lib/api";
import { toast } from "sonner";
import { Search, Download, Loader2, Eye, Edit, Trash2 } from "lucide-react";
import { formatDate, Pagination, ConfirmModal } from "./SharedComponents";

const CATEGORIES = ["Actualite", "Politique", "Sport", "Technologie", "Economie"];

export function ArticlesTab() {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchArticles = useCallback(() => {
    setLoading(true);
    api.get("/admin/articles", { params: { page, limit: 20, search, category: categoryFilter } })
      .then(r => { setArticles(r.data.articles); setPages(r.data.pages); })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [page, search, categoryFilter]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const deleteArticle = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/articles/${confirmDelete.id}`);
      toast.success("Article supprime");
      setConfirmDelete(null);
      fetchArticles();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get("/admin/export/articles", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "articles.csv"; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Erreur lors du telechargement"); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher un article..."
            className="w-full pl-10 pr-4 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
        </div>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
          <option value="">Toutes categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                <th className="text-left px-3 py-3">Categorie</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">Auteur</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">Publie le</th>
                <th className="text-center px-3 py-3 hidden lg:table-cell">Vues</th>
                <th className="text-right px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {articles.map(a => (
                <tr key={a.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-3 font-semibold max-w-[200px] truncate">{a.title}</td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#FF6600]/10 text-[#FF6600] rounded">{a.category}</span>
                  </td>
                  <td className="px-3 py-3 text-zinc-600 hidden sm:table-cell">{a.author_username || "-"}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden md:table-cell">{formatDate(a.published_at)}</td>
                  <td className="px-3 py-3 text-center text-zinc-500 hidden lg:table-cell">{a.views}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/article/${a.id}`} className="p-1.5 text-zinc-500 hover:text-[#FF6600] transition-colors"><Eye className="w-4 h-4" /></Link>
                      <Link to={`/admin/modifier/${a.id}`} className="p-1.5 text-zinc-500 hover:text-blue-600 transition-colors"><Edit className="w-4 h-4" /></Link>
                      <button onClick={() => setConfirmDelete(a)} className="p-1.5 text-zinc-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-zinc-400">Aucun article trouve</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onPageChange={setPage} />
      <ConfirmModal open={!!confirmDelete} title="Supprimer l'article" message={`Supprimer "${confirmDelete?.title}" ?`}
        onConfirm={deleteArticle} onCancel={() => setConfirmDelete(null)} confirmText="Supprimer" danger />
    </div>
  );
}
