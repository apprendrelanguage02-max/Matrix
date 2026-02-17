import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import api from "../lib/api";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ImageIcon, Plus, X, ChevronDown } from "lucide-react";
import { CATEGORIES } from "../lib/categories";

export default function ArticleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const textareaRef = useRef(null);

  const [form, setForm] = useState({ title: "", content: "", image_url: "", category: "" });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [showInlineImgInput, setShowInlineImgInput] = useState(false);
  const [inlineImgUrl, setInlineImgUrl] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/articles/${id}`)
      .then((r) => {
        setForm({
          title: r.data.title || "",
          content: r.data.content || "",
          image_url: r.data.image_url || "",
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
    if (!form.content.trim()) e.content = "Le contenu est requis.";
    return e;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
  };

  // Insert [img:URL] at cursor position in textarea
  const insertInlineImage = () => {
    const url = inlineImgUrl.trim();
    if (!url) return;
    const ta = textareaRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = form.content.slice(0, start);
    const after = form.content.slice(end);
    const tag = `\n[img:${url}]\n`;
    const newContent = before + tag + after;
    setForm({ ...form, content: newContent });
    setInlineImgUrl("");
    setShowInlineImgInput(false);
    // Restore focus
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + tag.length;
    }, 50);
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
        content: form.content.trim(),
        image_url: form.image_url.trim() || null,
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
      toast.error(msg);
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                  errors.title
                    ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                    : "border-zinc-300 focus:border-[#FF6600] focus:ring-[#FF6600]"
                }`}
              />
              {errors.title && (
                <p className="text-red-600 text-xs mt-1" data-testid="title-error">{errors.title}</p>
              )}
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

            {/* Content with inline image toolbar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Contenu <span className="text-[#FF6600]">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowInlineImgInput((v) => !v)}
                  data-testid="insert-image-btn"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-[#FF6600] border border-zinc-300 hover:border-[#FF6600] px-3 py-1.5 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Insérer une image
                </button>
              </div>

              {/* Inline image input popup */}
              {showInlineImgInput && (
                <div className="mb-3 flex gap-2 items-center bg-zinc-50 border border-[#FF6600] p-3" data-testid="inline-image-panel">
                  <ImageIcon className="w-4 h-4 text-[#FF6600] flex-shrink-0" />
                  <input
                    type="url"
                    value={inlineImgUrl}
                    onChange={(e) => setInlineImgUrl(e.target.value)}
                    data-testid="inline-image-url-input"
                    placeholder="https://exemple.com/photo.jpg"
                    className="flex-1 bg-white border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), insertInlineImage())}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={insertInlineImage}
                    data-testid="confirm-inline-image-btn"
                    className="bg-[#FF6600] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 hover:bg-[#CC5200] transition-colors whitespace-nowrap"
                  >
                    Insérer
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowInlineImgInput(false); setInlineImgUrl(""); }}
                    className="text-zinc-400 hover:text-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <textarea
                ref={textareaRef}
                name="content"
                value={form.content}
                onChange={handleChange}
                data-testid="content-input"
                rows={14}
                placeholder={`Rédigez le contenu de votre article ici...\n\nAstuce : utilisez le bouton "Insérer une image" pour ajouter des images dans votre texte.`}
                className={`w-full border px-4 py-3 text-base font-['Manrope'] text-black placeholder:text-zinc-300 focus:outline-none focus:ring-1 transition-colors resize-y ${
                  errors.content
                    ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                    : "border-zinc-300 focus:border-[#FF6600] focus:ring-[#FF6600]"
                }`}
              />
              {errors.content && (
                <p className="text-red-600 text-xs mt-1" data-testid="content-error">{errors.content}</p>
              )}
              <p className="text-xs text-zinc-400 mt-1">
                {form.content.replace(/\[img:[^\]]+\]/g, "").length} caractères —{" "}
                <span className="text-zinc-400">
                  {(form.content.match(/\[img:[^\]]+\]/g) || []).length} image(s) intégrée(s)
                </span>
              </p>
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
