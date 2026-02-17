import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { toast } from "sonner";
import { Loader2, Upload, X, ArrowLeft, Plus, Image as ImageIcon } from "lucide-react";

const CITIES = ["Conakry", "Kindia", "Labé", "Kankan", "Boké", "Mamou", "Faranah", "N'Zérékoré", "Autre"];

function Field({ label, name, value, onChange, type = "text", placeholder, required, hint }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5 font-['Manrope']">
        {label}{required && <span className="text-[#FF6600] ml-0.5">*</span>}
      </label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        required={required}
        className="w-full border border-zinc-300 px-3 py-2.5 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors" />
      {hint && <p className="text-xs text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function PropertyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "", type: "vente", price: "", currency: "GNF",
    description: "", city: "Conakry", neighborhood: "", address: "",
    latitude: "", longitude: "",
    seller_name: user?.username || "", seller_phone: "", seller_email: user?.email || "", seller_whatsapp: "",
    images: [], video_url: "", status: "disponible",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/properties/${id}`)
        .then(r => {
          const p = r.data;
          setForm({ ...p, price: String(p.price), latitude: p.latitude || "", longitude: p.longitude || "" });
        })
        .catch(() => { toast.error("Annonce introuvable"); navigate("/immobilier"); });
    }
  }, [id]); // eslint-disable-line

  const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (form.images.length + files.length > 10) return toast.error("Maximum 10 photos.");
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        urls.push(res.data.url);
      }
      setForm(f => ({ ...f, images: [...f.images, ...urls] }));
      toast.success(`${urls.length} photo(s) ajoutée(s)`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (idx) => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.city || !form.seller_name || !form.seller_phone) {
      return toast.error("Remplissez tous les champs obligatoires.");
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        description: form.description || "Aucune description.",
      };
      if (isEdit) {
        await api.put(`/properties/${id}`, payload);
        toast.success("Annonce mise à jour !");
      } else {
        const res = await api.post("/properties", payload);
        toast.success("Annonce publiée !");
        navigate(`/immobilier/${res.data.id}`);
        return;
      }
      navigate(`/immobilier/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black mb-8">
          {isEdit ? "Modifier l'annonce" : "Publier une annonce"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Informations */}
          <div className="bg-white border border-zinc-200 p-6">
            <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight mb-5 pb-3 border-b border-zinc-100">Informations principales</h2>
            <div className="space-y-4">
              <Field label="Titre" name="title" value={form.title} onChange={set} required placeholder="Ex: Villa 4 chambres à Conakry" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Type <span className="text-[#FF6600]">*</span></label>
                  <select name="type" value={form.type} onChange={set}
                    className="w-full border border-zinc-300 px-3 py-2.5 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
                    <option value="vente">Vente</option>
                    <option value="achat">Achat</option>
                    <option value="location">Location</option>
                  </select>
                </div>
                {isEdit && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Statut</label>
                    <select name="status" value={form.status} onChange={set}
                      className="w-full border border-zinc-300 px-3 py-2.5 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
                      <option value="disponible">Disponible</option>
                      <option value="reserve">Réservé</option>
                      <option value="vendu">Vendu</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Prix" name="price" value={form.price} onChange={set} type="number" required placeholder="Ex: 500000000" />
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Devise</label>
                  <select name="currency" value={form.currency} onChange={set}
                    className="w-full border border-zinc-300 px-3 py-2.5 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
                    <option value="GNF">GNF — Franc guinéen</option>
                    <option value="USD">USD — Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Description</label>
                <textarea name="description" value={form.description} onChange={set} rows={5}
                  placeholder="Décrivez la propriété en détail..."
                  className="w-full border border-zinc-300 px-3 py-2.5 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600] resize-none" />
              </div>
            </div>
          </div>

          {/* Section 2: Localisation */}
          <div className="bg-white border border-zinc-200 p-6">
            <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight mb-5 pb-3 border-b border-zinc-100">Localisation</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Ville <span className="text-[#FF6600]">*</span></label>
                  <select name="city" value={form.city} onChange={set}
                    className="w-full border border-zinc-300 px-3 py-2.5 text-sm font-['Manrope'] focus:outline-none focus:border-[#FF6600]">
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <Field label="Quartier" name="neighborhood" value={form.neighborhood} onChange={set} placeholder="Ex: Kipé, Ratoma..." />
              </div>
              <Field label="Adresse complète" name="address" value={form.address} onChange={set} placeholder="Ex: Av. de la République, Imm. 12" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude GPS" name="latitude" value={form.latitude} onChange={set} type="number" placeholder="Ex: 9.5370" hint="Optionnel" />
                <Field label="Longitude GPS" name="longitude" value={form.longitude} onChange={set} type="number" placeholder="Ex: -13.6785" hint="Optionnel" />
              </div>
            </div>
          </div>

          {/* Section 3: Contact */}
          <div className="bg-white border border-zinc-200 p-6">
            <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight mb-5 pb-3 border-b border-zinc-100">Informations contact</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nom" name="seller_name" value={form.seller_name} onChange={set} required placeholder="Votre nom complet" />
                <Field label="Téléphone" name="seller_phone" value={form.seller_phone} onChange={set} required placeholder="+224 6XX XXX XXX" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" name="seller_email" value={form.seller_email} onChange={set} type="email" placeholder="exemple@email.com" />
                <Field label="WhatsApp" name="seller_whatsapp" value={form.seller_whatsapp} onChange={set} placeholder="+224 6XX XXX XXX" hint="Optionnel" />
              </div>
            </div>
          </div>

          {/* Section 4: Médias */}
          <div className="bg-white border border-zinc-200 p-6">
            <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight mb-5 pb-3 border-b border-zinc-100">Photos et vidéo</h2>
            <p className="text-xs text-zinc-400 mb-4">JPG, PNG, WEBP · max 5 Mo par photo · 10 photos max</p>

            {/* Image grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
              {form.images.map((url, i) => (
                <div key={i} className="relative aspect-square bg-zinc-100 border border-zinc-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700">
                    <X className="w-3 h-3" />
                  </button>
                  {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-[#FF6600] text-white text-[9px] text-center font-bold py-0.5">Photo principale</span>}
                </div>
              ))}
              {form.images.length < 10 && (
                <label className={`aspect-square border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF6600] transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
                  {uploading ? <Loader2 className="w-5 h-5 text-[#FF6600] animate-spin" /> : <Plus className="w-5 h-5 text-zinc-400" />}
                  <span className="text-xs text-zinc-400 mt-1">{uploading ? "Envoi..." : "Ajouter"}</span>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                    disabled={uploading} onChange={handleImageUpload} />
                </label>
              )}
            </div>

            <Field label="URL Vidéo (optionnel)" name="video_url" value={form.video_url} onChange={set}
              placeholder="https://... (lien direct vers la vidéo)" hint="Vidéo MP4 ou WebM directement uploadée" />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving || uploading}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider py-3 hover:bg-[#CC5200] transition-colors disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Sauvegarde..." : isEdit ? "Mettre à jour" : "Publier l'annonce"}
            </button>
            <button type="button" onClick={() => navigate(-1)}
              className="px-6 py-3 border border-zinc-300 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:border-black hover:text-black transition-colors">
              Annuler
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
