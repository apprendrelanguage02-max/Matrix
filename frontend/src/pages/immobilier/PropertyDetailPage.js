import { useEffect, useState, lazy, Suspense, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import PaymentModal from "../../components/immobilier/PaymentModal";
import ChatPanel from "../../components/ChatPanel";
import { useAuth } from "../../context/AuthContext";
import { useWebSocket } from "../../context/WebSocketContext";
import api from "../../lib/api";
import {
  MapPin, Phone, Mail, MessageCircle, MessageSquare, Eye,
  ChevronLeft, ChevronRight, ArrowLeft, Edit, Loader2, Video,
  Bed, Bath, Maximize, Home, ShieldCheck, Heart, Bookmark, Lock,
  User, Check, X, ChevronDown, ChevronRight as ChevronR,
  Sofa, CookingPot, DoorOpen, Building2, Calendar, Zap, Wifi, Shield
} from "lucide-react";
import LikeButton from "../../components/LikeButton";
import { toast } from "sonner";

const PropertyMap = lazy(() => import("../../components/immobilier/PropertyMap"));

const TYPE_LABELS = {
  achat: "Achat", vente: "A vendre", location: "A louer",
  location_meublee: "Location meublee", location_non_meublee: "Location non meublee",
  colocation: "Colocation", bail_commercial: "Bail commercial",
};
const STATUS_STYLES = {
  disponible: "bg-[#F97316] text-white", reserve: "bg-yellow-500 text-white",
  vendu: "bg-zinc-800 text-white", loue: "bg-blue-600 text-white",
};
const STATUS_LABELS = { disponible: "Disponible", reserve: "Reserve", vendu: "Vendu", loue: "Loue" };
const CAT_LABELS = {
  villa: "Villa", appartement: "Appartement", maison: "Maison", studio: "Studio",
  immeuble: "Immeuble", terrain: "Terrain", bureau: "Bureau", magasin: "Magasin",
  entrepot: "Entrepot", duplex: "Duplex", commerce: "Commerce", autre: "Autre",
};

const GNF_TO_USD = 1 / 8600;
const GNF_TO_EUR = 1 / 9300;

const EQUIP_CATEGORIES = {
  "Exterieur": ["Piscine","Garage","Jardin","Balcon","Terrasse","Cour","Parking","Cloture","Portail","Dependance","Forage","Reservoir d'eau"],
  "Interieur": ["Climatisation","Refrigerateur","Television","Four","Micro-ondes","Cuisiniere","Lave-linge","Lave-vaisselle","Chauffe-eau","Dressing","Meuble","Wi-Fi / Internet"],
  "Securite & Confort": ["Gardiennage","Camera de surveillance","Securite 24H/24","Interphone","Alarme","Portail electrique","Groupe electrogene","Panneaux solaires","Ascenseur","Vue mer","Vue montagne","Acces goudronne","Proche route principale","Animaux acceptes"],
};

function AuthGateOverlay() {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="auth-gate-overlay">
      <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-[#F97316]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-[#F97316]" /></div>
        <h2 className="font-['Oswald'] text-xl font-bold uppercase tracking-tight text-black mb-2">Contenu reserve aux membres</h2>
        <p className="text-sm text-zinc-600 mb-6 leading-relaxed">Connectez-vous ou creez un compte gratuit pour acceder aux details complets.</p>
        <div className="space-y-3">
          <a href="/connexion" data-testid="auth-gate-login-btn" className="block w-full bg-[#F97316] text-white font-bold uppercase text-sm py-3 px-4 rounded-md hover:bg-[#EA580C] transition-colors">Se connecter</a>
          <a href="/inscription" data-testid="auth-gate-register-btn" className="block w-full border-2 border-zinc-200 text-zinc-700 font-bold uppercase text-sm py-3 px-4 rounded-md hover:border-[#F97316] hover:text-[#F97316] transition-colors">Creer un compte</a>
        </div>
      </div>
    </div>
  );
}

function fmt(n) { return n ? Number(n).toLocaleString("fr-FR") : "0"; }

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const ws = useWebSocket();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    api.get(`/properties/${id}`)
      .then(r => { setProperty(r.data); setViewCount(r.data.views || 0); api.post(`/properties/${id}/view`).catch(() => {});
        if (token) { api.get(`/saved-properties/${id}/status`).then(res => setIsSaved(res.data.is_saved)).catch(() => {}); }
      })
      .catch(() => { toast.error("Annonce introuvable"); navigate("/immobilier"); })
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  useEffect(() => {
    if (!ws || !id) return;
    const handler = (data) => {
      if (data.type === "view_update" && data.content_type === "property" && data.id === id) setViewCount(data.views);
    };
    return ws.subscribe(handler);
  }, [ws, id]);

  const equipByCategory = useMemo(() => {
    if (!property?.equipment?.length) return {};
    const result = {};
    for (const [cat, items] of Object.entries(EQUIP_CATEGORIES)) {
      const matched = items.filter(i => property.equipment.includes(i));
      if (matched.length) result[cat] = matched;
    }
    const allKnown = Object.values(EQUIP_CATEGORIES).flat();
    const other = property.equipment.filter(e => !allKnown.includes(e));
    if (other.length) result["Autre"] = other;
    return result;
  }, [property?.equipment]);

  if (loading) return (
    <div className="min-h-screen bg-[#F9FAFB]"><Header />
      <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-[#F97316]" /></div>
    </div>
  );
  if (!property) return null;

  const images = property.images || [];
  const canEdit = user && (user.role === "admin" || user.role === "auteur" || user.id === property.author_id);
  const priceUSD = Math.round((property.price || 0) * GNF_TO_USD);
  const priceEUR = Math.round((property.price || 0) * GNF_TO_EUR);
  const showUsd = property.show_usd !== false;
  const showEur = property.show_eur !== false;

  return (
    <div className="min-h-screen bg-[#F9FAFB]" data-testid="property-detail-page">
      <Header />
      {!token && <AuthGateOverlay />}
      <div className="h-1 bg-gradient-to-r from-[#F97316] via-[#F97316] to-orange-300" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-zinc-400 mb-5" data-testid="breadcrumb">
          <Link to="/" className="hover:text-[#F97316] transition-colors">Accueil</Link>
          <ChevronR className="w-3 h-3" />
          <Link to="/immobilier" className="hover:text-[#F97316] transition-colors">Annonces</Link>
          <ChevronR className="w-3 h-3" />
          <span className="text-zinc-600 font-medium truncate max-w-[200px] sm:max-w-none">{property.title}</span>
        </nav>

        {/* ─── Title + Price + Quick Stats ─── */}
        <div className="bg-white border border-zinc-200 rounded-lg p-5 sm:p-6 mb-6 shadow-sm" data-testid="property-hero">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md tracking-wider ${STATUS_STYLES[property.status] || "bg-zinc-200 text-zinc-600"}`} data-testid="detail-status-badge">
                  {STATUS_LABELS[property.status] || property.status}
                </span>
                <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md tracking-wider bg-zinc-900 text-white">
                  {TYPE_LABELS[property.type] || property.type}
                </span>
                {property.is_verified && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md" data-testid="detail-verified-badge">
                    <ShieldCheck className="w-3 h-3" /> Verifie
                  </span>
                )}
              </div>
              <h1 className="font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[#111111] mb-1" data-testid="detail-title">
                {property.title}
              </h1>
              <p className="text-sm text-zinc-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                {[property.commune, property.neighborhood, property.city].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="font-['Oswald'] text-3xl sm:text-4xl font-bold text-[#F97316] leading-none" data-testid="detail-price">
                {fmt(property.price)} <span className="text-lg">GNF</span>
              </p>
              {(showUsd || showEur) && property.price > 0 && (
                <p className="text-xs text-zinc-500 mt-1" data-testid="detail-price-converted">
                  {showUsd && <span>{"\u2248"} {fmt(priceUSD)} USD</span>}
                  {showUsd && showEur && <span className="mx-1.5">|</span>}
                  {showEur && <span>{"\u2248"} {fmt(priceEUR)} EUR</span>}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 mt-2">
                <span className="flex items-center gap-1 text-zinc-400 text-xs"><Eye className="w-3 h-3" /> {viewCount}</span>
                <LikeButton type="property" id={property.id} initialCount={property.likes_count || 0} initialLikedBy={property.liked_by || []} className="text-xs" />
                {token && (
                  <button onClick={async () => {
                    try { await api.post(`/saved-properties/${property.id}`); setIsSaved(!isSaved); toast.success(isSaved ? "Retire" : "Sauvegarde"); } catch { toast.error("Erreur"); }
                  }} data-testid="detail-save-btn"
                    className={`p-1 transition-colors ${isSaved ? "text-[#F97316]" : "text-zinc-400 hover:text-[#F97316]"}`}>
                    <Bookmark className={`w-4 h-4 ${isSaved ? "fill-[#F97316]" : ""}`} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats line */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-100">
            {property.surface_area > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-zinc-700" data-testid="quick-surface">
                <Maximize className="w-4 h-4 text-[#F97316]" /> <span className="font-semibold">{property.surface_area} m2</span>
              </div>
            )}
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-zinc-700" data-testid="quick-bedrooms">
                <Bed className="w-4 h-4 text-[#F97316]" /> <span className="font-semibold">{property.bedrooms} chambre{property.bedrooms > 1 ? "s" : ""}</span>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-zinc-700" data-testid="quick-bathrooms">
                <Bath className="w-4 h-4 text-[#F97316]" /> <span className="font-semibold">{property.bathrooms} sdb</span>
              </div>
            )}
            {property.salons > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-zinc-700" data-testid="quick-salons">
                <Sofa className="w-4 h-4 text-[#F97316]" /> <span className="font-semibold">{property.salons} salon{property.salons > 1 ? "s" : ""}</span>
              </div>
            )}
            {property.property_category && property.property_category !== "autre" && (
              <div className="flex items-center gap-1.5 text-sm text-zinc-700">
                <Home className="w-4 h-4 text-[#F97316]" /> <span className="font-semibold">{CAT_LABELS[property.property_category] || property.property_category}</span>
              </div>
            )}
          </div>

          {/* Admin actions */}
          <div className="flex items-center gap-2 mt-3">
            {user?.role === "admin" && (
              <button onClick={async () => {
                try { const res = await api.post(`/properties/${property.id}/verify`); setProperty(p => ({ ...p, is_verified: res.data.is_verified })); toast.success(res.data.message); } catch { toast.error("Erreur"); }
              }} data-testid="verify-property-btn"
                className={`flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded-md transition-colors ${property.is_verified ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500 hover:bg-[#F97316] hover:text-white"}`}>
                <ShieldCheck className="w-3.5 h-3.5" /> {property.is_verified ? "Verifie" : "Verifier"}
              </button>
            )}
            {canEdit && (
              <Link to={`/immobilier/modifier/${property.id}`} className="flex items-center gap-1.5 text-xs font-bold uppercase text-zinc-500 hover:text-[#F97316] px-3 py-1.5 rounded-md bg-zinc-100 transition-colors">
                <Edit className="w-3.5 h-3.5" /> Modifier
              </Link>
            )}
          </div>
        </div>

        {/* ─── 2-Column Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ═══ LEFT — Gallery + Description + Equipment + Contact ═══ */}
          <div className="lg:col-span-2 space-y-6">

            {/* Gallery */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm" data-testid="gallery-section">
              <div className="relative aspect-[16/10] bg-zinc-900">
                {images.length > 0 ? (
                  <>
                    <img src={images[imgIdx]} alt={property.title} className="w-full h-full object-cover" />
                    {images.length > 1 && (
                      <>
                        <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2.5 rounded-full transition-colors" data-testid="gallery-prev">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2.5 rounded-full transition-colors" data-testid="gallery-next">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <span className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                          {imgIdx + 1} / {images.length}
                        </span>
                      </>
                    )}
                    {property.video_url && (
                      <span className="absolute top-3 left-3 bg-[#F97316] text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Video className="w-3 h-3" /> Video disponible
                      </span>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                    <Home className="w-12 h-12 text-zinc-300 mb-2" />
                    <p className="text-sm">Aucune photo disponible</p>
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="p-3 flex gap-2 overflow-x-auto">
                  {images.slice(0, showAllPhotos ? images.length : 6).map((img, i) => (
                    <button key={`thumb-${i}`} onClick={() => setImgIdx(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${i === imgIdx ? "border-[#F97316] ring-1 ring-[#F97316]/30" : "border-transparent opacity-70 hover:opacity-100"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {images.length > 6 && !showAllPhotos && (
                    <button onClick={() => setShowAllPhotos(true)}
                      className="flex-shrink-0 w-16 h-16 rounded-md bg-zinc-100 border-2 border-dashed border-zinc-300 flex items-center justify-center text-zinc-500 text-xs font-bold hover:border-[#F97316] hover:text-[#F97316] transition-colors"
                      data-testid="show-all-photos">
                      +{images.length - 6}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Video */}
            {property.video_url && (
              <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm" data-testid="video-section">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="w-4 h-4 text-[#F97316]" />
                  <h2 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-900">Video du bien</h2>
                </div>
                {property.video_url.includes("youtube") || property.video_url.includes("youtu.be") ? (
                  <iframe src={property.video_url.replace("watch?v=", "embed/")} className="w-full aspect-video rounded-md" allowFullScreen title="Video" />
                ) : (
                  <video src={property.video_url} controls className="w-full rounded-md" />
                )}
              </div>
            )}

            {/* Description */}
            <div className="bg-white border border-zinc-200 rounded-lg p-5 sm:p-6 shadow-sm" data-testid="description-section">
              <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight text-[#111111] mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-[#F97316] rounded-full" /> Description detaillee
              </h2>
              <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line article-content"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(property.description) }} />
            </div>

            {/* ═══ EQUIPMENT — Separate section ═══ */}
            {property.equipment?.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-lg p-5 sm:p-6 shadow-sm" data-testid="equipment-section">
                <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight text-[#111111] mb-5 flex items-center gap-2">
                  <div className="w-1 h-5 bg-[#F97316] rounded-full" /> Equipements & Caracteristiques
                </h2>
                <div className="space-y-5">
                  {Object.entries(equipByCategory).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2.5">{cat}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {items.map(item => (
                          <div key={item} className="flex items-center gap-2 bg-[#F9FAFB] border border-zinc-100 rounded-md px-3 py-2.5" data-testid={`equip-${item.replace(/\s/g, "-")}`}>
                            <Check className="w-3.5 h-3.5 text-[#F97316] flex-shrink-0" />
                            <span className="text-sm text-zinc-700">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ CONTACT — Separate section ═══ */}
            <div className="bg-white border border-zinc-200 rounded-lg p-5 sm:p-6 shadow-sm" data-testid="contact-section">
              <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight text-[#111111] mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-[#F97316] rounded-full" /> Contact
              </h2>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-[#F97316]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-[#F97316]" />
                </div>
                <div>
                  <Link to={`/agent/${property.author_id}`} className="font-bold text-[#111111] text-base hover:text-[#F97316] transition-colors" data-testid="detail-agent-link">
                    {property.seller_name}
                  </Link>
                  {property.is_verified && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                      <ShieldCheck className="w-3 h-3" /> Agent verifie
                    </span>
                  )}
                  <p className="text-xs text-zinc-500 mt-0.5">Contactez pour plus d'informations</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(property.show_phone !== false) && property.seller_phone && (
                  <a href={`tel:${property.seller_phone}`}
                    className="flex items-center justify-center gap-2 bg-[#F97316] text-white px-4 py-3 rounded-md text-sm font-bold hover:bg-[#EA580C] transition-colors" data-testid="contact-phone-btn">
                    <Phone className="w-4 h-4" /> {property.seller_phone}
                  </a>
                )}
                {property.seller_whatsapp && (
                  <a href={`https://wa.me/${property.seller_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-md text-sm font-bold hover:bg-green-700 transition-colors" data-testid="contact-whatsapp-btn">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
                {!property.hide_email && property.seller_email && (
                  <a href={`mailto:${property.seller_email}`}
                    className="flex items-center justify-center gap-2 border border-zinc-300 text-zinc-700 px-4 py-3 rounded-md text-sm font-bold hover:border-[#111111] hover:text-[#111111] transition-colors" data-testid="contact-email-btn">
                    <Mail className="w-4 h-4" /> {property.seller_email}
                  </a>
                )}
                {token && property.author_id !== user?.id && (
                  <button onClick={() => setShowChat(true)} data-testid="contact-agent-btn"
                    className="flex items-center justify-center gap-2 bg-[#111111] text-white px-4 py-3 rounded-md text-sm font-bold hover:bg-black transition-colors">
                    <MessageSquare className="w-4 h-4" /> Envoyer un message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT — Info + Location + Map ═══ */}
          <div className="space-y-6">

            {/* Info card */}
            <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm sticky top-4" data-testid="info-card">
              <h3 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#F97316]" /> Informations principales
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Home, label: "Type de bien", value: CAT_LABELS[property.property_category] || property.property_category },
                  { icon: Zap, label: "Operation", value: TYPE_LABELS[property.type] || property.type },
                  { icon: Maximize, label: "Surface", value: property.surface_area ? `${property.surface_area} m2` : null },
                  { icon: Bed, label: "Chambres", value: property.bedrooms > 0 ? property.bedrooms : null },
                  { icon: Bath, label: "Salles de bain", value: property.bathrooms > 0 ? property.bathrooms : null },
                  { icon: Sofa, label: "Salons", value: property.salons > 0 ? property.salons : null },
                  { icon: CookingPot, label: "Cuisines", value: property.kitchens > 0 ? property.kitchens : null },
                  { icon: DoorOpen, label: "Toilettes", value: property.toilets > 0 ? property.toilets : null },
                  { icon: Building2, label: "Etage(s)", value: property.floors > 0 ? property.floors : null },
                  { icon: Calendar, label: "Annee", value: property.year_built || null },
                ].filter(r => r.value != null).map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                    <span className="flex items-center gap-2 text-sm text-zinc-500">
                      <Icon className="w-4 h-4 text-[#F97316]" /> {label}
                    </span>
                    <span className="text-sm font-semibold text-[#111111]">{value}</span>
                  </div>
                ))}
              </div>

              {/* Price reminder */}
              <div className="mt-4 pt-4 border-t border-zinc-200 text-center">
                <p className="font-['Oswald'] text-2xl font-bold text-[#F97316]">{fmt(property.price)} GNF</p>
                {property.status === "disponible" && (
                  <button onClick={() => { if (!token) { toast.error("Connectez-vous"); return; } setShowPayment(true); }}
                    className="w-full mt-3 bg-[#111111] text-white font-bold uppercase tracking-wider py-3 rounded-md hover:bg-[#F97316] transition-colors text-sm" data-testid="reserve-btn">
                    Reserver ce bien
                  </button>
                )}
              </div>
            </div>

            {/* Location card */}
            <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm" data-testid="location-section">
              <h3 className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#F97316]" /> Localisation
              </h3>
              <div className="space-y-2.5 mb-4">
                {[
                  { label: "Ville", value: property.city },
                  { label: "Commune", value: property.commune },
                  { label: "Quartier", value: property.neighborhood },
                  { label: "Adresse", value: property.address },
                  { label: "Reperes", value: property.landmarks },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="text-xs font-bold uppercase text-zinc-400 w-20 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-zinc-700">{value}</span>
                  </div>
                ))}
                {property.latitude && property.longitude && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold uppercase text-zinc-400 w-20 flex-shrink-0 pt-0.5">GPS</span>
                    <span className="text-xs text-zinc-500 font-mono">{Number(property.latitude).toFixed(4)}, {Number(property.longitude).toFixed(4)}</span>
                  </div>
                )}
              </div>

              {/* Map */}
              <div className="rounded-md overflow-hidden border border-zinc-200" style={{ height: 280 }} data-testid="detail-map">
                <Suspense fallback={<div className="w-full h-full bg-zinc-100 animate-pulse" />}>
                  <PropertyMap latitude={property.latitude} longitude={property.longitude} title={property.title} city={property.city} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showPayment && <PaymentModal property={property} onClose={() => { setShowPayment(false); api.get(`/properties/${id}`).then(r => setProperty(r.data)).catch(() => {}); }} />}
      {showChat && <ChatPanel type="immobilier" recipientId={property.author_id} recipientName={property.author_username || property.seller_name} propertyId={property.id} propertyTitle={property.title} onClose={() => setShowChat(false)} />}
      <Footer />
    </div>
  );
}
