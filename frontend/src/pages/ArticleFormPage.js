import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import RichEditor from "../components/RichEditor";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ImageIcon, ChevronDown, Upload, X } from "lucide-react";
import { CATEGORIES } from "../lib/categories";

export default function ArticleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const coverInputRef = useRef(null);

  const [form, setForm] = useState({ title: "", content: "", image_url: "", category: "" });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/articles/${id}`)
      .then((r) => {
        setForm({
          title: r.data.title || "",
          content: r.data.content || "",
          image_url: r.data.image_url || "",
          category: r.data.category || "",
        });
      })
      .catch(() => {
        toast.error("Article introuvable.");
        navigate("/admin");
      })
      .finally(() => setFetchLoading(false));
  }, [id, isEdit, navigate]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Le titre est requis.";
    if (form.title.trim().length < 3) e.title = "Le titre doit contenir au moins 3 caractères.";
    const textContent = form.content.replace(/<[^>]*>/g, "").trim();
    if (!textContent || textContent.length < 10) e.content = "Le contenu doit contenir au moins 10 caractères.";
    if (!form.category) e.category = "La catégorie est obligatoire.";
    return e;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  const handleContentChange = (value) => {
    setForm((prev) => ({ ...prev, content: value }));
    if (errors.content) setErrors((prev) => ({ ...prev, content: null }));
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
      setForm((prev) => ({ ...prev, image_url: res.data.url }));
      toast.success("Image de couverture uploadée !");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'upload de l'image.");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const removeCoverImage = () => {
    setForm((prev) => ({ ...prev, image_url: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content,
        image_url: form.image_url.trim() || null,
        category: form.category,
      };
      if (isEdit) {
        await api.put(`/articles/${id}`, payload);
        toast.success("Article modifié avec succès !");
      } else {
        await api.post("/articles", payload);
        toast.success("Article publié avec succès !");
      }
      navigate("/admin");
    } catch (err) {
      const msg = err.response?.data?.detail || "Une erreur est survenue.";
      toast.error(typeof msg === "string" ? msg : "Erreur de validation.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-white font-['Manrope']">
        <Header />
        <div className="flex justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-['Manrope']">
      <Header />
      <div className="h-1.5 bg-[#FF6600]" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          to="/admin"
          data-testid="back-to-dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] transition-colors duration-200 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au dashboard
        </Link>

        <div className="bg-white border border-zinc-200 p-8 md:p-10">
          <h1 className="font-['Oswald'] text-3xl font-bold uppercase tracking-tight text-black mb-1">
            {isEdit ? "Modifier l'article" : "Nouvel article"}
          </h1>
          <p className="text-sm text-zinc-500 mb-8">
            {isEdit ? "Modifiez les informations de votre article." : "Remplissez les informations de votre article."}
          </p>

          <form onSubmit={handleSubmit} data-testid="article-form" className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Titre <span className="text-[#FF6600]">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                data-testid="title-input"
                placeholder="Titre de votre article"
                className={`w-full border px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:ring-1 transition-colors ${
                  errors.title ? "border-red-400 focus:ring-red-400" : "border-zinc-300 focus:border-[#FF6600] focus:ring-[#FF6600]"
                }`}
              />
              {errors.title && <p className="text-red-600 text-xs mt-1" data-testid="title-error">{errors.title}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Catégorie <span className="text-[#FF6600]">*</span>
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  data-testid="category-select"
                  className={`w-full appearance-none border px-4 py-3 text-base font-['Manrope'] text-black bg-white focus:outline-none focus:ring-1 transition-colors cursor-pointer ${
                    errors.category ? "border-red-400 focus:ring-red-400" : "border-zinc-300 focus:border-[#FF6600] focus:ring-[#FF6600]"
                  }`}
                >
                  <option value="">— Sélectionner une catégorie —</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              </div>
              {errors.category && <p className="text-red-600 text-xs mt-1" data-testid="category-error">{errors.category}</p>}
            </div>

            {/* Cover image URL */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" />
                Image de couverture (optionnel)
              </label>
              <input
                type="url"
                name="image_url"
                value={form.image_url}
                onChange={handleChange}
                data-testid="image-url-input"
                placeholder="https://exemple.com/image.jpg"
                className="w-full border border-zinc-300 px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:border-[#FF6600] focus:ring-1 focus:ring-[#FF6600] transition-colors"
              />
              {form.image_url && (
                <div className="mt-3 overflow-hidden h-40 border border-zinc-200">
                  <img
                    src={form.image_url}
                    alt="Aperçu couverture"
                    data-testid="image-preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                </div>
              )}
            </div>

            {/* Rich Text Editor */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Contenu <span className="text-[#FF6600]">*</span>
                <span className="ml-2 text-zinc-400 normal-case font-normal tracking-normal">
                  — Insérez des images via l'icône image dans la barre d'outils
                </span>
              </label>
              <RichEditor
                value={form.content}
                onChange={handleContentChange}
                error={!!errors.content}
              />
              {errors.content && <p className="text-red-600 text-xs mt-1" data-testid="content-error">{errors.content}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                data-testid="submit-article-button"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#FF6600] text-white font-bold font-['Manrope'] uppercase tracking-wider px-8 py-3 hover:bg-[#CC5200] transition-colors duration-200 disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Publication..." : isEdit ? "Enregistrer" : "Publier"}
              </button>
              <Link
                to="/admin"
                data-testid="cancel-button"
                className="text-sm font-bold uppercase tracking-wider text-zinc-500 hover:text-black transition-colors px-4 py-3 border border-zinc-300 hover:border-black"
              >
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
