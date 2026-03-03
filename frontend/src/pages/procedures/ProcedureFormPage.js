import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/layout/Footer";
import AdvancedRichEditor from "../../components/AdvancedRichEditor";
import api from "../../lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Upload, X, FileText } from "lucide-react";

export default function ProcedureFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const coverInputRef = useRef(null);
  
  const [form, setForm] = useState({
    title: "",
    subcategory: "",
    content: "",
    image_url: ""
  });
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Fetch subcategories
  useEffect(() => {
    api.get("/procedures/subcategories")
      .then(r => setSubcategories(r.data))
      .catch(() => toast.error("Erreur chargement sous-catégories"));
  }, []);
  
  // Fetch existing procedure if editing
  useEffect(() => {
    if (isEdit) {
      api.get(`/procedures/${id}`)
        .then(r => {
          setForm({
            title: r.data.title,
            subcategory: r.data.subcategory,
            content: r.data.content,
            image_url: r.data.image_url || ""
          });
        })
        .catch(() => {
          toast.error("Procédure introuvable");
          navigate("/procedures");
        })
        .finally(() => setFetchLoading(false));
    }
  }, [id, isEdit, navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };
  
  const handleContentChange = (value) => {
    setForm(prev => ({ ...prev, content: value }));
    if (errors.content) setErrors(prev => ({ ...prev, content: null }));
  };
  
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(prev => ({ ...prev, image_url: res.data.url }));
      toast.success("Image de couverture uploadée !");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'upload");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };
  
  const removeCoverImage = () => {
    setForm(prev => ({ ...prev, image_url: "" }));
  };
  
  const validate = () => {
    const e = {};
    if (!form.title.trim() || form.title.length < 5) {
      e.title = "Le titre doit contenir au moins 5 caractères";
    }
    if (!form.subcategory) {
      e.subcategory = "Veuillez sélectionner un pays";
    }
    if (!form.content || form.content.replace(/<[^>]+>/g, "").trim().length < 10) {
      e.content = "Le contenu doit contenir au moins 10 caractères";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/procedures/${id}`, form);
        toast.success("Procédure mise à jour !");
      } else {
        await api.post("/procedures", form);
        toast.success("Procédure créée !");
      }
      navigate("/procedures");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };
  
  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      
      {/* Hero */}
      <section className="bg-black py-8 sm:py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FF6600] rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-[#FF6600] text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">
                Administration
              </p>
              <h1 className="font-['Oswald'] text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">
                {isEdit ? "Modifier la procédure" : "Nouvelle procédure"}
              </h1>
            </div>
          </div>
        </div>
      </section>
      <div className="h-1 bg-[#FF6600]" />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link to="/procedures" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-[#FF6600] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour aux procédures
        </Link>
        
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 p-6 sm:p-8">
          {/* Title */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Titre de la procédure *
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Ex: Comment obtenir un visa touristique..."
              className={`w-full border ${errors.title ? "border-red-500" : "border-zinc-300"} px-4 py-3 text-base focus:outline-none focus:border-[#FF6600]`}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>
          
          {/* Subcategory */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Pays *
            </label>
            <select
              name="subcategory"
              value={form.subcategory}
              onChange={handleChange}
              className={`w-full border ${errors.subcategory ? "border-red-500" : "border-zinc-300"} px-4 py-3 text-base focus:outline-none focus:border-[#FF6600]`}
            >
              <option value="">Sélectionnez un pays</option>
              {subcategories.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.flag} {sub.name}
                </option>
              ))}
            </select>
            {errors.subcategory && <p className="text-red-500 text-xs mt-1">{errors.subcategory}</p>}
          </div>
          
          {/* Cover image */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Image de couverture (optionnel)
            </label>
            
            {form.image_url ? (
              <div className="relative overflow-hidden h-48 border border-zinc-200 group">
                <img
                  src={form.image_url}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeCoverImage}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center h-40 border-2 border-dashed border-zinc-300 hover:border-[#FF6600] cursor-pointer transition-colors ${uploadingCover ? "opacity-50" : ""}`}>
                {uploadingCover ? (
                  <Loader2 className="w-8 h-8 text-[#FF6600] animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                    <span className="text-sm text-zinc-500">Cliquez pour uploader</span>
                  </>
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingCover}
                  onChange={handleCoverUpload}
                />
              </label>
            )}
          </div>
          
          {/* Content */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Contenu *
            </label>
            <AdvancedRichEditor
              value={form.content}
              onChange={handleContentChange}
              placeholder="Rédigez le contenu de la procédure..."
            />
            {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
          </div>
          
          {/* Submit */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-200">
            <Link
              to="/procedures"
              className="px-6 py-3 text-sm font-bold uppercase tracking-wider text-zinc-600 hover:text-black"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider bg-[#FF6600] text-white hover:bg-[#CC5200] transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Mettre à jour" : "Publier"}
            </button>
          </div>
        </form>
      </main>
      
      <Footer />
    </div>
  );
}
