import { Star, GripVertical, Plus, X, Loader2 } from "lucide-react";

export const GNF_TO_USD = 1 / 8600;
export const GNF_TO_EUR = 1 / 9300;

export const CITIES = ["Conakry", "Kindia", "Labe", "Kankan", "Boke", "Mamou", "Faranah", "N'Zerekore", "Siguiri", "Kissidougou", "Autre"];
export const COMMUNES = ["Kaloum", "Dixinn", "Matam", "Ratoma", "Matoto", "Sonfonia", "Autre"];
export const CATEGORIES = [
  { value: "maison", label: "Maison" }, { value: "appartement", label: "Appartement" },
  { value: "villa", label: "Villa" }, { value: "studio", label: "Studio" },
  { value: "immeuble", label: "Immeuble" }, { value: "terrain", label: "Terrain" },
  { value: "bureau", label: "Bureau" }, { value: "magasin", label: "Magasin" },
  { value: "entrepot", label: "Entrepot" }, { value: "duplex", label: "Duplex" },
  { value: "autre", label: "Autre" },
];
export const OPERATIONS = [
  { value: "vente", label: "Vente" }, { value: "location", label: "Location" },
  { value: "location_meublee", label: "Location meublee" },
  { value: "location_non_meublee", label: "Location non meublee" },
  { value: "colocation", label: "Colocation" }, { value: "bail_commercial", label: "Bail commercial" },
];
export const EQUIPMENT = {
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

export function SectionCard({ title, icon, children, id }) {
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

export function Label({ children, required }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
      {children}{required && <span className="text-[#F97316] ml-0.5">*</span>}
    </label>
  );
}

export function Input({ label, required, hint, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <Label required={required}>{label}</Label>}
      <input {...props}
        className="w-full border border-zinc-200 rounded-md px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/20 transition-colors bg-white placeholder:text-zinc-400" />
      {hint && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
}

export function Select({ label, required, children, className = "", ...props }) {
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

export function NumInput({ label, value, onChange, min = 0, className = "" }) {
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

export function formatPrice(val) {
  if (!val) return "";
  return Number(val).toLocaleString("fr-FR");
}

export function ImageGallery({ images, uploading, fileInputRef, handleImageUpload, removeImage, setAsMain, handleDragStart, handleDragOver, handleDragEnd, dragIdx, errors }) {
  return (
    <div data-field="images">
      {errors.images && <p className="text-red-500 text-xs font-medium mb-2">{errors.images}</p>}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {images.map((url, i) => (
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
        {images.length < 10 && (
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
  );
}

export function PropertySummaryCard({ form, priceNum }) {
  if (!form.title) return null;
  return (
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
  );
}
