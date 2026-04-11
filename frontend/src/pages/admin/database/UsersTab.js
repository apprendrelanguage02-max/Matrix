import { useState, useEffect, useCallback } from "react";
import api from "../../../lib/api";
import { toast } from "sonner";
import { Search, Download, Loader2, Ban, CheckCircle, Trash2 } from "lucide-react";
import { formatDate, Pagination, ConfirmModal } from "./SharedComponents";

const ROLES = [
  { value: "", label: "Tous les roles" },
  { value: "admin", label: "Admin" },
  { value: "auteur", label: "Auteur" },
  { value: "agent", label: "Agent immobilier" },
  { value: "visiteur", label: "Visiteur" },
];

export function UsersTab() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get("/admin/users", { params: { page, limit: 20, search, role: roleFilter } })
      .then(r => { setUsers(r.data.users); setPages(r.data.pages); })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleStatus = async (user) => {
    const newStatus = user.status === "actif" ? "suspendu" : "actif";
    try {
      await api.put(`/admin/users/${user.id}/status?status=${newStatus}`);
      toast.success(newStatus === "suspendu" ? "Utilisateur suspendu" : "Utilisateur active");
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const deleteUser = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/users/${confirmDelete.id}`);
      toast.success("Utilisateur supprime");
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get("/admin/export/users", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "utilisateurs.csv"; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Erreur lors du telechargement"); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom ou email..."
            className="w-full pl-10 pr-4 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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
                <th className="text-left px-3 py-3">Nom</th>
                <th className="text-left px-3 py-3">Email</th>
                <th className="text-left px-3 py-3">Role</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">Telephone</th>
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
                      u.role === "agent" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-3 py-3 text-zinc-500 hidden sm:table-cell">{u.phone || "-"}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden md:table-cell">{u.country || "-"}</td>
                  <td className="px-3 py-3 text-zinc-500 hidden lg:table-cell">{formatDate(u.created_at)}</td>
                  <td className="px-3 py-3 text-center">
                    <span data-testid={`user-status-badge-${u.id}`} className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                      u.status === "actif" ? "bg-green-100 text-green-700" :
                      u.status === "suspendu" ? "bg-red-100 text-red-700" :
                      u.status === "pending_verification" ? "bg-yellow-100 text-yellow-700" : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {u.status === "pending_verification" ? "En attente" : u.status || "actif"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleStatus(u)} title={u.status === "actif" ? "Suspendre" : "Activer"}
                        className="p-1.5 text-zinc-500 hover:text-[#FF6600] transition-colors">
                        {u.status === "actif" ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setConfirmDelete(u)} title="Supprimer"
                        className="p-1.5 text-zinc-500 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-zinc-400">Aucun utilisateur trouve</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onPageChange={setPage} />
      <ConfirmModal open={!!confirmDelete} title="Supprimer l'utilisateur"
        message={`Etes-vous sur de vouloir supprimer "${confirmDelete?.username}" ? Cette action supprimera egalement tous ses articles, annonces et donnees associees.`}
        onConfirm={deleteUser} onCancel={() => setConfirmDelete(null)} confirmText="Supprimer" danger />
    </div>
  );
}
