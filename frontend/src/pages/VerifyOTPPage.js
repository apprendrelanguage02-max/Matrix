import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle, ShieldCheck, ArrowLeft, RefreshCw } from "lucide-react";

export default function VerifyOTPPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [verifiedUser, setVerifiedUser] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate("/inscription");
      return;
    }
    sendOtp();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    setSendingOtp(true);
    setError(null);
    try {
      const res = await api.post("/auth/send-otp", { email });
      setOtpSent(true);
      setCooldown(60);
      setAttemptsLeft(5);
      if (!res.data.sent && res.data.dev_otp) {
        setDevOtp(res.data.dev_otp);
      } else {
        setDevOtp(null);
        toast.success(`Code envoye a ${email}`);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.includes("deja verifie")) {
        navigate("/connexion");
        toast.info("Votre email est deja verifie. Connectez-vous.");
        return;
      }
      setError(detail || "Erreur lors de l'envoi du code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleDigitChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    if (value && !/\d/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newDigits.join("");
    if (code.length === 6) {
      verifyOtp(code);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
      verifyOtp(pasted);
    }
  };

  const verifyOtp = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp: code });
      setSuccess(true);
      setVerifiedUser(res.data.user);
      login(res.data.token, res.data.user);
      toast.success("Email verifie avec succes !");

      setTimeout(() => {
        if (res.data.user.role === "admin") {
          navigate("/admin");
        } else if (res.data.user.status === "pending") {
          navigate("/profil");
        } else {
          navigate("/profil");
        }
      }, 2500);
    } catch (err) {
      const detail = err.response?.data?.detail || "Code incorrect.";
      setError(detail);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();

      const match = detail.match(/(\d+)\s*tentative/);
      if (match) setAttemptsLeft(parseInt(match[1]));
      if (err.response?.status === 429) setAttemptsLeft(0);
    } finally {
      setLoading(false);
    }
  };

  if (success && verifiedUser) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-['Manrope']">
        <div className="bg-black h-2" />
        <div className="h-1.5 bg-[#FF6600]" />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center py-16" data-testid="verification-success">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-[bounce_0.6s_ease-in-out]">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black mb-2">
              Compte verifie !
            </h1>
            <p className="text-sm text-zinc-500 mb-4">
              Bienvenue, <strong className="text-black">{verifiedUser.full_name || verifiedUser.username}</strong>
            </p>
            {verifiedUser.eligible_trusted_badge && (
              <div className="flex items-center gap-2 justify-center bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg mb-4">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-700">Votre profil est eligible a la verification de confiance</p>
              </div>
            )}
            {verifiedUser.status === "pending" && (
              <p className="text-xs text-amber-600 mb-4">
                Votre demande de role professionnel est en cours de validation.
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirection vers votre tableau de bord...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-['Manrope']">
      <div className="bg-black h-2" />
      <div className="h-1.5 bg-[#FF6600]" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <Link to="/" className="flex items-center gap-2 mb-8 group">
          <img src="/nimba-logo.png" alt="Matrix News" className="w-9 h-9 object-contain" />
          <span className="font-['Oswald'] text-2xl font-bold tracking-widest uppercase text-black group-hover:text-[#FF6600] transition-colors">
            Matrix News
          </span>
        </Link>

        <div className="w-full max-w-md">
          <div className="border border-zinc-200 bg-white p-6 sm:p-8" data-testid="verify-otp-container">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#FF6600]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-[#FF6600]" />
              </div>
              <div>
                <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight text-black">Verification</h1>
                <p className="text-sm text-zinc-500">
                  {otpSent ? `Code envoye a ${email}` : "Envoi du code en cours..."}
                </p>
              </div>
            </div>

            {/* Dev mode OTP display */}
            {devOtp && (
              <div className="bg-amber-50 border border-amber-300 px-4 py-3 mb-5" data-testid="dev-otp-display">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">
                  Mode developpement — Code de test :
                </p>
                <p className="text-3xl font-bold tracking-[0.5em] text-black font-mono">{devOtp}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-5" data-testid="otp-error">
                {error}
              </div>
            )}

            {/* OTP Input - 6 separate boxes */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
                Entrez le code a 6 chiffres
              </label>
              <div className="flex justify-center gap-2 sm:gap-3" data-testid="otp-input-group">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    data-testid={`otp-digit-${i}`}
                    className={`w-11 h-14 sm:w-14 sm:h-16 border-2 text-center text-xl sm:text-2xl font-bold font-mono focus:outline-none transition-all ${
                      digit
                        ? "border-[#FF6600] bg-[#FF6600]/5 text-black"
                        : "border-zinc-300 text-zinc-400 focus:border-[#FF6600]"
                    }`}
                  />
                ))}
              </div>
              {attemptsLeft < 5 && attemptsLeft > 0 && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  {attemptsLeft} tentative{attemptsLeft > 1 ? "s" : ""} restante{attemptsLeft > 1 ? "s" : ""}
                </p>
              )}
              {attemptsLeft === 0 && (
                <p className="text-xs text-red-600 text-center mt-2">
                  Aucune tentative restante. Demandez un nouveau code.
                </p>
              )}
            </div>

            {/* Verify button */}
            <button
              onClick={() => verifyOtp(digits.join(""))}
              disabled={loading || digits.join("").length < 6}
              data-testid="verify-otp-btn"
              className="w-full bg-[#FF6600] text-white font-bold uppercase tracking-wider py-3.5 hover:bg-[#CC5200] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verification...</> : "Verifier mon email"}
            </button>

            {/* Resend / Timer */}
            <div className="text-center mt-5">
              {sendingOtp ? (
                <p className="text-xs text-zinc-400 flex items-center justify-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Envoi du code...
                </p>
              ) : cooldown > 0 ? (
                <p className="text-xs text-zinc-400">
                  Renvoyer le code dans <span className="font-bold text-black">{cooldown}s</span>
                </p>
              ) : (
                <button onClick={sendOtp} data-testid="resend-otp-btn"
                  className="text-xs text-[#FF6600] hover:text-[#CC5200] font-bold flex items-center justify-center gap-1.5 mx-auto transition-colors">
                  <RefreshCw className="w-3 h-3" /> Renvoyer un nouveau code
                </button>
              )}
            </div>

            <div className="border-t border-zinc-200 mt-6 pt-4">
              <Link to="/inscription" className="text-sm text-zinc-400 hover:text-zinc-600 flex items-center gap-1 justify-center transition-colors">
                <ArrowLeft className="w-3 h-3" /> Modifier mes informations
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-400 mt-4">
            <Link to="/" className="hover:text-[#FF6600] transition-colors">&larr; Retour a l'accueil</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
