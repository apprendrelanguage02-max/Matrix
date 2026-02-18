import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import api from "../../lib/api";
import { toast } from "sonner";
import {
  Users, FileText, Home, CreditCard, Search, ChevronLeft, ChevronRight,
  Trash2, Eye, Ban, CheckCircle, Download, Loader2, Database, ArrowLeft,
  UserCog, Edit, RefreshCw
} from "lucide-react";

const TABS = [
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "articles", label: "Articles", icon: FileText },
  { id: "properties", label: "Annonces", icon: Home },
  { id: "payments", label: "Paiements", icon: CreditCard },
];

const ROLES = [
  { value: "", label: "Tous les rôles" },
  { value: "admin", label: "Admin" },
  { value: "auteur", label: "Auteur" },
  { value: "agent", label: "Agent immobilier" },
  { value: "visiteur", label: "Visiteur" },
];

const CATEGORIES = ["Actualité", "Politique", "Sport", "Technologie", "Économie"];
const PROPERTY_TYPES = [
  { value: "", label: "Tous les types" },
  { value: "vente", label: "Vente" },
  { value: "achat", label: "Achat" },
  { value: "location", label: "Location" },
];
const PROPERTY_STATUSES = [
  { value: "", label: "Tous les statuts" },
  { value: "disponible", label: "Disponible" },
  { value: "reserve", label: "Réservé" },
  { value: "vendu", label: "Vendu" },
  { value: "loue", label: "Loué" },
];
const PAYMENT_STATUSES = [
  { value: "", label: "Tous les statuts" },
  { value: "en_attente", label: "En attente" },
  { value: "confirme", label: "Confirmé" },
  { value: "annule", label: "Annulé" },
];
const PAYMENT_METHODS = [
  { value: "", label: "Toutes les méthodes" },
  { value: "orange_money", label: "Orange Money" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "paycard", label: "PayCard" },
  { value: "carte_bancaire", label: "Carte bancaire" },
];

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatPrice(price, currency = "GNF") {
  if (currency === "GNF") return new Intl.NumberFormat("fr-FR").format(price) + " GNF";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(price);
}

// ──────────────────────────────────────────────────────────────────────────────
// STATS CARD
// ──────────────────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white border border-zinc-200 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold font-['Oswald'] text-black">{value}</p>
        <p className="text-xs sm:text-sm text-zinc-500 font-['Manrope']">{label}</p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ──────────────────────────────────────────────────────────────────────────────
function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 pt-4 border-t border-zinc-200">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 sm:p-2 border border-zinc-300 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs sm:text-sm font-['Manrope'] text-zinc-600 px-2 sm:px-3">
        Page {page} / {pages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className="p-1.5 sm:p-2 border border-zinc-300 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CONFIRM MODAL
// ──────────────────────────────────────────────────────────────────────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmText = "Confirmer", danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md p-6 shadow-2xl">
        <h3 className="font-['Oswald'] text-xl font-bold uppercase mb-3">{title}</h3>
        <p className="text-sm text-zinc-600 font-['Manrope'] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-bold uppercase tracking-wider border border-zinc-300 hover:bg-zinc-100 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-bold uppercase tracking-wider text-white transition-colors ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[#FF6600] hover:bg-[#CC5200]"}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// USERS TAB
