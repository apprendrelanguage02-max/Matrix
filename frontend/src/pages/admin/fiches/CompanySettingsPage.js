import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../../../components/Header";
import Footer from "../../../components/layout/Footer";
import api from "../../../lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Loader2, Building2, Upload, X
} from "lucide-react";

const CURRENCIES = ["GNF", "EUR", "USD", "CAD", "XOF", "GBP"];

export default function CompanySettingsPage() {
  const [form, setForm] = useState({
    company_name: "Matrix News",
    slogan: "Votre partenaire pour toutes vos demarches",
    signature_text: "Matrix News - Services Professionnels",
    footer_text: "Document genere automatiquement. Pour toute question, contactez-nous.",
    default_currency: "GNF",
    logo_url: "/nimba-logo.png",
    contact_email: "",
    contact_phone: "",
    primary_color: "#FF6600",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/company-settings");
        setForm(prev => ({ ...prev, ...data }));
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/company-settings", form);
      toast.success("Parametres sauvegardes");
    } catch { toast.error("Erreur sauvegarde"); }
    finally { setSaving(false); }
  };

  const uploadLogo = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = data.urls?.[0] || data.url;
      if (url) {
        setForm(f => ({ ...f, logo_url: url }));
        toast.success("Logo uploade");
      }
    } catch { toast.error("Erreur upload"); }
    finally { setUploading(false); }
  };

  const updateField = (field, val) => setForm(f => ({ ...f, [field]: val }));

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col" data-testid="company-settings-page">
      <Header />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/fiches" className="text-zinc-400 hover:text-[#FF6600] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-['Oswald'] text-2xl font-bold uppercase tracking-tight text-black">Parametres Entreprise</h1>
            <p className="text-sm text-zinc-500">Personnalisez l'identite de vos fiches PDF</p>
          </div>
          <button onClick={save} disabled={saving}
            className="bg-[#FF6600] text-white px-5 py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-[#e55b00] transition-colors flex items-center gap-2 disabled:opacity-50"
            data-testid="save-settings-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
        </div>

        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-white border border-zinc-200 p-6">
            <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF6600]" /> Logo
            </h2>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 border-2 border-dashed border-zinc-300 flex items-center justify-center bg-zinc-50 overflow-hidden">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Building2 className="w-8 h-8 text-zinc-300" />
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold uppercase px-4 py-2.5 cursor-pointer hover:bg-black transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Upload..." : "Changer le logo"}
                  <input type="file" accept="image/*" className="hidden" data-testid="upload-logo"
                    onChange={e => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); e.target.value = ""; }} />
                </label>
                <input value={form.logo_url} onChange={e => updateField("logo_url", e.target.value)}
                  placeholder="URL du logo"
                  className="w-full bg-white border border-zinc-200 text-xs px-3 py-2 text-zinc-500 focus:outline-none focus:border-[#FF6600]"
                  data-testid="logo-url-input" />
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="bg-white border border-zinc-200 p-6 space-y-4">
            <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF6600]" /> Identite
            </h2>
            <div>
              <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Nom de l'entreprise</label>
              <input value={form.company_name} onChange={e => updateField("company_name", e.target.value)}
                className="w-full bg-white border border-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:border-[#FF6600]"
                data-testid="company-name-input" />
            </div>
            <div>
              <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Slogan / Description</label>
              <input value={form.slogan} onChange={e => updateField("slogan", e.target.value)}
                className="w-full bg-white border border-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:border-[#FF6600]"
                data-testid="slogan-input" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Email de contact</label>
                <input value={form.contact_email} onChange={e => updateField("contact_email", e.target.value)}
                  type="email" placeholder="contact@matrixnews.org"
                  className="w-full bg-white border border-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:border-[#FF6600]"
                  data-testid="contact-email-input" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Telephone</label>
                <input value={form.contact_phone} onChange={e => updateField("contact_phone", e.target.value)}
                  placeholder="+224 600 000 000"
                  className="w-full bg-white border border-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:border-[#FF6600]"
                  data-testid="contact-phone-input" />
              </div>
            </div>
          </div>

          {/* PDF Settings */}
          <div className="bg-white border border-zinc-200 p-6 space-y-4">
            <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF6600]" /> Parametres PDF
            </h2>
            <div>
              <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Signature</label>
              <input value={form.signature_text} onChange={e => updateField("signature_text", e.target.value)}
                className="w-full bg-white border border-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:border-[#FF6600]"
                data-testid="signature-input" />
            </div>
            <div>
              <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Texte de pied de page</label>
              <textarea value={form.footer_text} onChange={e => updateField("footer_text", e.target.value)}
                rows={2}
                className="w-full bg-white border border-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:border-[#FF6600] resize-y"
                data-testid="footer-text-input" />
            </div>
            <div>
              <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Devise par defaut</label>
              <select value={form.default_currency} onChange={e => updateField("default_currency", e.target.value)}
                className="w-full bg-white border border-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:border-[#FF6600]"
                data-testid="default-currency-select">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white border border-zinc-200 p-6">
            <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Apercu en-tete PDF</h2>
            <div className="border border-zinc-200 p-6 text-center">
              {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-12 mx-auto mb-2" />}
              <p className="font-['Oswald'] text-lg font-bold text-black">{form.company_name}</p>
              <p className="text-xs text-zinc-400">{form.slogan}</p>
              <div className="h-0.5 bg-[#FF6600] mt-3" />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
