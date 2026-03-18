import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "../../../lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Send, Clock, Plus, Trash2, GripVertical, ChevronDown, ChevronRight,
  FileText, Upload, Download, X, Eye, Loader2, Globe, Tag, Sparkles, MessageSquare, Zap,
  Video, Link as LinkIcon
} from "lucide-react";

const FLAG_URL = (code) => `https://flagcdn.com/24x18/${code}.png`;

// ─── Sortable Step ─────────────────────────────────────────────────────────────
function SortableStep({ step, index, isOpen, onToggle, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="border border-zinc-700 bg-zinc-900/50 rounded-lg mb-2 overflow-hidden"
      data-testid={`step-${index}`}>
      {/* Step header */}
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer" onClick={onToggle}>
        <button {...attributes} {...listeners} className="cursor-grab text-zinc-600 hover:text-[#FF6600] p-1" onClick={e => e.stopPropagation()}>
          <GripVertical className="w-4 h-4" />
        </button>
        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${isOpen ? "bg-[#FF6600] text-white" : "bg-zinc-800 text-zinc-400"}`}>
          {index + 1}
        </div>
        <span className="flex-1 text-sm font-bold text-white truncate">{step.title || `Etape ${index + 1}`}</span>
        {step.mandatory && <span className="text-[9px] font-bold uppercase bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">Obligatoire</span>}
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1 text-zinc-600 hover:text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
      </div>

      {/* Step detail */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800">
          <div className="pt-3">
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block">Titre de l'etape</label>
            <input value={step.title} onChange={e => onUpdate({ ...step, title: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#FF6600]"
              data-testid={`step-title-${index}`} />
          </div>
          <div>
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block">Description</label>
            <textarea value={step.description} onChange={e => onUpdate({ ...step, description: e.target.value })} rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#FF6600] resize-none"
              data-testid={`step-desc-${index}`} />
          </div>
          {/* Required Documents */}
          <div>
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block flex items-center gap-1">
              <FileText className="w-3 h-3" /> Documents requis
            </label>
            <div className="space-y-1.5">
              {(step.required_documents || []).map((doc, di) => (
                <div key={di} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#FF6600]/20 border border-[#FF6600] rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#FF6600] rounded-sm" />
                  </div>
                  <input value={doc} onChange={e => {
                    const docs = [...step.required_documents];
                    docs[di] = e.target.value;
                    onUpdate({ ...step, required_documents: docs });
                  }} className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FF6600]" />
                  <button onClick={() => {
                    const docs = step.required_documents.filter((_, i) => i !== di);
                    onUpdate({ ...step, required_documents: docs });
                  }} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => onUpdate({ ...step, required_documents: [...(step.required_documents || []), ""] })}
                className="text-[#FF6600] text-xs font-bold flex items-center gap-1 hover:text-[#CC5200]">
                <Plus className="w-3 h-3" /> Ajouter un document
              </button>
            </div>
          </div>
          {/* Mandatory toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              step.mandatory ? "bg-[#FF6600] border-[#FF6600]" : "border-zinc-600"
            }`} onClick={() => onUpdate({ ...step, mandatory: !step.mandatory })}>
              {step.mandatory && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
            </div>
            <span className="text-zinc-300 text-xs">Cette etape est obligatoire</span>
          </label>
          {/* Video URL */}
          <div>
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block flex items-center gap-1">
              <Video className="w-3 h-3" /> URL Video
            </label>
            <input value={step.video_url || ""} onChange={e => onUpdate({ ...step, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=... ou URL directe"
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600]"
              data-testid={`step-video-${index}`} />
          </div>
          {/* Links */}
          <div>
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block flex items-center gap-1">
              <LinkIcon className="w-3 h-3" /> Liens utiles
            </label>
            <div className="space-y-1.5">
              {(step.links || []).map((link, li) => (
                <div key={li} className="flex items-center gap-2">
                  <input value={link.label || ""} onChange={e => {
                    const links = [...(step.links || [])];
                    links[li] = { ...links[li], label: e.target.value };
                    onUpdate({ ...step, links });
                  }} placeholder="Label" className="w-1/3 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FF6600]" />
                  <input value={link.url || ""} onChange={e => {
                    const links = [...(step.links || [])];
                    links[li] = { ...links[li], url: e.target.value };
                    onUpdate({ ...step, links });
                  }} placeholder="https://..." className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FF6600]" />
                  <button onClick={() => {
                    const links = (step.links || []).filter((_, i) => i !== li);
                    onUpdate({ ...step, links });
                  }} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <button onClick={() => onUpdate({ ...step, links: [...(step.links || []), { label: "", url: "" }] })}
                className="text-[#FF6600] text-xs font-bold flex items-center gap-1 hover:text-[#CC5200]">
                <Plus className="w-3 h-3" /> Ajouter un lien
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Builder ──────────────────────────────────────────────────────────────
export default function ProcedureBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // Reference data
  const [categories, setCategories] = useState([]);
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [chatActions, setChatActions] = useState([]);

  // Form state
  const [form, setForm] = useState({
    title: "", description: "", category: "visa_immigration", keywords: [],
    country: "guinee", language: "fr", complexity: "modere", active: true, status: "draft",
    image_url: "", video_url: "", main_image_url: "",
  });
  const [steps, setSteps] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [files, setFiles] = useState([]);
  const [openStep, setOpenStep] = useState(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load reference data
  useEffect(() => {
    Promise.all([
      api.get("/procedures/categories"),
      api.get("/procedures/countries"),
      api.get("/procedures/languages"),
      api.get("/chat-actions"),
    ]).then(([cat, cou, lang, chat]) => {
      setCategories(cat.data);
      setCountries(cou.data);
      setLanguages(lang.data);
      setChatActions(chat.data);
    }).catch(() => {});
  }, []);

  // Load existing procedure on edit
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api.get(`/procedures/${id}`)
      .then(r => {
        const p = r.data;
        setForm({
          title: p.title, description: p.description, category: p.category || "autre",
          keywords: p.keywords || [], country: p.country || p.subcategory || "guinee",
          language: p.language || "fr", complexity: p.complexity || "modere",
          active: p.active !== false, status: p.status || "draft", image_url: p.image_url || "",
          video_url: p.video_url || "", main_image_url: p.main_image_url || "",
        });
        setSteps((p.steps || []).map(s => ({ ...s, id: s.id || crypto.randomUUID() })));
        setQuickActions(p.quick_actions || []);
        setFiles(p.files || []);
        if (p.steps?.length > 0) setOpenStep(p.steps[0].id);
      })
      .catch(() => toast.error("Erreur chargement procedure"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // ── Steps Management ──
  const addStep = () => {
    const newStep = {
      id: crypto.randomUUID(), order: steps.length + 1,
      title: "", description: "", required_documents: [], links: [], video_url: "", mandatory: true,
    };
    setSteps(prev => [...prev, newStep]);
    setOpenStep(newStep.id);
  };

  const updateStep = (stepId, updated) => setSteps(prev => prev.map(s => s.id === stepId ? updated : s));
  const deleteStep = (stepId) => {
    setSteps(prev => prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 })));
    if (openStep === stepId) setOpenStep(null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSteps(prev => {
        const oldIndex = prev.findIndex(s => s.id === active.id);
        const newIndex = prev.findIndex(s => s.id === over.id);
        return arrayMove(prev, oldIndex, newIndex).map((s, i) => ({ ...s, order: i + 1 }));
      });
    }
  };

  // ── Quick Actions ──
  const addQuickAction = () => {
    setQuickActions(prev => [...prev, { id: crypto.randomUUID(), label: "", action_type: "navigate" }]);
  };
  const updateQuickAction = (qaId, field, value) => {
    setQuickActions(prev => prev.map(q => q.id === qaId ? { ...q, [field]: value } : q));
  };
  const deleteQuickAction = (qaId) => setQuickActions(prev => prev.filter(q => q.id !== qaId));

  // ── Keywords ──
  const addKeyword = () => {
    if (newKeyword.trim() && !form.keywords.includes(newKeyword.trim())) {
      setForm(f => ({ ...f, keywords: [...f.keywords, newKeyword.trim()] }));
      setNewKeyword("");
    }
  };

  // ── File Upload ──
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isEdit) { toast.error("Enregistrez d'abord la procedure avant d'ajouter des fichiers."); return; }
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/procedures/${id}/files`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setFiles(prev => [...prev, res.data]);
      toast.success("Fichier ajoute");
    } catch { toast.error("Erreur upload fichier"); }
    finally { setUploadingFile(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const deleteFile = async (fileId) => {
    try {
      await api.delete(`/procedures/files/${fileId}`);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success("Fichier supprime");
    } catch { toast.error("Erreur suppression"); }
  };

  // ── Save / Publish ──
  const handleSave = async (publishStatus) => {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return; }
    setSaving(true);
    const payload = {
      ...form, status: publishStatus || form.status,
      steps: steps.map((s, i) => ({
        ...s,
        order: i + 1,
        required_documents: s.required_documents.filter(d => d.trim()),
        links: (s.links || []).filter(l => l.url && l.url.trim()),
        video_url: s.video_url || "",
      })),
      quick_actions: quickActions.filter(q => q.label.trim()),
    };
    try {
      if (isEdit) {
        await api.put(`/procedures/${id}`, payload);
        toast.success(publishStatus === "published" ? "Procedure publiee !" : "Procedure enregistree");
      } else {
        const res = await api.post("/procedures", payload);
        toast.success("Procedure creee !");
        navigate(`/admin/procedures/modifier/${res.data.id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la sauvegarde");
    }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-['Manrope']">
      {/* Top Bar */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link to="/admin/procedures" className="p-2 text-zinc-400 hover:text-[#FF6600]" data-testid="back-to-list">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-['Oswald'] text-base sm:text-lg font-bold uppercase text-white">
              {isEdit ? "Modifier la Procedure" : "Creer une Procedure"}
            </h1>
            <p className="text-zinc-500 text-[10px] sm:text-xs">{isEdit ? `ID: ${id}` : "Nouvelle procedure"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave("published")} disabled={saving} data-testid="publish-btn"
            className="flex items-center gap-1.5 bg-[#FF6600] text-white text-xs font-bold uppercase px-4 py-2.5 hover:bg-[#CC5200] disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publier
          </button>
          <button onClick={() => handleSave("draft")} disabled={saving} data-testid="save-draft-btn"
            className="flex items-center gap-1.5 border border-zinc-600 text-zinc-300 text-xs font-bold uppercase px-4 py-2.5 hover:border-[#FF6600] hover:text-[#FF6600] disabled:opacity-50">
            <Save className="w-4 h-4" /> Enregistrer
          </button>
          <button className="flex items-center gap-1.5 border border-zinc-700 text-zinc-500 text-xs font-bold uppercase px-3 py-2.5 hover:text-zinc-300">
            <Clock className="w-4 h-4" /> Historique
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Informations */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="section-info">
            <h2 className="text-[#FF6600] font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Informations de Procedure</h2>
            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Titre de la procedure</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Visa visiteur Canada" data-testid="proc-title"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  placeholder="Instructions detaillees..." data-testid="proc-desc"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600] resize-none" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block flex items-center gap-1">
                  <Video className="w-3 h-3" /> URL Video (optionnel)
                </label>
                <input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=... ou URL directe de la video"
                  data-testid="proc-video-url"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Image principale (optionnel)</label>
                <div className="flex items-start gap-3">
                  <input value={form.main_image_url} onChange={e => setForm(f => ({ ...f, main_image_url: e.target.value }))}
                    placeholder="URL de l'image principale ou uploadez ci-dessous"
                    data-testid="proc-main-image-url"
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
                  <label className="flex items-center gap-1.5 bg-zinc-700 text-zinc-300 text-xs font-bold uppercase px-3 py-2.5 hover:bg-zinc-600 cursor-pointer transition-colors flex-shrink-0">
                    <Upload className="w-3.5 h-3.5" /> Upload
                    <input type="file" accept="image/*" className="hidden" data-testid="proc-main-image-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
                          const url = res.data.urls?.[0] || res.data.url;
                          if (url) setForm(f => ({ ...f, main_image_url: url }));
                          toast.success("Image principale uploadee");
                        } catch { toast.error("Erreur upload image"); }
                        e.target.value = "";
                      }} />
                  </label>
                </div>
                {form.main_image_url && (
                  <div className="mt-2 relative inline-block">
                    <img src={form.main_image_url} alt="Apercu" className="h-24 rounded border border-zinc-700 object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, main_image_url: "" }))}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Categorie</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} data-testid="proc-category"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Keywords</label>
                  <div className="flex items-center gap-2">
                    <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                      placeholder="Ajouter un tag..." data-testid="proc-keyword-input"
                      className="flex-1 bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
                    <button onClick={addKeyword} className="bg-zinc-700 text-white px-3 py-2.5 text-sm hover:bg-zinc-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {form.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.keywords.map((kw, i) => (
                        <span key={i} className="bg-[#FF6600]/20 text-[#FF6600] text-xs font-bold px-2 py-0.5 flex items-center gap-1.5">
                          {kw}
                          <button onClick={() => setForm(f => ({ ...f, keywords: f.keywords.filter((_, j) => j !== i) }))} className="hover:text-white">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Country</label>
                  <div className="relative">
                    <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} data-testid="proc-country"
                      className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600] pl-10">
                      {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <img src={FLAG_URL(countries.find(c => c.id === form.country)?.flag || "un")} alt=""
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-4" />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Langue</label>
                  <div className="relative">
                    <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} data-testid="proc-language"
                      className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600] pl-10">
                      {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <img src={FLAG_URL(languages.find(l => l.id === form.language)?.flag || "un")} alt=""
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-4" />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Complexite</label>
                  <select value={form.complexity} onChange={e => setForm(f => ({ ...f, complexity: e.target.value }))} data-testid="proc-complexity"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]">
                    <option value="facile">Facile</option>
                    <option value="modere">Modere</option>
                    <option value="difficile">Difficile</option>
                  </select>
                </div>
              </div>
              {/* Active toggle */}
              <div className="flex items-center justify-between bg-zinc-800 px-4 py-3 rounded">
                <span className="text-zinc-300 text-sm font-bold">Procedure active ?</span>
                <button onClick={() => setForm(f => ({ ...f, active: !f.active }))} data-testid="proc-active-toggle"
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.active ? "bg-[#FF6600]" : "bg-zinc-600"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${form.active ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Steps Builder */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="section-steps">
            <h2 className="text-[#FF6600] font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Etapes de Procedure</h2>
            {steps.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {steps.map((step, i) => (
                    <SortableStep key={step.id} step={step} index={i}
                      isOpen={openStep === step.id} onToggle={() => setOpenStep(openStep === step.id ? null : step.id)}
                      onUpdate={(updated) => updateStep(step.id, updated)} onDelete={() => deleteStep(step.id)} />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-zinc-600 text-sm text-center py-6">Aucune etape. Ajoutez-en une.</p>
            )}
            <button onClick={addStep} data-testid="add-step-btn"
              className="mt-3 flex items-center gap-2 text-[#FF6600] text-xs font-bold uppercase hover:text-[#CC5200] transition-colors">
              <Plus className="w-4 h-4" /> Ajouter une etape
            </button>
          </section>

          {/* Section 5: Files */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="section-files">
            <h2 className="text-[#FF6600] font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Conditions et Fichiers</h2>
            {form.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {form.keywords.map((kw, i) => (
                  <span key={i} className="bg-[#FF6600]/20 text-[#FF6600] text-[10px] font-bold px-2 py-0.5">{kw}</span>
                ))}
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden"
              accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png,.webp" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile || !isEdit} data-testid="upload-file-btn"
              className="flex items-center gap-2 border border-dashed border-zinc-600 text-zinc-400 text-xs font-bold px-4 py-3 w-full hover:border-[#FF6600] hover:text-[#FF6600] disabled:opacity-50 transition-colors mb-3">
              {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {!isEdit ? "Enregistrez d'abord pour ajouter des fichiers" : "Ajouter un formulaire / fichier"}
            </button>
            {files.length > 0 ? (
              <div className="space-y-1.5">
                {files.map(f => (
                  <div key={f.id} className="flex items-center gap-3 bg-zinc-800 px-3 py-2.5 rounded group" data-testid={`file-${f.id}`}>
                    <FileText className="w-4 h-4 text-[#FF6600] flex-shrink-0" />
                    <span className="text-white text-sm flex-1 truncate">{f.file_name || f.original_filename}</span>
                    <span className="text-zinc-600 text-[10px] uppercase">{f.file_type}</span>
                    <a href={`${process.env.REACT_APP_BACKEND_URL}/api/procedures/files/${f.id}/download`} target="_blank" rel="noreferrer"
                      className="p-1 text-zinc-500 hover:text-green-400"><Download className="w-3.5 h-3.5" /></a>
                    <button onClick={() => deleteFile(f.id)} className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 text-xs text-center py-3">Aucun fichier attache.</p>
            )}
          </section>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">

          {/* Chat Actions */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="section-chat-actions">
            <h2 className="text-[#FF6600] font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Options de Chat
            </h2>
            <p className="text-zinc-500 text-xs mb-3">Actions rapides pour l'assistant IA :</p>
            {chatActions.length > 0 ? (
              <div className="space-y-1.5">
                {chatActions.map(a => (
                  <div key={a.id} className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded">
                    {a.country_flag && <img src={FLAG_URL(a.country_flag)} alt="" className="w-5 h-4" />}
                    <span className="text-white text-sm flex-1">{a.title}</span>
                    <ChevronDown className="w-3 h-3 text-zinc-600" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 text-xs text-center py-4">Aucune action configuree.</p>
            )}
          </section>

          {/* Quick Actions */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="section-quick-actions">
            <h2 className="text-[#FF6600] font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Bulles rapides
            </h2>
            <div className="space-y-2">
              {quickActions.map((qa, i) => (
                <div key={qa.id} className="flex items-center gap-2" data-testid={`qa-${i}`}>
                  <select value={qa.action_type} onChange={e => updateQuickAction(qa.id, "action_type", e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] px-2 py-1.5 w-20 focus:outline-none focus:border-[#FF6600]">
                    <option value="navigate">Nav</option>
                    <option value="download">DL</option>
                    <option value="start_procedure">Start</option>
                  </select>
                  <input value={qa.label} onChange={e => updateQuickAction(qa.id, "label", e.target.value)}
                    placeholder="Label..." className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FF6600]" />
                  <button onClick={() => deleteQuickAction(qa.id)} className="text-zinc-600 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <ChevronRight className="w-3 h-3 text-zinc-600" />
                </div>
              ))}
            </div>
            <button onClick={addQuickAction} data-testid="add-qa-btn"
              className="mt-3 flex items-center gap-1.5 text-[#FF6600] text-xs font-bold hover:text-[#CC5200]">
              <Plus className="w-3 h-3" /> Ajouter une action
            </button>
          </section>

          {/* Preview */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="section-preview">
            <h2 className="text-[#FF6600] font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Apercu
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Titre</span><span className="text-white font-bold truncate ml-2">{form.title || "—"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Categorie</span><span className="text-white">{categories.find(c => c.id === form.category)?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Pays</span>
                <span className="text-white flex items-center gap-1">
                  <img src={FLAG_URL(countries.find(c => c.id === form.country)?.flag || "un")} alt="" className="w-4 h-3" />
                  {countries.find(c => c.id === form.country)?.name || "—"}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-zinc-500">Complexite</span>
                <span className={`font-bold ${form.complexity === "facile" ? "text-green-400" : form.complexity === "modere" ? "text-yellow-400" : "text-red-400"}`}>
                  {form.complexity}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-zinc-500">Etapes</span><span className="text-white font-bold">{steps.length}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Fichiers</span><span className="text-white font-bold">{files.length}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Statut</span>
                <span className={`font-bold ${form.status === "published" ? "text-green-400" : "text-yellow-400"}`}>{form.status}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
