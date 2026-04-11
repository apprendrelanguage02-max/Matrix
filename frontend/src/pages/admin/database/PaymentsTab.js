import { useState, useEffect, useCallback } from "react";
import api from "../../../lib/api";
import { toast } from "sonner";
import { Download, Loader2, Trash2 } from "lucide-react";
import { formatDate, formatPrice, Pagination, ConfirmModal } from "./SharedComponents";

const PAYMENT_STATUSES = [
  { value: "", label: "Tous les statuts" },
  { value: "en_attente", label: "En attente" },
  { value: "confirme", label: "Confirme" },
  { value: "annule", label: "Annule" },
];

const PAYMENT_METHODS = [
  { value: "", label: "Toutes les methodes" },
  { value: "orange_money", label: "Orange Money" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "paycard", label: "PayCard" },
  { value: "carte_bancaire", label: "Carte bancaire" },
];

export function PaymentsTab() {
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
      .then(r => { setPayments(r.data.payments); setPages(r.data.pages); })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [page, statusFilter, methodFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const updatePaymentStatus = async (payment, newStatus) => {
    try {
      await api.put(`/payments/${payment.id}/status?status=${newStatus}`);
      toast.success("Statut mis a jour");
      fetchPayments();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const deletePayment = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/payments/${confirmDelete.id}`);
      toast.success("Paiement supprime");
      setConfirmDelete(null);
      fetchPayments();
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur"); }
  };

  const exportCSV = async () => {
    try {
      const res = await api.get("/admin/export/payments", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "paiements.csv"; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Erreur lors du telechargement"); }
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
                <th className="text-left px-3 py-3">Reference</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">Propriete</th>
                <th className="text-left px-3 py-3 hidden md:table-cell">Client</th>
                <th className="text-left px-3 py-3">Montant</th>
                <th className="text-left px-3 py-3 hidden lg:table-cell">Methode</th>
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
                        p.status === "annule" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
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
              {payments.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-zinc-400">Aucun paiement trouve</td></tr>}
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
