import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import PaymentModal from "../../components/immobilier/PaymentModal";
import { formatPrice } from "../../components/immobilier/PropertyCard";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";
import { MapPin, Phone, Mail, MessageCircle, Eye, ChevronLeft, ChevronRight, ArrowLeft, Edit, Loader2, Video } from "lucide-react";
import { toast } from "sonner";

const PropertyMap = lazy(() => import("../../components/immobilier/PropertyMap"));

const TYPE_LABELS = { achat: "Achat", vente: "Vente", location: "Location" };
const STATUS_STYLES = {
  disponible: "bg-green-100 text-green-800",
  reserve:    "bg-yellow-100 text-yellow-800",
  vendu:      "bg-red-100 text-red-800",
  loue:       "bg-purple-100 text-purple-800",
};
const STATUS_LABELS = { disponible: "Disponible", reserve: "Réservé", vendu: "Vendu", loue: "Loué" };

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    api.get(`/properties/${id}`)
      .then(r => { setProperty(r.data); api.post(`/properties/${id}/view`).catch(() => {}); })
      .catch(() => { toast.error("Annonce introuvable"); navigate("/immobilier"); })
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" /></div>
    </div>
  );
  if (!property) return null;

  const images = property.images || [];
  const canEdit = user && (user.role === "auteur" || user.id === property.author_id);

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link to="/immobilier" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour aux annonces
          </Link>
          {canEdit && (
            <Link to={`/immobilier/modifier/${property.id}`}
              className="flex items-center gap-1.5 text-sm font-bold uppercase text-zinc-500 hover:text-[#FF6600] transition-colors">
              <Edit className="w-4 h-4" /> Modifier
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: media + description */}
          <div className="lg:col-span-2">
            {/* Image gallery */}
            <div className="relative bg-zinc-900 aspect-[4/3] mb-3 overflow-hidden">
              {images.length > 0 ? (
                <>
                  <img src={images[imgIdx]} alt={property.title}
                    className="w-full h-full object-cover" />
                  {images.length > 1 && (
                    <>
                      <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white p-2 rounded-full transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => setImgIdx(i => (i + 1) % images.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-white p-2 rounded-full transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, i) => (
                          <button key={i} onClick={() => setImgIdx(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? "bg-[#FF6600]" : "bg-white/60"}`} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-zinc-500 text-sm">Aucune photo disponible</p>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)}
                    className={`flex-shrink-0 w-16 h-16 border-2 overflow-hidden transition-all ${i === imgIdx ? "border-[#FF6600]" : "border-transparent"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Video */}
            {property.video_url && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-[#FF6600]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Vidéo</span>
                </div>
                <video src={property.video_url} controls className="w-full rounded border border-zinc-200" />
              </div>
            )}

            {/* Description */}
            <div className="bg-white border border-zinc-200 p-6 mb-6">
              <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight mb-4">Description</h2>
              <div className="text-sm text-zinc-700 leading-relaxed article-content"
                dangerouslySetInnerHTML={{ __html: property.description }} />
            </div>

            {/* Map */}
            <div className="bg-white border border-zinc-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-[#FF6600]" />
                <h2 className="font-['Oswald'] text-lg font-bold uppercase tracking-tight">Localisation</h2>
              </div>
              <p className="text-sm text-zinc-500 mb-3">
                {[property.address, property.neighborhood, property.city].filter(Boolean).join(" · ")}
              </p>
              <Suspense fallback={<div className="w-full h-64 bg-zinc-100 animate-pulse" />}>
                <PropertyMap
                  latitude={property.latitude}
                  longitude={property.longitude}
                  title={property.title}
                  city={property.city}
                />
              </Suspense>
              {property.latitude && property.longitude && (
                <p className="text-xs text-zinc-400 mt-2">GPS: {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}</p>
              )}
            </div>
          </div>

          {/* Right column: info card */}
          <div className="space-y-4">
            {/* Price + type + status */}
            <div className="bg-white border border-zinc-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold uppercase px-2 py-1 ${
                  property.type === "vente" ? "bg-[#FF6600] text-white" :
                  property.type === "achat" ? "bg-green-600 text-white" : "bg-blue-600 text-white"
                } font-['Manrope']`}>{TYPE_LABELS[property.type]}</span>
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded font-['Manrope'] ${STATUS_STYLES[property.status] || "bg-zinc-100 text-zinc-600"}`}>
                  {STATUS_LABELS[property.status] || property.status}
                </span>
              </div>
              <h1 className="font-['Oswald'] text-xl font-bold uppercase tracking-tight text-black mb-2">{property.title}</h1>
              <p className="font-['Oswald'] text-3xl font-bold text-[#FF6600]">{formatPrice(property.price, property.currency)}</p>
              <div className="flex items-center gap-1 text-zinc-400 text-xs mt-2">
                <Eye className="w-3 h-3" /> {property.views} vue{property.views !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Seller */}
            <div className="bg-white border border-zinc-200 p-5">
              <h2 className="font-['Oswald'] text-base font-bold uppercase tracking-tight mb-4">Contact vendeur</h2>
              <p className="font-bold text-black text-sm mb-3 font-['Manrope']">{property.seller_name}</p>
              <div className="space-y-2">
                <a href={`tel:${property.seller_phone}`}
                  className="flex items-center gap-3 w-full bg-[#FF6600] text-white px-4 py-2.5 text-sm font-bold hover:bg-[#CC5200] transition-colors font-['Manrope']">
                  <Phone className="w-4 h-4" /> {property.seller_phone}
                </a>
                {property.seller_whatsapp && (
                  <a href={`https://wa.me/${property.seller_whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 w-full bg-green-600 text-white px-4 py-2.5 text-sm font-bold hover:bg-green-700 transition-colors font-['Manrope']">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
                {property.seller_email && (
                  <a href={`mailto:${property.seller_email}`}
                    className="flex items-center gap-3 w-full border border-zinc-300 text-zinc-700 px-4 py-2.5 text-sm font-bold hover:border-black hover:text-black transition-colors font-['Manrope']">
                    <Mail className="w-4 h-4" /> Email
                  </a>
                )}
              </div>
            </div>

            {/* Reserve button */}
            {property.status === "disponible" && (
              <button
                onClick={() => {
                  if (!token) { toast.error("Connectez-vous pour réserver."); return; }
                  setShowPayment(true);
                }}
                className="w-full bg-black text-white font-bold font-['Manrope'] uppercase tracking-wider py-4 hover:bg-[#FF6600] transition-colors text-sm"
                data-testid="reserve-btn"
              >
                Réserver cette propriété
              </button>
            )}
          </div>
        </div>
      </main>

      {showPayment && <PaymentModal property={property} onClose={() => { setShowPayment(false); api.get(`/properties/${id}`).then(r => setProperty(r.data)).catch(() => {}); }} />}

      <footer className="bg-black text-zinc-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="font-['Oswald'] text-white font-bold tracking-widest uppercase">Immobilier GIMO</span>
          <p className="text-xs">&copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
