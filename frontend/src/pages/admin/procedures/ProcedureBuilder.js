import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import api from "../../../lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Send, Clock, Plus, X, Upload, Loader2, Video, Tag
} from "lucide-react";
import { SortableStep } from "./ProcedureStep";
import { ChatActionsSection, QuickActionsSection, PreviewSection, FilesSection } from "./ProcedureSidebar";

const FLAG_URL = (code) => `https://flagcdn.com/24x18/${code}.png`;

export default function ProcedureBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [categories, setCategories] = useState([]);
  const [countries, setCountries] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [chatActions, setChatActions] = useState([]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    Promise.all([
      api.get("/procedures/categories"), api.get("/procedures/countries"),
      api.get("/procedures/languages"), api.get("/chat-actions"),
    ]).then(([cat, cou, lang, chat]) => {
      setCategories(cat.data); setCountries(cou.data);
      setLanguages(lang.data); setChatActions(chat.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api.get(`/procedures/${id}`).then(r => {
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
    }).catch(() => toast.error("Erreur chargement procedure"))
    .finally(() => setLoading(false));
  }, [id, isEdit]);

  const addStep = () => {
    const s = { id: crypto.randomUUID(), order: steps.length + 1, title: "", description: "", required_documents: [], links: [], video_url: "", mandatory: true };
    setSteps(prev => [...prev, s]); setOpenStep(s.id);
  };
  const updateStep = (stepId, updated) => setSteps(prev => prev.map(s => s.id === stepId ? updated : s));
  const deleteStep = (stepId) => { setSteps(prev => prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i + 1 }))); if (openStep === stepId) setOpenStep(null); };
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) setSteps(prev => { const oi = prev.findIndex(s => s.id === active.id); const ni = prev.findIndex(s => s.id === over.id); return arrayMove(prev, oi, ni).map((s, i) => ({ ...s, order: i + 1 })); });
  };

  const addQuickAction = () => setQuickActions(prev => [...prev, { id: crypto.randomUUID(), label: "", action_type: "navigate" }]);
  const updateQuickAction = (qaId, field, value) => setQuickActions(prev => prev.map(q => q.id === qaId ? { ...q, [field]: value } : q));
  const deleteQuickAction = (qaId) => setQuickActions(prev => prev.filter(q => q.id !== qaId));

  const addKeyword = () => { if (newKeyword.trim() && !form.keywords.includes(newKeyword.trim())) { setForm(f => ({ ...f, keywords: [...f.keywords, newKeyword.trim()] })); setNewKeyword(""); } };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!isEdit) { toast.error("Enregistrez d'abord la procedure."); return; }
    setUploadingFile(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await api.post(`/procedures/${id}/files`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setFiles(prev => [...prev, res.data]); toast.success("Fichier ajoute");
    } catch { toast.error("Erreur upload fichier"); }
    finally { setUploadingFile(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };
  const deleteFile = async (fileId) => { try { await api.delete(`/procedures/files/${fileId}`); setFiles(prev => prev.filter(f => f.id !== fileId)); toast.success("Fichier supprime"); } catch { toast.error("Erreur suppression"); } };

  const handleSave = async (publishStatus) => {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return; }
    setSaving(true);
    const payload = {
      ...form, status: publishStatus || form.status,
      steps: steps.map((s, i) => ({ ...s, order: i + 1, required_documents: s.required_documents.filter(d => d.trim()), links: (s.links || []).filter(l => l.url?.trim()), video_url: s.video_url || "" })),
      quick_actions: quickActions.filter(q => q.label.trim()),
    };
    try {
      if (isEdit) { await api.put(`/procedures/${id}`, payload); toast.success(publishStatus === "published" ? "Procedure publiee !" : "Procedure enregistree"); }
      else { const res = await api.post("/procedures", payload); toast.success("Procedure creee !"); navigate(`/admin/procedures/modifier/${res.data.id}`); }
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur lors de la sauvegarde"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" /></div>;

  return (
    <div className="min-h-screen bg-zinc-950 font-['Manrope']">
      {/* Top Bar */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link to="/admin/procedures" className="p-2 text-zinc-400 hover:text-[#FF6600]" data-testid="back-to-list"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-['Oswald'] text-base sm:text-lg font-bold uppercase text-white">{isEdit ? "Modifier la Procedure" : "Creer une Procedure"}</h1>
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
        <div className="lg:col-span-2 space-y-6">
          {/* Info Section */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="section-info">
            <h2 className="text-[#FF6600] font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Informations de Procedure</h2>
            <div className="space-y-4">
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Titre de la procedure</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Visa visiteur Canada" data-testid="proc-title"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Instructions detaillees..." data-testid="proc-desc"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600] resize-none" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block flex items-center gap-1"><Video className="w-3 h-3" /> URL Video (optionnel)</label>
                <input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." data-testid="proc-video-url"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Image principale (optionnel)</label>
                <div className="flex items-start gap-3">
                  <input value={form.main_image_url} onChange={e => setForm(f => ({ ...f, main_image_url: e.target.value }))} placeholder="URL de l'image principale" data-testid="proc-main-image-url"
                    className="flex-1 bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
                  <label className="flex items-center gap-1.5 bg-zinc-700 text-zinc-300 text-xs font-bold uppercase px-3 py-2.5 hover:bg-zinc-600 cursor-pointer transition-colors flex-shrink-0">
                    <Upload className="w-3.5 h-3.5" /> Upload
                    <input type="file" accept="image/*" className="hidden" data-testid="proc-main-image-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        try { const fd = new FormData(); fd.append("file", file); const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } }); const url = res.data.urls?.[0] || res.data.url; if (url) setForm(f => ({ ...f, main_image_url: url })); toast.success("Image principale uploadee"); } catch { toast.error("Erreur upload image"); }
                        e.target.value = "";
                      }} />
                  </label>
                </div>
                {form.main_image_url && (
                  <div className="mt-2 relative inline-block">
                    <img src={form.main_image_url} alt="Apercu" className="h-24 rounded border border-zinc-700 object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, main_image_url: "" }))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"><X className="w-3 h-3" /></button>
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
                    <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                      placeholder="Ajouter un tag..." data-testid="proc-keyword-input"
                      className="flex-1 bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]" />
                    <button onClick={addKeyword} className="bg-zinc-700 text-white px-3 py-2.5 text-sm hover:bg-zinc-600"><Plus className="w-4 h-4" /></button>
                  </div>
                  {form.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.keywords.map((kw, i) => (
                        <span key={`kw-${kw}`} className="bg-[#FF6600]/20 text-[#FF6600] text-xs font-bold px-2 py-0.5 flex items-center gap-1.5">
                          {kw}
                          <button onClick={() => setForm(f => ({ ...f, keywords: f.keywords.filter((_, j) => j !== i) }))} className="hover:text-white"><X className="w-3 h-3" /></button>
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
                    <img src={FLAG_URL(countries.find(c => c.id === form.country)?.flag || "un")} alt="" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-4" />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Langue</label>
                  <div className="relative">
                    <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} data-testid="proc-language"
                      className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600] pl-10">
                      {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <img src={FLAG_URL(languages.find(l => l.id === form.language)?.flag || "un")} alt="" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-4" />
                  </div>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-bold uppercase mb-1 block">Complexite</label>
                  <select value={form.complexity} onChange={e => setForm(f => ({ ...f, complexity: e.target.value }))} data-testid="proc-complexity"
                    className="w-full bg-zinc-800 border border-zinc-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]">
                    <option value="facile">Facile</option><option value="modere">Modere</option><option value="difficile">Difficile</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between bg-zinc-800 px-4 py-3 rounded">
                <span className="text-zinc-300 text-sm font-bold">Procedure active ?</span>
                <button onClick={() => setForm(f => ({ ...f, active: !f.active }))} data-testid="proc-active-toggle"
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.active ? "bg-[#FF6600]" : "bg-zinc-600"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${form.active ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Steps */}
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
            ) : <p className="text-zinc-600 text-sm text-center py-6">Aucune etape. Ajoutez-en une.</p>}
            <button onClick={addStep} data-testid="add-step-btn"
              className="mt-3 flex items-center gap-2 text-[#FF6600] text-xs font-bold uppercase hover:text-[#CC5200] transition-colors">
              <Plus className="w-4 h-4" /> Ajouter une etape
            </button>
          </section>

          <FilesSection form={form} files={files} isEdit={isEdit} fileInputRef={fileInputRef}
            uploadingFile={uploadingFile} handleFileUpload={handleFileUpload} deleteFile={deleteFile} />
        </div>

        <div className="space-y-6">
          <ChatActionsSection chatActions={chatActions} />
          <QuickActionsSection quickActions={quickActions} addQuickAction={addQuickAction}
            updateQuickAction={updateQuickAction} deleteQuickAction={deleteQuickAction} />
          <PreviewSection form={form} categories={categories} countries={countries} steps={steps} files={files} />
        </div>
      </div>
    </div>
  );
}
