import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import BlockEditor from "../components/BlockEditor";
import api from "../lib/api";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, ImageIcon, ChevronDown, Upload, X,
  Save, Send, Clock, Eye, FileText, Tag, Search, Zap,
  BookOpen, BarChart3, Link2, Calendar
} from "lucide-react";
import { CATEGORIES } from "../lib/categories";

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").slice(0, 100);
}

function computeWordCount(blocks, content) {
  let text = "";
  if (blocks?.length) {
    blocks.forEach(b => {
      if (b.type === "text") text += " " + (b.data?.content || "").replace(/<[^>]*>/g, "");
      else if (b.type === "quote") text += " " + (b.data?.text || "");
      else if (b.type === "alert") text += " " + (b.data?.content || "");
    });
  } else if (content) {
    text = content.replace(/<[^>]*>/g, "");
  }
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return { words, readingTime: Math.max(1, Math.ceil(words / 200)) };
}

function readabilityScore(text) {
  if (!text || text.length < 50) return { score: 0, label: "-" };
  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
  const avgWords = words / sentences;
  if (avgWords <= 15) return { score: 90, label: "Excellent" };
  if (avgWords <= 20) return { score: 70, label: "Bon" };
  if (avgWords <= 25) return { score: 50, label: "Moyen" };
  return { score: 30, label: "Difficile" };
}

