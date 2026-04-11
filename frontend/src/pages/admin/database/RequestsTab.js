import { useState, useEffect, useCallback } from "react";
import api from "../../../lib/api";
import { toast } from "sonner";
import { Clock, Download, Loader2, Bell, UserCheck, UserX, Trash2 } from "lucide-react";
import { formatDate, Pagination, ConfirmModal } from "./SharedComponents";

const REQUEST_STATUSES = [
  { value: "", label: "Tous" },
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuve" },
  { value: "rejected", label: "Rejete" },
];

function getRoleLabel(role) {
  if (role === "auteur") return "Auteur";
  if (role === "agent") return "Agent immobilier";
  return role;
}

export function RequestsTab({ onCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [processing, setProcessing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    api.get("/admin/notifications", { params: { page, limit: 20, status: statusFilter || undefined } })
      .then(r => {
        setNotifications(r.data.notifications || []);
        setPendingCount(r.data.pending_count || 0);
        setPages(r.data.pages || 1);
        if (onCountChange) onCountChange(r.data.pending_count || 0);
      })
      .catch(err => {
        toast.error(err.response?.data?.detail || "Erreur lors du chargement des notifications");
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, onCountChange]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleAction = async (notifId, action) => {
    setProcessing(notifId);
    try {
      const res = await api.put(`/admin/notifications/${notifId}/action`, { action });
      toast.success(res.data.message);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      setPendingCount(prev => Math.max(0, prev - 1));
      if (onCountChange) onCountChange(Math.max(0, pendingCount - 1));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
      fetchNotifications();
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/notifications/${confirmDelete.id}`);
      toast.success("Demande supprimee");
      setNotifications(prev => prev.filter(n => n.id !== confirmDelete.id));
      if (confirmDelete.status === "pending") {
        setPendingCount(prev => Math.max(0, prev - 1));
        if (onCountChange) onCountChange(Math.max(0, pendingCount - 1));
      }
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get("/admin/export/role-requests", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "demandes_roles.csv"; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Erreur lors du telechargement"); }
  };

  return (
    <div>
      {pendingCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 px-4 py-3 mb-4 flex items-center gap-3" data-testid="pending-requests-banner">
          <Clock className="w-5 h-5 text-[#FF6600] flex-shrink-0" />
          <p className="text-sm font-['Manrope'] text-orange-800">
            <strong>{pendingCount}</strong> demande{pendingCount > 1 ? "s" : ""} en attente d'approbation
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          data-testid="requests-status-filter"
          className="px-3 py-2 border border-zinc-300 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
          {REQUEST_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={exportCSV} data-testid="requests-csv-btn"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors ml-auto">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n.id} data-testid={`notification-${n.id}`}
              className={`border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-colors ${
                n.status === "pending" ? "bg-orange-50 border-orange-200" :
                n.status === "approved" ? "bg-green-50 border-green-200" : "bg-zinc-50 border-zinc-200"
              }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    n.status === "pending" ? "bg-orange-100 text-orange-700" :
                    n.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {n.status === "pending" ? "En attente" : n.status === "approved" ? "Approuve" : "Rejete"}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                    {getRoleLabel(n.requested_role)}
                  </span>
                </div>
                <p className="font-semibold text-sm font-['Manrope']">{n.user_username}</p>
                <p className="text-xs text-zinc-500 font-['Manrope']">{n.user_email}</p>
                <p className="text-xs text-zinc-400 font-['Manrope'] mt-1">{formatDate(n.created_at)}</p>
                {n.processed_at && (
                  <p className="text-xs text-zinc-400 font-['Manrope']">Traite le: {formatDate(n.processed_at)}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {n.status === "pending" && (
                  <>
                    <button onClick={() => handleAction(n.id, "approve")} disabled={processing === n.id}
                      data-testid={`approve-btn-${n.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-green-700 transition-colors disabled:opacity-50">
                      {processing === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                      Approuver
                    </button>
                    <button onClick={() => handleAction(n.id, "reject")} disabled={processing === n.id}
                      data-testid={`reject-btn-${n.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-50">
                      {processing === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                      Rejeter
                    </button>
                  </>
                )}
                <button onClick={() => setConfirmDelete(n)} data-testid={`delete-request-btn-${n.id}`}
                  className="p-2 text-zinc-400 hover:text-red-600 transition-colors" title="Supprimer cette demande">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-12 text-zinc-400 font-['Manrope']">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>Aucune demande {statusFilter ? `avec le statut "${statusFilter}"` : ""}</p>
            </div>
          )}
        </div>
      )}

      <Pagination page={page} pages={pages} onPageChange={setPage} />
      <ConfirmModal open={!!confirmDelete} title="Supprimer la demande"
        message={`Supprimer la demande de "${confirmDelete?.user_username}" (${confirmDelete?.user_email}) ?`}
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} confirmText="Supprimer" danger />
    </div>
  );
}
