import { ChevronLeft, ChevronRight } from "lucide-react";

export function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatPrice(price, currency = "GNF") {
  if (currency === "GNF") return new Intl.NumberFormat("fr-FR").format(price) + " GNF";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(price);
}

export function StatCard({ icon: Icon, label, value, color }) {
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

export function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-4 pt-4 border-t border-zinc-200">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
        className="p-1.5 sm:p-2 border border-zinc-300 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs sm:text-sm font-['Manrope'] text-zinc-600 px-2 sm:px-3">Page {page} / {pages}</span>
      <button onClick={() => onPageChange(page + 1)} disabled={page >= pages}
        className="p-1.5 sm:p-2 border border-zinc-300 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmText = "Confirmer", danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md p-6 shadow-2xl">
        <h3 className="font-['Oswald'] text-xl font-bold uppercase mb-3">{title}</h3>
        <p className="text-sm text-zinc-600 font-['Manrope'] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-bold uppercase tracking-wider border border-zinc-300 hover:bg-zinc-100 transition-colors">Annuler</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-bold uppercase tracking-wider text-white transition-colors ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[#FF6600] hover:bg-[#CC5200]"}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