export default function ArticleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const coverInputRef = useRef(null);
  const autosaveTimer = useRef(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", subtitle: "", content: "", blocks: [],
    image_url: "", image_alt: "", category: "",
    tags: [], is_breaking: false, slug: "",
    meta_title: "", meta_description: "",
    status: "draft", scheduled_at: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [uploadingCover, setUploadingCover] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/articles/${id}`)
      .then(r => {
        const d = r.data;
        setForm({
          title: d.title || "", subtitle: d.subtitle || "",
          content: d.content || "", blocks: d.blocks || [],
          image_url: d.image_url || "", image_alt: d.image_alt || "",
          category: d.category || "", tags: d.tags || [],
          is_breaking: d.is_breaking || false, slug: d.slug || "",
          meta_title: d.meta_title || "", meta_description: d.meta_description || "",
          status: d.status || "draft", scheduled_at: d.scheduled_at || "",
        });
      })
      .catch(() => { toast.error("Article introuvable."); navigate("/admin"); })
      .finally(() => setFetchLoading(false));
  }, [id, isEdit, navigate]);

  // Auto-save every 30s for existing articles
  const doAutosave = useCallback(async () => {
    if (!isEdit || loading) return;
    setAutoSaving(true);
    try {
      const res = await api.put(`/articles/${id}/autosave`, {
        title: form.title, subtitle: form.subtitle, content: form.content,
        blocks: form.blocks, category: form.category, tags: form.tags,
        image_url: form.image_url, meta_title: form.meta_title,
        meta_description: form.meta_description,
      });
      setLastSaved(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch {}
    finally { setAutoSaving(false); }
  }, [isEdit, id, form, loading]);

  useEffect(() => {
    if (!isEdit) return;
    autosaveTimer.current = setInterval(doAutosave, 30000);
    return () => clearInterval(autosaveTimer.current);
  }, [doAutosave, isEdit]);

  const validate = () => {
    const e = {};
    if (!form.title.trim() || form.title.trim().length < 3) e.title = "Le titre doit contenir au moins 3 caracteres.";
    if (!form.category) e.category = "La categorie est obligatoire.";
    const hasBlocks = form.blocks.some(b => {
      if (b.type === "text") return (b.data?.content || "").replace(/<[^>]*>/g, "").trim().length > 0;
      if (b.type === "image") return !!b.data?.url;
      if (b.type === "video") return !!b.data?.url;
      if (b.type === "quote") return !!b.data?.text;
      if (b.type === "alert") return !!b.data?.content;
      return true;
    });
    if (!hasBlocks && !form.content) e.blocks = "Ajoutez au moins un bloc de contenu.";
    return e;
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm(prev => ({ ...prev, image_url: res.data.url }));
      toast.success("Image uploade !");
    } catch { toast.error("Erreur upload image."); }
    finally { setUploadingCover(false); if (coverInputRef.current) coverInputRef.current.value = ""; }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag) && form.tags.length < 10) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput("");
    }
  };

  const removeTag = (t) => setForm(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }));

  const handleSubmit = async (status) => {
    const validation = validate();
    if (Object.keys(validation).length > 0) { setErrors(validation); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        status,
        slug: form.slug || slugify(form.title),
        image_url: form.image_url || null,
      };
      if (isEdit) {
        await api.put(`/articles/${id}`, payload);
        toast.success(status === "published" ? "Article publie !" : "Article sauvegarde !");
      } else {
        await api.post("/articles", payload);
        toast.success(status === "published" ? "Article publie !" : "Brouillon cree !");
      }
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur.");
    } finally { setLoading(false); }
  };

  // Indicators
  const plainText = form.blocks.reduce((acc, b) => {
    if (b.type === "text") return acc + " " + (b.data?.content || "").replace(/<[^>]*>/g, "");
    if (b.type === "quote") return acc + " " + (b.data?.text || "");
    if (b.type === "alert") return acc + " " + (b.data?.content || "");
    return acc;
  }, form.content ? form.content.replace(/<[^>]*>/g, "") : "");
  const { words: wordCount, readingTime } = computeWordCount(form.blocks, form.content);
  const readability = readabilityScore(plainText);
  const slugPreview = form.slug || slugify(form.title || "");
  const metaTitlePreview = form.meta_title || form.title || "Titre de l'article";
  const metaDescPreview = form.meta_description || plainText.slice(0, 160) || "Description...";

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 font-['Manrope']">
      {/* Top bar */}
      <header className="bg-black text-white h-14 flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-50 shadow-lg" data-testid="editor-topbar">
        <Link to="/admin" className="p-2 text-zinc-400 hover:text-white transition-colors" data-testid="editor-back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="hidden sm:block">
          <p className="text-xs font-bold leading-tight truncate max-w-[200px]">{form.title || "Nouvel article"}</p>
          <p className="text-[10px] text-zinc-500">
            {autoSaving ? "Sauvegarde..." : lastSaved ? `Sauvegarde a ${lastSaved}` : isEdit ? "Autosave actif" : "Nouveau"}
          </p>
        </div>
        <div className="flex-1" />
        {/* Status badge */}
        <span className={`text-[10px] font-bold uppercase px-2 py-1 ${
          form.status === "published" ? "bg-green-600" : form.status === "scheduled" ? "bg-blue-600" : "bg-yellow-600"
        } text-white`}>
          {form.status === "published" ? "Publie" : form.status === "scheduled" ? "Programme" : "Brouillon"}
        </span>
        <button onClick={() => handleSubmit("draft")} disabled={loading} data-testid="save-draft-btn"
          className="flex items-center gap-1.5 px-3 py-2 border border-zinc-600 text-zinc-300 text-xs font-bold uppercase tracking-wider hover:border-white hover:text-white transition-colors disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> {loading ? "..." : "Brouillon"}
        </button>
        <button onClick={() => handleSubmit("published")} disabled={loading} data-testid="publish-btn"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6600] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#CC5200] transition-colors disabled:opacity-50">
          <Send className="w-3.5 h-3.5" /> {loading ? "..." : "Publier"}
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main editor */}
          <div className="flex-1 space-y-4 min-w-0">
            {/* Title */}
            <div className="bg-white border border-zinc-200 rounded-lg p-6">
              <input value={form.title} onChange={e => { setForm(prev => ({ ...prev, title: e.target.value })); if (errors.title) setErrors(prev => ({ ...prev, title: null })); }}
                data-testid="title-input" placeholder="Titre de l'article..."
                className="w-full font-['Oswald'] text-2xl sm:text-3xl font-bold uppercase tracking-tight text-black placeholder:text-zinc-300 focus:outline-none border-none" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              <input value={form.subtitle} onChange={e => setForm(prev => ({ ...prev, subtitle: e.target.value }))}
                data-testid="subtitle-input" placeholder="Sous-titre / Chapeau..."
                className="w-full text-base text-zinc-600 placeholder:text-zinc-300 focus:outline-none border-none mt-3" />
            </div>

            {/* Cover image */}
            <div className="bg-white border border-zinc-200 rounded-lg p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Image principale</p>
              {form.image_url ? (
                <div className="relative group rounded-lg overflow-hidden h-48 sm:h-56">
                  <img src={form.image_url} alt={form.image_alt} className="w-full h-full object-cover" data-testid="cover-preview" />
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, image_url: "" }))}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center h-36 border-2 border-dashed border-zinc-300 hover:border-[#FF6600] cursor-pointer transition-colors rounded-lg ${uploadingCover ? "opacity-50" : ""}`}>
                  {uploadingCover ? <Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /> : (
                    <><Upload className="w-6 h-6 text-zinc-400 mb-1" /><span className="text-xs text-zinc-500">Upload image de couverture</span></>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} data-testid="cover-upload" />
                </label>
              )}
              {form.image_url && (
                <input value={form.image_alt} onChange={e => setForm(prev => ({ ...prev, image_alt: e.target.value }))}
                  placeholder="Texte alternatif de l'image (SEO)" className="w-full text-xs mt-2 border-b border-zinc-200 py-1 px-1 focus:outline-none focus:border-[#FF6600]" />
              )}
            </div>

            {/* Breaking News + Category */}
            <div className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Categorie *</p>
                <select value={form.category} onChange={e => { setForm(prev => ({ ...prev, category: e.target.value })); if (errors.category) setErrors(prev => ({ ...prev, category: null })); }}
                  data-testid="category-select" className="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600] bg-white">
                  <option value="">Selectionner...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer" data-testid="breaking-toggle">
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${form.is_breaking ? "bg-red-500" : "bg-zinc-300"}`}
                    onClick={() => setForm(prev => ({ ...prev, is_breaking: !prev.is_breaking }))}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${form.is_breaking ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1"><Zap className="w-3 h-3" /> Breaking</span>
                </label>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white border border-zinc-200 rounded-lg p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5"><Tag className="w-3 h-3" /> Tags</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 bg-zinc-100 text-xs font-bold px-2 py-1 rounded">
                    {t} <button type="button" onClick={() => removeTag(t)} className="text-zinc-400 hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Ajouter un tag..." className="flex-1 border border-zinc-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#FF6600]" />
                <button type="button" onClick={addTag} className="text-xs font-bold text-[#FF6600] hover:underline uppercase">Ajouter</button>
              </div>
            </div>

            {/* Block Editor */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Contenu editorial</p>
              {errors.blocks && <p className="text-red-500 text-xs mb-2">{errors.blocks}</p>}
              <BlockEditor blocks={form.blocks} onChange={blocks => { setForm(prev => ({ ...prev, blocks })); if (errors.blocks) setErrors(prev => ({ ...prev, blocks: null })); }} />
            </div>
          </div>

          {/* Right Panel */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-4" data-testid="editor-sidebar">
            {/* Indicators */}
            <div className="bg-white border border-zinc-200 rounded-lg p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> Indicateurs</h3>
              <div className="grid grid-cols-2 gap-3">
                <div data-testid="word-count">
                  <p className="text-[10px] text-zinc-400 uppercase">Mots</p>
                  <p className="font-['Oswald'] text-xl font-bold">{wordCount}</p>
                </div>
                <div data-testid="reading-time">
                  <p className="text-[10px] text-zinc-400 uppercase">Temps de lecture</p>
                  <p className="font-['Oswald'] text-xl font-bold">{readingTime} min</p>
                </div>
                <div className="col-span-2" data-testid="readability">
                  <p className="text-[10px] text-zinc-400 uppercase mb-1">Lisibilite</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{
                        width: `${readability.score}%`,
                        backgroundColor: readability.score >= 70 ? "#16a34a" : readability.score >= 50 ? "#f59e0b" : "#dc2626"
                      }} />
                    </div>
                    <span className="text-xs font-bold">{readability.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => setSeoOpen(!seoOpen)} data-testid="seo-toggle"
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5"><Search className="w-3 h-3" /> SEO</span>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${seoOpen ? "rotate-180" : ""}`} />
              </button>
              {seoOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-zinc-100">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase">Slug</label>
                    <div className="flex items-center gap-1 border border-zinc-200 rounded px-2 py-1 mt-1">
                      <Link2 className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                      <input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder={slugPreview} className="flex-1 text-xs focus:outline-none" data-testid="slug-input" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase">Meta Title</label>
                    <input value={form.meta_title} onChange={e => setForm(prev => ({ ...prev, meta_title: e.target.value }))}
                      placeholder={form.title} className="w-full border border-zinc-200 rounded px-2 py-1 text-xs mt-1 focus:outline-none focus:border-[#FF6600]" data-testid="meta-title-input" />
                    <p className="text-[10px] text-zinc-400 mt-0.5">{(form.meta_title || form.title || "").length}/60</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase">Meta Description</label>
                    <textarea value={form.meta_description} onChange={e => setForm(prev => ({ ...prev, meta_description: e.target.value }))}
                      placeholder="Description pour les moteurs de recherche..." rows={3}
                      className="w-full border border-zinc-200 rounded px-2 py-1 text-xs mt-1 resize-none focus:outline-none focus:border-[#FF6600]" data-testid="meta-desc-input" />
                    <p className="text-[10px] text-zinc-400 mt-0.5">{(form.meta_description || "").length}/160</p>
                  </div>
                  {/* Search preview */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 mt-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Apercu Google</p>
                    <p className="text-sm text-blue-700 font-medium truncate">{metaTitlePreview}</p>
                    <p className="text-[11px] text-green-700 truncate">matrixnews.com/{slugPreview}</p>
                    <p className="text-[11px] text-zinc-500 line-clamp-2">{metaDescPreview.slice(0, 160)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule */}
            {form.status !== "published" && (
              <div className="bg-white border border-zinc-200 rounded-lg p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Programmation</h3>
                <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                  data-testid="schedule-input" className="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]" />
                {form.scheduled_at && (
                  <button type="button" onClick={() => handleSubmit("scheduled")} disabled={loading}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white text-xs font-bold uppercase py-2 hover:bg-blue-700 transition-colors disabled:opacity-50">
                    <Clock className="w-3.5 h-3.5" /> Programmer
                  </button>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