// ──────────────────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get("/admin/users", { params: { page, limit: 20, search, role: roleFilter } })
      .then(r => {
        setUsers(r.data.users);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };
  const handleRoleFilter = (e) => { setRoleFilter(e.target.value); setPage(1); };

  const toggleStatus = async (user) => {
    const newStatus = user.status === "actif" ? "suspendu" : "actif";
    try {
      await api.put(`/admin/users/${user.id}/status?status=${newStatus}`);
      toast.success(newStatus === "suspendu" ? "Utilisateur suspendu" : "Utilisateur activé");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const deleteUser = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/users/${confirmDelete.id}`);
      toast.success("Utilisateur supprimé");
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const exportCSV = () => {
    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/admin/export/users`, "_blank");
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Rechercher par nom ou email..."
            className="w-full pl-10 pr-4 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]"
          />
        </div>
        <select value={roleFilter} onChange={handleRoleFilter} className="px-3 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-['Manrope']">
            <thead className="bg-zinc-100 text-xs uppercase tracking-wider text-zinc-600">
              <tr>
                <th className="text-left px-3 py-3">Nom</th>
                <th className="text-left px-3 py-3">Email</th>
                <th className="text-left px-3 py-3">Rôle</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">Téléphone</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">Pays</th>
                <th className="text-left px-3 py-3 hidden lg:table-cell">Inscrit le</th>
                <th className="text-center px-3 py-3">Statut</th>
                <th className="text-right px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-3 font-semibold">{u.username}</td>
                  <td className="px-3 py-3 text-zinc-600">{u.email}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                      u.role === "admin" ? "bg-purple-100 text-purple-700" :
                      u.role === "auteur" ? "bg-blue-100 text-blue-700" :
                      u.role === "agent" ? "bg-green-100 text-green-700" :
                      "bg-zinc-100 text-zinc-600"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-zinc-500 hidden sm:table-cell">{u.phone || "-"}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden md:table-cell">{u.country || "-"}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden lg:table-cell">{formatDate(u.created_at)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${u.status === "actif" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.status || "actif"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleStatus(u)} title={u.status === "actif" ? "Suspendre" : "Activer"} className="p-1.5 text-zinc-500 hover:text-[#FF6600] transition-colors">
                        {u.status === "actif" ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setConfirmDelete(u)} title="Supprimer" className="p-1.5 text-zinc-500 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-zinc-400">Aucun utilisateur trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onPageChange={setPage} />

      <ConfirmModal
        open={!!confirmDelete}
        title="Supprimer l'utilisateur"
        message={`Êtes-vous sûr de vouloir supprimer "${confirmDelete?.username}" ? Cette action supprimera également tous ses articles, annonces et données associées.`}
        onConfirm={deleteUser}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Supprimer"
        danger
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ARTICLES TAB
// ──────────────────────────────────────────────────────────────────────────────
function ArticlesTab() {
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
      .then(r => {
        setArticles(r.data.articles);
        setPages(r.data.pages);
      })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [page, search, categoryFilter]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const deleteArticle = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/articles/${confirmDelete.id}`);
      toast.success("Article supprimé");
      setConfirmDelete(null);
      fetchArticles();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const exportCSV = () => {
    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/admin/export/articles`, "_blank");
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher un article..." className="w-full pl-10 pr-4 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
        </div>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
          <option value="">Toutes catégories</option>
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
                <th className="text-left px-3 py-3">Catégorie</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">Auteur</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">Publié le</th>
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
              {articles.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-zinc-400">Aucun article trouvé</td></tr>}
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

// ──────────────────────────────────────────────────────────────────────────────
// PROPERTIES TAB
// ──────────────────────────────────────────────────────────────────────────────
function PropertiesTab() {
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
      .then(r => {
        setProperties(r.data.properties);
        setPages(r.data.pages);
      })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const updateStatus = async (prop, newStatus) => {
    try {
      await api.put(`/admin/properties/${prop.id}/status?status=${newStatus}`);
      toast.success("Statut mis à jour");
      fetchProperties();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const deleteProperty = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/properties/${confirmDelete.id}`);
      toast.success("Annonce supprimée");
      setConfirmDelete(null);
      fetchProperties();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const exportCSV = () => {
    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/admin/export/properties`, "_blank");
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher une annonce..." className="w-full pl-10 pr-4 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
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
                      p.type === "achat" ? "bg-green-100 text-green-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{p.type}</span>
                  </td>
                  <td className="px-3 py-3 text-zinc-600 hidden sm:table-cell">{formatPrice(p.price, p.currency)}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden md:table-cell">{p.city}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden lg:table-cell">{p.author_username || "-"}</td>
                  <td className="px-3 py-3 text-center">
                    <select value={p.status} onChange={e => updateStatus(p, e.target.value)}
                      className={`text-[10px] font-bold uppercase px-2 py-1 border-0 rounded cursor-pointer ${
                        p.status === "disponible" ? "bg-green-100 text-green-700" :
                        p.status === "reserve" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
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
              {properties.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-zinc-400">Aucune annonce trouvée</td></tr>}
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

// ──────────────────────────────────────────────────────────────────────────────
// PAYMENTS TAB
// ──────────────────────────────────────────────────────────────────────────────
function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchPayments = useCallback(() => {
    setLoading(true);
    api.get("/admin/payments", { params: { page, limit: 20, status: statusFilter, method: methodFilter } })
      .then(r => {
        setPayments(r.data.payments);
        setPages(r.data.pages);
      })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [page, statusFilter, methodFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const updatePaymentStatus = async (payment, newStatus) => {
    try {
      await api.put(`/payments/${payment.id}/status?status=${newStatus}`);
      toast.success("Statut mis à jour");
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const deletePayment = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/payments/${confirmDelete.id}`);
      toast.success("Paiement supprimé");
      setConfirmDelete(null);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const exportCSV = () => {
    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/admin/export/payments`, "_blank");
  };

  const getMethodLabel = (m) => {
    const found = PAYMENT_METHODS.find(pm => pm.value === m);
    return found ? found.label : m;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
          {PAYMENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
          {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors ml-auto">
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
                <th className="text-left px-3 py-3">Référence</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">Propriété</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">Client</th>
                <th className="text-left px-3 py-3">Montant</th>
                <th className="text-left px-3 py-3 hidden lg:table-cell">Méthode</th>
                <th className="text-center px-3 py-3">Statut</th>
                <th className="text-left px-3 py-3 hidden xl:table-cell">Date</th>
                <th className="text-right px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-3 font-mono text-xs font-semibold">{p.reference}</td>
                  <td className="px-3 py-3 text-zinc-600 max-w-[150px] truncate hidden sm:table-cell">{p.property_title}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden md:table-cell">{p.user_email}</td>
                  <td className="px-3 py-3 font-semibold text-[#FF6600]">{formatPrice(p.amount, p.currency)}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden lg:table-cell">{getMethodLabel(p.method)}</td>
                  <td className="px-3 py-3 text-center">
                    <select value={p.status} onChange={e => updatePaymentStatus(p, e.target.value)}
                      className={`text-[10px] font-bold uppercase px-2 py-1 border-0 rounded cursor-pointer ${
                        p.status === "confirme" ? "bg-green-100 text-green-700" :
                        p.status === "annule" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                      {PAYMENT_STATUSES.filter(s => s.value).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-3 text-zinc-500 hidden xl:table-cell">{formatDate(p.created_at)}</td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-zinc-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-zinc-400">Aucun paiement trouvé</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onPageChange={setPage} />

      <ConfirmModal open={!!confirmDelete} title="Supprimer le paiement" message={`Supprimer le paiement "${confirmDelete?.reference}" ?`}
        onConfirm={deletePayment} onCancel={() => setConfirmDelete(null)} confirmText="Supprimer" danger />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────────────────
export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState("users");
  const [stats, setStats] = useState({ total_users: 0, total_articles: 0, total_properties: 0, total_payments: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    api.get("/admin/stats")
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  const refreshStats = () => {
    setLoadingStats(true);
    api.get("/admin/stats")
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />

      {/* Hero */}
      <section className="bg-black py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FF6600] rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <p className="text-[#FF6600] text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">Administration</p>
              <h1 className="font-['Oswald'] text-2xl sm:text-3xl md:text-4xl font-bold uppercase tracking-tight text-white">
                Base de données
              </h1>
            </div>
          </div>
        </div>
      </section>
      <div className="h-1 sm:h-1.5 bg-[#FF6600]" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Back link */}
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#FF6600] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour au dashboard
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard icon={Users} label="Utilisateurs" value={loadingStats ? "-" : stats.total_users} color="bg-purple-600" />
          <StatCard icon={FileText} label="Articles" value={loadingStats ? "-" : stats.total_articles} color="bg-blue-600" />
          <StatCard icon={Home} label="Annonces" value={loadingStats ? "-" : stats.total_properties} color="bg-green-600" />
          <StatCard icon={CreditCard} label="Paiements" value={loadingStats ? "-" : stats.total_payments} color="bg-[#FF6600]" />
        </div>

        {/* Tabs */}
        <div className="bg-white border border-zinc-200 mb-6">
          <div className="flex border-b border-zinc-200 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-[#FF6600] text-[#FF6600]"
                    : "border-transparent text-zinc-500 hover:text-black"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            <button onClick={refreshStats} className="ml-auto px-4 py-3 text-zinc-400 hover:text-[#FF6600] transition-colors" title="Rafraîchir">
              <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === "users" && <UsersTab />}
            {activeTab === "articles" && <ArticlesTab />}
            {activeTab === "properties" && <PropertiesTab />}
            {activeTab === "payments" && <PaymentsTab />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
