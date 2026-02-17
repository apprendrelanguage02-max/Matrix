import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import api from "../../lib/api";
import { toast } from "sonner";
import { formatPrice } from "../../components/immobilier/PropertyCard";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_CONFIG = {
  en_attente: { label: "En attente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  confirme:   { label: "Confirmé",   color: "bg-green-100 text-green-800",  icon: CheckCircle },
  annule:     { label: "Annulé",     color: "bg-red-100 text-red-800",     icon: XCircle },
};

const METHOD_LABELS = {
  orange_money: "Orange Money", mobile_money: "Mobile Money",
  paycard: "Paycard", carte_bancaire: "Carte Bancaire"
};

export default function PaymentsAdminPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = () => {
    api.get("/payments")
      .then(r => setPayments(r.data))
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayments(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/payments/${id}/status?status=${status}`);
      toast.success("Statut mis à jour.");
      fetchPayments();
    } catch (err) {
      toast.error("Erreur");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin" className="flex items-center gap-1 text-sm text-zinc-400 hover:text-[#FF6600] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight">Historique des paiements</h1>
        </div>

        {loading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#FF6600]" /></div>}

        {!loading && payments.length === 0 && (
          <p className="text-center text-zinc-400 py-20 font-['Oswald'] text-xl uppercase">Aucun paiement enregistré</p>
        )}

        {!loading && payments.length > 0 && (
          <div className="bg-white border border-zinc-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  {["Référence", "Propriété", "Utilisateur", "Montant", "Méthode", "Statut", "Date", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(pay => {
                  const conf = STATUS_CONFIG[pay.status] || STATUS_CONFIG.en_attente;
                  const Icon = conf.icon;
                  return (
                    <tr key={pay.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <span className="font-['Oswald'] font-bold text-xs text-[#FF6600] tracking-wider">{pay.reference}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/immobilier/${pay.property_id}`} className="text-black hover:text-[#FF6600] font-bold transition-colors">
                          {pay.property_title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{pay.user_email}</td>
                      <td className="px-4 py-3 font-bold text-black">{formatPrice(pay.amount, pay.currency)}</td>
                      <td className="px-4 py-3 text-zinc-500">{METHOD_LABELS[pay.method] || pay.method}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${conf.color}`}>
                          <Icon className="w-3 h-3" /> {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {new Date(pay.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        {pay.status === "en_attente" && (
                          <div className="flex gap-1">
                            <button onClick={() => updateStatus(pay.id, "confirme")}
                              className="text-xs bg-green-600 text-white px-2 py-1 hover:bg-green-700 transition-colors">
                              Confirmer
                            </button>
                            <button onClick={() => updateStatus(pay.id, "annule")}
                              className="text-xs bg-red-600 text-white px-2 py-1 hover:bg-red-700 transition-colors">
                              Annuler
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
