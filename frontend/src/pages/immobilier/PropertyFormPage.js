import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { toast } from "sonner";
import {
  Upload, X, ArrowLeft, Plus, Camera, Video, MapPin,
  Home, DollarSign, Phone, User, FileText, Check, Loader2,
  Save, Eye, ChevronDown, ChevronUp, Star, GripVertical, Info
} from "lucide-react";

const MapWithPin = lazy(() => import("../../components/immobilier/MapWithPin"));

// ─── Constants ──────────────────────────────────────────────────────────────────
const GNF_TO_USD = 1 / 8600;
const GNF_TO_EUR = 1 / 9300;

const CITIES = ["Conakry", "Kindia", "Labe", "Kankan", "Boke", "Mamou", "Faranah", "N'Zerekore", "Siguiri", "Kissidougou", "Autre"];
const COMMUNES = ["Kaloum", "Dixinn", "Matam", "Ratoma", "Matoto", "Sonfonia", "Autre"];
const CATEGORIES = [
  { value: "maison", label: "Maison" }, { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" }, { value: "studio", label: "Studio" },
  { value: "immeuble", label: "Immeuble" }, { value: "terrain", label: "Terrain" },
  { value: "bureau", label: "Bureau" }, { value: "magasin", label: "Magasin" },
  { value: "entrepot", label: "Entrepot" }, { value: "duplex", label: "Duplex" },
  { value: "autre", label: "Autre" },
];
const OPERATIONS = [
  { value: "vente", label: "Vente" }, { value: "location", label: "Location" },
  { value: "location_meublee", label: "Location meublee" },
  { value: "location_non_meublee", label: "Location non meublee" },
  { value: "colocation", label: "Colocation" }, { value: "bail_commercial", label: "Bail commercial" },
];

const EQUIPMENT = {
  "Equipements exterieurs": [
    "Piscine", "Garage", "Jardin", "Balcon", "Terrasse", "Cour",
    "Parking", "Cloture", "Portail", "Dependance", "Forage", "Reservoir d'eau"
  ],
  "Equipements interieurs": [
    "Climatisation", "Refrigerateur", "Television", "Four", "Micro-ondes",
    "Cuisiniere", "Lave-linge", "Lave-vaisselle", "Chauffe-eau",
    "Dressing", "Meuble", "Wi-Fi / Internet"
  ],
  "Securite": [
    "Gardiennage", "Camera de surveillance", "Securite 24H/24",
    "Interphone", "Alarme", "Portail electrique"
  ],
  "Confort / Options": [
    "Groupe electrogene", "Panneaux solaires", "Ascenseur",
    "Vue mer", "Vue montagne", "Acces goudronne",
    "Proche route principale", "Animaux acceptes"
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children, id }) {
  return (
    <div className="bg-white border border-zinc-200 shadow-sm rounded-lg overflow-hidden" id={id}>
      <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center gap-2">
        {icon}
        <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
      {children}{required && <span className="text-[#F97316] ml-0.5">*</span>}
    </label>
  );
}

function Input({ label, required, hint, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <Label required={required}>{label}</Label>}
      <input {...props}
        className="w-full border border-zinc-200 rounded-md px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/20 transition-colors bg-white placeholder:text-zinc-400" />
      {hint && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

function Select({ label, required, children, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <Label required={required}>{label}</Label>}
      <select {...props}
        className="w-full border border-zinc-200 rounded-md px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/20 transition-colors bg-white">
        {children}
      </select>
    </div>
  );
}

function NumInput({ label, value, onChange, min = 0, className = "" }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="flex items-center border border-zinc-200 rounded-md overflow-hidden">
        <button type="button" onClick={() => onChange(Math.max(min, (value || 0) - 1))}
          className="px-3 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 transition-colors border-r border-zinc-200">-</button>
        <span className="flex-1 text-center text-sm font-medium text-zinc-900 py-2.5" data-testid={`num-${label}`}>{value || 0}</span>
        <button type="button" onClick={() => onChange((value || 0) + 1)}
          className="px-3 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 transition-colors border-l border-zinc-200">+</button>
      </div>
    </div>
  );
}

function formatPrice(val) {
  if (!val) return "";
  return Number(val).toLocaleString("fr-FR");
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function PropertyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "", type: "vente", price: "", currency: "GNF",
    description: "", city: "Conakry", neighborhood: "", address: "",
    latitude: "9.5370", longitude: "-13.6785",
    seller_name: user?.username || "", seller_phone: "", seller_email: user?.email || "", seller_whatsapp: "",
    images: [], video_url: "", status: "disponible",
    property_category: "villa", bedrooms: 0, bathrooms: 0, surface_area: "",
    salons: 0, kitchens: 0, toilets: 0, floors: 0, year_built: "",
    commune: "", landmarks: "", equipment: [],
    show_usd: true, show_eur: true,
    hide_email: false, show_phone: true, whatsapp_direct: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [mainImageIdx, setMainImageIdx] = useState(0);
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/properties/${id}`).then(r => {
      const p = r.data;
      setForm({
        title: p.title || "", type: p.type || "vente", price: String(p.price || ""),
        currency: p.currency || "GNF", description: p.description || "",
        city: p.city || "Conakry", neighborhood: p.neighborhood || "",
        address: p.address || "", latitude: String(p.latitude || "9.5370"),
        longitude: String(p.longitude || "-13.6785"),
        seller_name: p.seller_name || "", seller_phone: p.seller_phone || "",
        seller_email: p.seller_email || "", seller_whatsapp: p.seller_whatsapp || "",
        images: p.images || [], video_url: p.video_url || "", status: p.status || "disponible",
        property_category: p.property_category || "autre",
        bedrooms: p.bedrooms || 0, bathrooms: p.bathrooms || 0,
        surface_area: String(p.surface_area || ""),
        salons: p.salons || 0, kitchens: p.kitchens || 0, toilets: p.toilets || 0,
        floors: p.floors || 0, year_built: p.year_built || "",
        commune: p.commune || "", landmarks: p.landmarks || "",
        equipment: p.equipment || [],
        show_usd: p.show_usd !== false, show_eur: p.show_eur !== false,
        hide_email: p.hide_email || false, show_phone: p.show_phone !== false,
        whatsapp_direct: p.whatsapp_direct || false,
      });
    }).catch(() => { toast.error("Annonce introuvable"); navigate("/immobilier"); });
  }, [id, isEdit, navigate]);

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  };

  const toggleEquip = (item) => {
    setForm(f => ({
      ...f,
      equipment: f.equipment.includes(item)
        ? f.equipment.filter(e => e !== item)
        : [...f.equipment, item]
    }));
  };

  // ─── Image Upload ─────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (form.images.length + files.length > 10) return toast.error("Maximum 10 photos");
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const fd = new FormData(); fd.append("file", file);
        const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        urls.push(res.data.url);
      }
      setForm(f => ({ ...f, images: [...f.images, ...urls] }));
      toast.success(`${urls.length} photo(s) ajoutee(s)`);
    } catch { toast.error("Erreur upload"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const removeImage = (idx) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
    if (mainImageIdx >= form.images.length - 1) setMainImageIdx(0);
  };

  const setAsMain = (idx) => {
    setForm(f => {
      const imgs = [...f.images];
      const [main] = imgs.splice(idx, 1);
      imgs.unshift(main);
      return { ...f, images: imgs };
    });
    setMainImageIdx(0);
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setForm(f => {
      const imgs = [...f.images];
      const [moved] = imgs.splice(dragIdx, 1);
      imgs.splice(idx, 0, moved);
      return { ...f, images: imgs };
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // ─── Map callback ─────────────────────────────────────────────────────
  const handleMapClick = useCallback((lat, lng) => {
    set("latitude", String(lat.toFixed(6)));
    set("longitude", String(lng.toFixed(6)));
  }, []);

  // ─── Price conversion ─────────────────────────────────────────────────
  const priceNum = parseFloat(form.price) || 0;
  const priceUSD = Math.round(priceNum * GNF_TO_USD);
  const priceEUR = Math.round(priceNum * GNF_TO_EUR);

  // ─── Validation ───────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Le titre est obligatoire";
    if (!form.price || priceNum <= 0) e.price = "Le prix est obligatoire";
    if (!form.surface_area) e.surface_area = "La surface est obligatoire";
    if (!form.city) e.city = "La ville est obligatoire";
    if (!form.description.trim()) e.description = "La description est obligatoire";
    if (!form.seller_name.trim()) e.seller_name = "Le nom est obligatoire";
    if (!form.seller_phone.trim()) e.seller_phone = "Le telephone est obligatoire";
    if (form.images.length === 0) e.images = "Ajoutez au moins 1 photo";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Veuillez corriger les erreurs du formulaire");
      const firstKey = Object.keys(e)[0];
      document.querySelector(`[data-field="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(e).length === 0;
  };

  // ─── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (asDraft = false) => {
    if (!asDraft && !validate()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title, type: form.type,
        price: parseFloat(form.price) || 0, currency: form.currency || "GNF",
        description: form.description || "Aucune description.",
        city: form.city, neighborhood: form.neighborhood, address: form.address,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        seller_name: form.seller_name, seller_phone: form.seller_phone,
        seller_email: form.seller_email, seller_whatsapp: form.seller_whatsapp,
        images: form.images, video_url: form.video_url,
        property_category: form.property_category,
        bedrooms: form.bedrooms || 0, bathrooms: form.bathrooms || 0,
        surface_area: parseFloat(form.surface_area) || 0,
        salons: form.salons || 0, kitchens: form.kitchens || 0,
        toilets: form.toilets || 0, floors: form.floors || 0,
        year_built: form.year_built, commune: form.commune,
        landmarks: form.landmarks, equipment: form.equipment,
        show_usd: form.show_usd, show_eur: form.show_eur,
        hide_email: form.hide_email, show_phone: form.show_phone,
        whatsapp_direct: form.whatsapp_direct,
      };
      if (isEdit) {
        payload.status = asDraft ? "brouillon" : (form.status || "disponible");
        await api.put(`/properties/${id}`, payload);
        toast.success(asDraft ? "Brouillon sauvegarde" : "Annonce mise a jour");
        navigate(`/immobilier/${id}`);
      } else {
        const res = await api.post("/properties", payload);
        toast.success(asDraft ? "Brouillon sauvegarde" : "Annonce publiee !");
        navigate(`/immobilier/${res.data.id}`);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail.map(d => d.msg).join(", ") : (typeof detail === "string" ? detail : "Erreur de sauvegarde"));
    } finally { setSaving(false); }
  };

  const errCls = (field) => errors[field] ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "";

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col" data-testid="property-form-page">
      {/* ─── Header ─── */}
      <div className="bg-white border-b border-zinc-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/immobilier" className="flex items-center gap-2" data-testid="header-logo-link">
            <img src="/Matrix.png" alt="Matrix News" className="h-8" />
          </Link>
          <div className="h-6 w-px bg-zinc-200" />
          <h1 className="font-['Oswald'] text-base sm:text-lg font-bold uppercase tracking-tight text-zinc-900 flex-1">
            {isEdit ? "Modifier l'annonce" : "Creer une annonce immobiliere"}
          </h1>
          <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#F97316] font-bold uppercase tracking-wider transition-colors"
            data-testid="nav-dashboard"><Home className="w-3.5 h-3.5" /> Tableau de bord</Link>
          <Link to="/immobilier" className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#F97316] font-bold uppercase tracking-wider transition-colors"
            data-testid="nav-annonces"><FileText className="w-3.5 h-3.5" /> Mes annonces</Link>
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-[#F97316] via-[#F97316] to-orange-300" />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ═══════════ LEFT COLUMN — Media ═══════════ */}
          <div className="lg:col-span-3 space-y-5">
            <SectionCard title="Photos du bien" icon={<Camera className="w-4 h-4 text-[#F97316]" />} id="section-photos">
              <div data-field="images">
                {errors.images && <p className="text-red-500 text-xs font-medium mb-2">{errors.images}</p>}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {form.images.map((url, i) => (
                    <div key={`img-${i}`} className={`relative aspect-square rounded-md overflow-hidden border-2 group cursor-grab
                      ${i === 0 ? "border-[#F97316]" : "border-zinc-200"} ${dragIdx === i ? "opacity-50" : ""}`}
                      draggable onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)} onDragEnd={handleDragEnd}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`remove-img-${i}`}>
                        <X className="w-3 h-3" />
                      </button>
                      {i === 0 ? (
                        <span className="absolute bottom-0 left-0 right-0 bg-[#F97316] text-white text-[8px] text-center font-bold py-0.5 flex items-center justify-center gap-0.5">
                          <Star className="w-2.5 h-2.5" /> PRINCIPALE
                        </span>
                      ) : (
                        <button type="button" onClick={() => setAsMain(i)}
                          className="absolute bottom-1 left-1 bg-white/90 text-zinc-600 text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`set-main-${i}`}>
                          <Star className="w-2.5 h-2.5 inline mr-0.5" />Principale
                        </button>
                      )}
                      <GripVertical className="absolute top-1 left-1 w-3.5 h-3.5 text-white/60 opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                  {form.images.length < 10 && (
                    <label className={`aspect-square rounded-md border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center
                      cursor-pointer hover:border-[#F97316] hover:bg-[#F97316]/5 transition-colors ${uploading ? "opacity-50" : ""}`}
                      data-testid="upload-photo-btn">
                      {uploading ? <Loader2 className="w-5 h-5 text-[#F97316] animate-spin" /> : <Plus className="w-5 h-5 text-zinc-400" />}
                      <span className="text-[10px] text-zinc-400 mt-1 font-medium">{uploading ? "Envoi..." : "Ajouter"}</span>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                        disabled={uploading} onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400">Glissez pour reorganiser. Max 10 photos. La premiere = photo principale.</p>
              </div>
            </SectionCard>

            <SectionCard title="Video (optionnel)" icon={<Video className="w-4 h-4 text-[#F97316]" />}>
              <Input value={form.video_url} onChange={e => set("video_url", e.target.value)}
                placeholder="https://youtube.com/watch?v=... ou URL directe"
                hint="Lien YouTube ou video MP4" data-testid="video-url" />
            </SectionCard>
          </div>

          {/* ═══════════ CENTER COLUMN — Details ═══════════ */}
          <div className="lg:col-span-5 space-y-5">
            <SectionCard title="Informations du bien" icon={<Home className="w-4 h-4 text-[#F97316]" />}>
              <div className="space-y-4" data-field="title">
                <div>
                  <Input label="Titre de l'annonce" required value={form.title}
                    onChange={e => set("title", e.target.value)}
                    placeholder="Ex: Villa moderne de 5 chambres a Kipe"
                    className={errCls("title")} data-testid="prop-title" />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Type de bien" required value={form.property_category}
                    onChange={e => set("property_category", e.target.value)} data-testid="prop-category">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                  <Select label="Type d'operation" required value={form.type}
                    onChange={e => set("type", e.target.value)} data-testid="prop-type">
                    {OPERATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </div>
                {isEdit && (
                  <Select label="Statut" value={form.status} onChange={e => set("status", e.target.value)} data-testid="prop-status">
                    <option value="disponible">Disponible</option>
                    <option value="reserve">Reserve</option>
                    <option value="vendu">Vendu</option>
                  </Select>
                )}
              </div>
            </SectionCard>

            {/* Price */}
            <SectionCard title="Prix et Surface" icon={<DollarSign className="w-4 h-4 text-[#F97316]" />}>
              <div className="space-y-4" data-field="price">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label required>Prix (GNF)</Label>
                    <input type="text" value={form.price ? formatPrice(form.price) : ""} data-testid="prop-price"
                      onChange={e => set("price", e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="Ex: 980 000 000"
                      className={`w-full border border-zinc-200 rounded-md px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/20 bg-white ${errCls("price")}`} />
                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                  </div>
                  <div data-field="surface_area">
                    <Input label="Surface (m2)" required type="number" value={form.surface_area}
                      onChange={e => set("surface_area", e.target.value)} placeholder="320"
                      className={errCls("surface_area")} data-testid="prop-surface" />
                    {errors.surface_area && <p className="text-red-500 text-xs mt-1">{errors.surface_area}</p>}
                  </div>
                </div>
                {priceNum > 0 && (
                  <div className="bg-[#FFF7ED] border border-orange-200 rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={form.show_usd} onChange={e => set("show_usd", e.target.checked)}
                          className="accent-[#F97316] rounded" data-testid="show-usd" />
                        <span className="text-xs text-zinc-600 font-medium">USD</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={form.show_eur} onChange={e => set("show_eur", e.target.checked)}
                          className="accent-[#F97316] rounded" data-testid="show-eur" />
                        <span className="text-xs text-zinc-600 font-medium">EUR</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {form.show_usd && <span className="font-bold text-[#F97316]">{"\u2248"} {priceUSD.toLocaleString("fr-FR")} USD</span>}
                      {form.show_eur && <span className="font-bold text-[#F97316]">{"\u2248"} {priceEUR.toLocaleString("fr-FR")} EUR</span>}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Rooms */}
            <SectionCard title="Details des pieces" icon={<Home className="w-4 h-4 text-[#F97316]" />}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <NumInput label="Chambres" value={form.bedrooms} onChange={v => set("bedrooms", v)} />
                <NumInput label="Salles de bain" value={form.bathrooms} onChange={v => set("bathrooms", v)} />
                <NumInput label="Salons" value={form.salons} onChange={v => set("salons", v)} />
                <NumInput label="Cuisines" value={form.kitchens} onChange={v => set("kitchens", v)} />
                <NumInput label="Toilettes" value={form.toilets} onChange={v => set("toilets", v)} />
                <NumInput label="Etages" value={form.floors} onChange={v => set("floors", v)} />
              </div>
              <div className="mt-3">
                <Input label="Annee de construction" value={form.year_built}
                  onChange={e => set("year_built", e.target.value)} placeholder="Ex: 2020" data-testid="prop-year" />
              </div>
            </SectionCard>

            {/* Description */}
            <SectionCard title="Description detaillee" icon={<FileText className="w-4 h-4 text-[#F97316]" />}>
              <div data-field="description">
                <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={8}
                  placeholder="Decrivez le bien en detail : type, nombre de pieces, etat, equipements, environnement, securite, acces, proximite commerces, ecoles, hopitaux, mosquees, banques, transports, vue, standing, avantages du quartier..."
                  className={`w-full border border-zinc-200 rounded-md px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/20 resize-y bg-white placeholder:text-zinc-400 ${errCls("description")}`}
                  data-testid="prop-desc" />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                <p className="text-[10px] text-zinc-400 mt-1">{form.description.length} caractere(s)</p>
              </div>
            </SectionCard>

            {/* Equipment */}
            <SectionCard title="Equipements et caracteristiques" icon={<Check className="w-4 h-4 text-[#F97316]" />}>
              <div className="space-y-5">
                {Object.entries(EQUIPMENT).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">{cat}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {items.map(item => (
                        <label key={item} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-zinc-50 rounded px-1 transition-colors">
                          <input type="checkbox" checked={form.equipment.includes(item)}
                            onChange={() => toggleEquip(item)} className="accent-[#F97316] rounded"
                            data-testid={`equip-${item.replace(/\s/g, "-")}`} />
                          <span className="text-sm text-zinc-700">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {form.equipment.length > 0 && (
                  <p className="text-xs text-[#F97316] font-medium">{form.equipment.length} equipement(s) selectionne(s)</p>
                )}
              </div>
            </SectionCard>

            {/* Contact */}
            <SectionCard title="Informations de contact" icon={<Phone className="w-4 h-4 text-[#F97316]" />}>
              <div className="space-y-3" data-field="seller_name">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input label="Nom du contact" required value={form.seller_name}
                      onChange={e => set("seller_name", e.target.value)}
                      placeholder="Votre nom complet" className={errCls("seller_name")} data-testid="prop-seller-name" />
                    {errors.seller_name && <p className="text-red-500 text-xs mt-1">{errors.seller_name}</p>}
                  </div>
                  <div data-field="seller_phone">
                    <Input label="Telephone" required value={form.seller_phone}
                      onChange={e => set("seller_phone", e.target.value)}
                      placeholder="+224 6XX XXX XXX" className={errCls("seller_phone")} data-testid="prop-seller-phone" />
                    {errors.seller_phone && <p className="text-red-500 text-xs mt-1">{errors.seller_phone}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Email" value={form.seller_email} type="email"
                    onChange={e => set("seller_email", e.target.value)}
                    placeholder="email@exemple.com" data-testid="prop-seller-email" />
                  <Input label="WhatsApp" value={form.seller_whatsapp}
                    onChange={e => set("seller_whatsapp", e.target.value)}
                    placeholder="+224 6XX XXX XXX" data-testid="prop-seller-whatsapp" />
                </div>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                    <input type="checkbox" checked={form.show_phone} onChange={e => set("show_phone", e.target.checked)}
                      className="accent-[#F97316]" /> Afficher le telephone
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                    <input type="checkbox" checked={form.hide_email} onChange={e => set("hide_email", e.target.checked)}
                      className="accent-[#F97316]" /> Masquer l'email
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-600">
                    <input type="checkbox" checked={form.whatsapp_direct} onChange={e => set("whatsapp_direct", e.target.checked)}
                      className="accent-[#F97316]" /> Contact WhatsApp direct
                  </label>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ═══════════ RIGHT COLUMN — Location ═══════════ */}
          <div className="lg:col-span-4 space-y-5">
            <SectionCard title="Localisation" icon={<MapPin className="w-4 h-4 text-[#F97316]" />}>
              <div className="space-y-3" data-field="city">
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Ville" required value={form.city} onChange={e => set("city", e.target.value)} data-testid="prop-city">
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <Select label="Commune" value={form.commune} onChange={e => set("commune", e.target.value)} data-testid="prop-commune">
                    <option value="">-- Selectionnez --</option>
                    {COMMUNES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                <Input label="Quartier / Secteur" value={form.neighborhood}
                  onChange={e => set("neighborhood", e.target.value)} placeholder="Ex: Kipe, Cosa, Nongo..."
                  data-testid="prop-neighborhood" />
                <Input label="Adresse complete" value={form.address}
                  onChange={e => set("address", e.target.value)} placeholder="Rue, numero, immeuble..."
                  data-testid="prop-address" />
                <div>
                  <Label>Points de repere</Label>
                  <textarea value={form.landmarks} onChange={e => set("landmarks", e.target.value)} rows={2}
                    placeholder="Ex: A proximite du rond-point de Kipe, en face de l'hotel..."
                    className="w-full border border-zinc-200 rounded-md px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/20 resize-y bg-white placeholder:text-zinc-400"
                    data-testid="prop-landmarks" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Latitude GPS" value={form.latitude}
                    onChange={e => set("latitude", e.target.value)} placeholder="9.5370"
                    data-testid="prop-lat" />
                  <Input label="Longitude GPS" value={form.longitude}
                    onChange={e => set("longitude", e.target.value)} placeholder="-13.6785"
                    data-testid="prop-lng" />
                </div>
              </div>
            </SectionCard>

            {/* Map */}
            <SectionCard title="Carte interactive" icon={<MapPin className="w-4 h-4 text-[#F97316]" />}>
              <div className="rounded-md overflow-hidden border border-zinc-200" style={{ height: 350 }} data-testid="prop-map">
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-zinc-100"><Loader2 className="w-5 h-5 animate-spin text-[#F97316]" /></div>}>
                  <MapWithPin
                    lat={parseFloat(form.latitude) || 9.537}
                    lng={parseFloat(form.longitude) || -13.6785}
                    onMove={handleMapClick}
                  />
                </Suspense>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> Cliquez ou deplacez le marqueur pour definir la position exacte
              </p>
            </SectionCard>

            {/* Summary */}
            {form.title && (
              <div className="bg-white border border-zinc-200 shadow-sm rounded-lg p-5" data-testid="property-summary">
                <h3 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">Resume de l'annonce</h3>
                {form.images[0] && <img src={form.images[0]} alt="" className="w-full h-32 object-cover rounded-md mb-3" />}
                <p className="font-bold text-zinc-900 text-sm mb-1">{form.title}</p>
                <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500 mb-2">
                  {form.property_category !== "autre" && <span className="bg-zinc-100 px-2 py-0.5 rounded">{form.property_category}</span>}
                  {form.type && <span className="bg-[#F97316]/10 text-[#F97316] px-2 py-0.5 rounded font-bold">{form.type}</span>}
                  {form.city && <span>{form.city}</span>}
                  {form.commune && <span>- {form.commune}</span>}
                </div>
                {priceNum > 0 && <p className="text-lg font-bold text-[#F97316]">{formatPrice(form.price)} GNF</p>}
                <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500 mt-2">
                  {form.bedrooms > 0 && <span>{form.bedrooms} ch.</span>}
                  {form.bathrooms > 0 && <span>{form.bathrooms} sdb.</span>}
                  {form.salons > 0 && <span>{form.salons} salon(s)</span>}
                  {form.surface_area && <span>{form.surface_area} m2</span>}
                </div>
                {form.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.equipment.slice(0, 6).map(e => (
                      <span key={e} className="bg-zinc-100 text-zinc-500 text-[8px] px-1.5 py-0.5 rounded">{e}</span>
                    ))}
                    {form.equipment.length > 6 && <span className="text-[8px] text-zinc-400">+{form.equipment.length - 6}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Action Buttons ─── */}
        <div className="mt-8 bg-white border border-zinc-200 shadow-sm rounded-lg p-5 flex flex-col sm:flex-row items-center gap-3">
          <button type="button" onClick={() => handleSubmit(false)} disabled={saving}
            className="w-full sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#F97316] text-white font-bold uppercase tracking-wider text-sm py-3 px-8 rounded-md hover:bg-[#EA580C] transition-colors disabled:opacity-60 shadow-md shadow-orange-200"
            data-testid="publish-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Publication..." : isEdit ? "Mettre a jour" : "Publier l'annonce"}
          </button>
          <button type="button" onClick={() => handleSubmit(true)} disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-zinc-300 text-zinc-600 font-bold uppercase tracking-wider text-sm py-3 px-6 rounded-md hover:border-zinc-400 hover:text-zinc-900 transition-colors disabled:opacity-60"
            data-testid="draft-btn">
            <Save className="w-4 h-4" /> Enregistrer en brouillon
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 text-zinc-400 font-bold uppercase tracking-wider text-sm py-3 px-6 hover:text-zinc-600 transition-colors"
            data-testid="cancel-btn">
            Annuler
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
