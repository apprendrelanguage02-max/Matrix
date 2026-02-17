import { useState } from "react";
import { X, CreditCard, Phone, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import api from "../../lib/api";
import { formatPrice } from "./PropertyCard";

const METHODS = [
  { id: "orange_money",    label: "Orange Money",      color: "bg-orange-500", icon: "📱" },
  { id: "mobile_money",   label: "Mobile Money",      color: "bg-yellow-500", icon: "📲" },
  { id: "paycard",        label: "Paycard",           color: "bg-blue-600",   icon: "💳" },
  { id: "carte_bancaire", label: "Carte Bancaire",    color: "bg-zinc-800",   icon: "🏦" },
];

export default function PaymentModal({ property, onClose }) {
  const [step, setStep] = useState(1); // 1=choose, 2=details, 3=success
  const [method, setMethod] = useState(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const selectedMethod = METHODS.find(m => m.id === method);

  const handlePay = async () => {
    setError("");
    if ((method === "orange_money" || method === "mobile_money") && phone.length < 8) {
      return setError("Veuillez saisir un numéro de téléphone valide.");
    }
    setLoading(true);
    try {
      const res = await api.post("/payments", {
        property_id: property.id,
        amount: property.price,
        currency: property.currency,
        method,
        phone,
      });
      setResult(res.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du paiement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white w-full max-w-md shadow-2xl" data-testid="payment-modal">
        {/* Header */}
        <div className="flex items-center justify-between bg-black px-5 py-4">
          <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-widest text-white">
            {step === 3 ? "Réservation confirmée" : "Réserver cette propriété"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Property summary */}
          {step < 3 && (
            <div className="bg-zinc-50 border border-zinc-200 p-3 mb-5">
              <p className="text-xs text-zinc-500 font-['Manrope'] uppercase tracking-wider mb-1">Propriété</p>
              <p className="font-['Oswald'] font-bold text-black text-sm">{property.title}</p>
              <p className="font-['Oswald'] text-2xl font-bold text-[#FF6600] mt-1">
                {formatPrice(property.price, property.currency)}
              </p>
            </div>
          )}

          {/* Step 1: Choose method */}
          {step === 1 && (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 font-['Manrope']">Moyen de paiement</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {METHODS.map(m => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`flex flex-col items-center gap-2 p-3 border-2 rounded transition-all font-['Manrope'] ${
                      method === m.id ? "border-[#FF6600] bg-orange-50" : "border-zinc-200 hover:border-zinc-400"
                    }`}>
                    <span className="text-2xl">{m.icon}</span>
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => method && setStep(2)} disabled={!method}
                className="w-full bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider py-3 hover:bg-[#CC5200] transition-colors disabled:opacity-40">
                Continuer
              </button>
            </>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{selectedMethod?.icon}</span>
                <p className="font-['Oswald'] font-bold text-lg">{selectedMethod?.label}</p>
              </div>

              {(method === "orange_money" || method === "mobile_money") && (
                <div className="mb-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2 font-['Manrope']">
                    Numéro de téléphone *
                  </label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+224 6XX XXX XXX" autoFocus
                    className="w-full border border-zinc-300 px-4 py-3 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]" />
                </div>
              )}

              {(method === "paycard" || method === "carte_bancaire") && (
                <div className="bg-blue-50 border border-blue-200 p-3 mb-4 rounded">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 font-['Manrope']">
                      Paiement simulé — aucune donnée bancaire n'est stockée. 
                      L'intégration réelle sera activée prochainement.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm font-['Manrope'] mb-3">{error}</p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-zinc-300 text-sm font-bold font-['Manrope'] uppercase py-3 hover:border-black transition-colors">
                  Retour
                </button>
                <button onClick={handlePay} disabled={loading}
                  className="flex-1 bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider py-3 hover:bg-[#CC5200] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Traitement..." : "Confirmer"}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Success */}
          {step === 3 && result && (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="font-['Oswald'] text-2xl font-bold text-black mb-2">Réservation effectuée !</h3>
              <p className="text-sm text-zinc-500 font-['Manrope'] mb-4">
                Votre demande de réservation a été envoyée. Le vendeur vous contactera sous peu.
              </p>
              <div className="bg-zinc-50 border border-zinc-200 p-4 mb-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-['Manrope']">Référence de transaction</p>
                <p className="font-['Oswald'] text-xl font-bold text-[#FF6600] tracking-widest">{result.reference}</p>
                <p className="text-xs text-zinc-400 mt-1 font-['Manrope']">Conservez cette référence</p>
              </div>
              <button onClick={onClose}
                className="w-full bg-black text-white font-bold font-['Manrope'] uppercase tracking-wider py-3 hover:bg-zinc-800 transition-colors">
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
