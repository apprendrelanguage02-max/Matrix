import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "../../../components/Header";
import Footer from "../../../components/layout/Footer";
import api from "../../../lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save, Download, Eye,
  FileText, Loader2, ChevronDown, ChevronUp, X, Settings
} from "lucide-react";

const CURRENCIES = ["GNF", "EUR", "USD", "CAD", "XOF", "GBP"];
const STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publie" },
  { value: "archived", label: "Archive" },
];

const emptyDoc = () => ({ name: "", note: "", required: true });
const emptyStep = () => ({ title: "", description: "", duration: "", remarks: "", order: 0 });
const emptyDetail = () => ({ title: "", content: "" });
const emptyService = () => ({
  title: "", description: "", cost: 0, currency: "GNF", delay: "",
  included: [], not_included: [],
});

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-zinc-200 overflow-hidden">
      <button onClick={() => setOpen(!open)} type="button"
        className="w-full flex items-center gap-2 px-5 py-3.5 text-left hover:bg-zinc-50 transition-colors">
        {icon}
        <span className="font-['Oswald'] text-sm font-bold uppercase tracking-wider text-black flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-zinc-100">{children}</div>}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", className = "", ...rest }) {
  return (
    <div className={className}>
      <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600] transition-colors"
        {...rest} />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return (
    <div className={className}>
      <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">{label}</label>
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600] transition-colors resize-y" />
    </div>
  );
}

export default function CreateFichePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: "", country: "Guinee", category: "", procedure_type: "",
    summary: "", currency: "GNF", official_fees: 0, service_cost: 0,
    estimated_delay: "", status: "draft",
    documents: [emptyDoc()],
    steps: [emptyStep()],
    additional_details: [],
    service_offering: emptyService(),
  });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/fiches/${id}`);
        setForm({
          title: data.title || "",
          country: data.country || "Guinee",
          category: data.category || "",
          procedure_type: data.procedure_type || "",
          summary: data.summary || "",
          currency: data.currency || "GNF",
          official_fees: data.official_fees || 0,
          service_cost: data.service_cost || 0,
          estimated_delay: data.estimated_delay || "",
          status: data.status || "draft",
          documents: data.documents?.length ? data.documents : [emptyDoc()],
          steps: data.steps?.length ? data.steps : [emptyStep()],
          additional_details: data.additional_details || [],
          service_offering: data.service_offering || emptyService(),
        });
      } catch { toast.error("Erreur chargement fiche"); navigate("/admin/fiches"); }
      finally { setLoading(false); }
    })();
  }, [id, isEdit, navigate]);

  const updateField = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const saveFiche = async (silent = false) => {
    if (!form.title.trim()) { toast.error("Le titre est obligatoire"); return null; }
    setSaving(true);
    try {
      const payload = { ...form, steps: form.steps.map((s, i) => ({ ...s, order: i })) };
      let res;
      if (isEdit) {
        res = await api.put(`/fiches/${id}`, payload);
      } else {
        res = await api.post("/fiches", payload);
      }
      if (!silent) toast.success(isEdit ? "Fiche mise a jour" : "Fiche creee");
      if (!isEdit && res.data?.id) navigate(`/admin/fiches/${res.data.id}/edit`, { replace: true });
      return res.data;
    } catch { toast.error("Erreur sauvegarde"); return null; }
    finally { setSaving(false); }
  };

  const downloadPdf = async () => {
    const saved = await saveFiche(true);
    if (!saved) return;
    setDownloading(true);
    try {
      const ficheId = saved.id || id;
      const { data } = await api.post(`/fiches/${ficheId}/pdf`, {}, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `fiche_${form.title.replace(/\s+/g, "_").slice(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF telecharge");
    } catch { toast.error("Erreur generation PDF"); }
    finally { setDownloading(false); }
  };

  // Document handlers
  const addDoc = () => setForm(f => ({ ...f, documents: [...f.documents, emptyDoc()] }));
  const removeDoc = (i) => setForm(f => ({ ...f, documents: f.documents.filter((_, idx) => idx !== i) }));
  const updateDoc = (i, field, val) => setForm(f => {
    const docs = [...f.documents];
    docs[i] = { ...docs[i], [field]: val };
    return { ...f, documents: docs };
  });

  // Step handlers
  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, emptyStep()] }));
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  const updateStep = (i, field, val) => setForm(f => {
    const steps = [...f.steps];
    steps[i] = { ...steps[i], [field]: val };
    return { ...f, steps };
  });
  const moveStep = (i, dir) => setForm(f => {
    const steps = [...f.steps];
    const j = i + dir;
    if (j < 0 || j >= steps.length) return f;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    return { ...f, steps };
  });

  // Additional details handlers
  const addDetail = () => setForm(f => ({ ...f, additional_details: [...f.additional_details, emptyDetail()] }));
  const removeDetail = (i) => setForm(f => ({ ...f, additional_details: f.additional_details.filter((_, idx) => idx !== i) }));
  const updateDetail = (i, field, val) => setForm(f => {
    const details = [...f.additional_details];
    details[i] = { ...details[i], [field]: val };
    return { ...f, additional_details: details };
  });

  // Service offering handlers
  const updateService = (field, val) => setForm(f => ({
    ...f, service_offering: { ...f.service_offering, [field]: val }
  }));
  const addServiceItem = (field) => setForm(f => ({
    ...f, service_offering: { ...f.service_offering, [field]: [...f.service_offering[field], ""] }
  }));
  const removeServiceItem = (field, i) => setForm(f => ({
    ...f, service_offering: { ...f.service_offering, [field]: f.service_offering[field].filter((_, idx) => idx !== i) }
  }));
  const updateServiceItem = (field, i, val) => setForm(f => {
    const items = [...f.service_offering[field]];
    items[i] = val;
    return { ...f, service_offering: { ...f.service_offering, [field]: items } };
  });

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
    </div>
  );

  const totalCost = (form.official_fees || 0) + (form.service_cost || 0);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col" data-testid="create-fiche-page">
      <Header />
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/fiches" className="text-zinc-400 hover:text-[#FF6600] transition-colors" data-testid="back-to-fiches">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-['Oswald'] text-xl font-bold uppercase tracking-tight text-black">
              {isEdit ? "Modifier la fiche" : "Nouvelle fiche de procedure"}
            </h1>
          </div>
          <Link to="/admin/parametres-entreprise" className="p-2 text-zinc-400 hover:text-[#FF6600] transition-colors" title="Parametres entreprise"
            data-testid="settings-link">
            <Settings className="w-5 h-5" />
          </Link>
          <button onClick={() => saveFiche()} disabled={saving}
            className="bg-zinc-900 text-white px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
            data-testid="save-fiche-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
          <button onClick={downloadPdf} disabled={downloading || saving}
            className="bg-[#FF6600] text-white px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-[#e55b00] transition-colors flex items-center gap-2 disabled:opacity-50"
            data-testid="generate-pdf-btn">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generer PDF
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── LEFT: Form ─── */}
          <div className="lg:col-span-3 space-y-4">
            {/* General Info */}
            <Section title="Informations generales" icon={<FileText className="w-4 h-4 text-[#FF6600]" />}>
              <div className="space-y-4 pt-4">
                <InputField label="Titre de la procedure *" value={form.title}
                  onChange={e => updateField("title", e.target.value)}
                  placeholder="Ex: Visa Schengen depuis la Guinee" data-testid="fiche-title" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <InputField label="Pays concerne" value={form.country}
                    onChange={e => updateField("country", e.target.value)} placeholder="Guinee" data-testid="fiche-country" />
                  <InputField label="Categorie" value={form.category}
                    onChange={e => updateField("category", e.target.value)} placeholder="Immigration" data-testid="fiche-category" />
                  <InputField label="Type de procedure" value={form.procedure_type}
                    onChange={e => updateField("procedure_type", e.target.value)} placeholder="Visa court sejour" data-testid="fiche-type" />
                </div>
                <TextArea label="Resume / Introduction" value={form.summary}
                  onChange={e => updateField("summary", e.target.value)}
                  placeholder="Description courte de la procedure..." data-testid="fiche-summary" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Devise</label>
                    <select value={form.currency} onChange={e => updateField("currency", e.target.value)}
                      className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]"
                      data-testid="fiche-currency">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <InputField label="Frais officiels" value={form.official_fees}
                    onChange={e => updateField("official_fees", parseFloat(e.target.value) || 0)}
                    type="number" data-testid="fiche-official-fees" />
                  <InputField label="Cout prestation" value={form.service_cost}
                    onChange={e => updateField("service_cost", parseFloat(e.target.value) || 0)}
                    type="number" data-testid="fiche-service-cost" />
                  <InputField label="Delai estime" value={form.estimated_delay}
                    onChange={e => updateField("estimated_delay", e.target.value)}
                    placeholder="15-30 jours" data-testid="fiche-delay" />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Statut</label>
                  <select value={form.status} onChange={e => updateField("status", e.target.value)}
                    className="w-full bg-white border border-zinc-200 text-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:border-[#FF6600]"
                    data-testid="fiche-status">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </Section>

            {/* Documents */}
            <Section title={`Documents requis (${form.documents.length})`} icon={<FileText className="w-4 h-4 text-[#FF6600]" />}>
              <div className="space-y-3 pt-4">
                {form.documents.map((doc, i) => (
                  <div key={`doc-${i}`} className="bg-zinc-50 border border-zinc-200 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#FF6600] bg-[#FF6600]/10 w-6 h-6 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <input value={doc.name} onChange={e => updateDoc(i, "name", e.target.value)}
                        placeholder="Nom du document" data-testid={`doc-name-${i}`}
                        className="flex-1 bg-white border border-zinc-200 text-sm px-3 py-2 focus:outline-none focus:border-[#FF6600]" />
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer flex-shrink-0">
                        <input type="checkbox" checked={doc.required} onChange={e => updateDoc(i, "required", e.target.checked)}
                          className="accent-[#FF6600]" data-testid={`doc-required-${i}`} />
                        <span className="text-zinc-500">Obligatoire</span>
                      </label>
                      <button onClick={() => removeDoc(i)} className="text-zinc-400 hover:text-red-500 p-1" data-testid={`doc-remove-${i}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input value={doc.note} onChange={e => updateDoc(i, "note", e.target.value)}
                      placeholder="Note ou precision (optionnel)"
                      className="w-full bg-white border border-zinc-200 text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600] text-zinc-500"
                      data-testid={`doc-note-${i}`} />
                  </div>
                ))}
                <button onClick={addDoc} className="w-full border-2 border-dashed border-zinc-300 py-2.5 text-sm text-zinc-500 font-bold hover:border-[#FF6600] hover:text-[#FF6600] transition-colors flex items-center justify-center gap-1.5"
                  data-testid="add-doc-btn">
                  <Plus className="w-4 h-4" /> Ajouter un document
                </button>
              </div>
            </Section>

            {/* Steps */}
            <Section title={`Etapes de la procedure (${form.steps.length})`} icon={<FileText className="w-4 h-4 text-[#FF6600]" />}>
              <div className="space-y-3 pt-4">
                {form.steps.map((step, i) => (
                  <div key={`step-${i}`} className="bg-zinc-50 border border-zinc-200 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button onClick={() => moveStep(i, -1)} disabled={i === 0}
                          className="text-zinc-400 hover:text-[#FF6600] disabled:opacity-30" data-testid={`step-up-${i}`}>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveStep(i, 1)} disabled={i === form.steps.length - 1}
                          className="text-zinc-400 hover:text-[#FF6600] disabled:opacity-30" data-testid={`step-down-${i}`}>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="bg-[#FF6600] text-white w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <input value={step.title} onChange={e => updateStep(i, "title", e.target.value)}
                        placeholder="Titre de l'etape" data-testid={`step-title-${i}`}
                        className="flex-1 bg-white border border-zinc-200 text-sm px-3 py-2 font-medium focus:outline-none focus:border-[#FF6600]" />
                      <input value={step.duration} onChange={e => updateStep(i, "duration", e.target.value)}
                        placeholder="Duree" data-testid={`step-duration-${i}`}
                        className="w-28 bg-white border border-zinc-200 text-xs px-2 py-2 text-zinc-500 focus:outline-none focus:border-[#FF6600]" />
                      <button onClick={() => removeStep(i)} className="text-zinc-400 hover:text-red-500 p-1" data-testid={`step-remove-${i}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea value={step.description} onChange={e => updateStep(i, "description", e.target.value)}
                      placeholder="Description detaillee de l'etape..." rows={2}
                      className="w-full bg-white border border-zinc-200 text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600] resize-y"
                      data-testid={`step-desc-${i}`} />
                    <input value={step.remarks} onChange={e => updateStep(i, "remarks", e.target.value)}
                      placeholder="Remarques importantes (optionnel)"
                      className="w-full bg-white border border-zinc-200 text-xs px-3 py-2 text-orange-600 focus:outline-none focus:border-[#FF6600]"
                      data-testid={`step-remarks-${i}`} />
                  </div>
                ))}
                <button onClick={addStep} className="w-full border-2 border-dashed border-zinc-300 py-2.5 text-sm text-zinc-500 font-bold hover:border-[#FF6600] hover:text-[#FF6600] transition-colors flex items-center justify-center gap-1.5"
                  data-testid="add-step-btn">
                  <Plus className="w-4 h-4" /> Ajouter une etape
                </button>
              </div>
            </Section>

            {/* Additional details */}
            <Section title={`Details supplementaires (${form.additional_details.length})`} icon={<FileText className="w-4 h-4 text-[#FF6600]" />} defaultOpen={false}>
              <div className="space-y-3 pt-4">
                {form.additional_details.map((d, i) => (
                  <div key={`detail-${i}`} className="bg-zinc-50 border border-zinc-200 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={d.title} onChange={e => updateDetail(i, "title", e.target.value)}
                        placeholder="Titre (ex: Conseils importants)" data-testid={`detail-title-${i}`}
                        className="flex-1 bg-white border border-zinc-200 text-sm px-3 py-2 font-medium focus:outline-none focus:border-[#FF6600]" />
                      <button onClick={() => removeDetail(i)} className="text-zinc-400 hover:text-red-500 p-1" data-testid={`detail-remove-${i}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea value={d.content} onChange={e => updateDetail(i, "content", e.target.value)}
                      placeholder="Contenu..." rows={3}
                      className="w-full bg-white border border-zinc-200 text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600] resize-y"
                      data-testid={`detail-content-${i}`} />
                  </div>
                ))}
                <button onClick={addDetail} className="w-full border-2 border-dashed border-zinc-300 py-2.5 text-sm text-zinc-500 font-bold hover:border-[#FF6600] hover:text-[#FF6600] transition-colors flex items-center justify-center gap-1.5"
                  data-testid="add-detail-btn">
                  <Plus className="w-4 h-4" /> Ajouter une section
                </button>
              </div>
            </Section>

            {/* Service Offering */}
            <Section title="Ma prestation de service" icon={<FileText className="w-4 h-4 text-[#FF6600]" />} defaultOpen={false}>
              <div className="space-y-4 pt-4">
                <InputField label="Intitule de la prestation" value={form.service_offering.title}
                  onChange={e => updateService("title", e.target.value)}
                  placeholder="Accompagnement complet..." data-testid="svc-title" />
                <TextArea label="Description" value={form.service_offering.description}
                  onChange={e => updateService("description", e.target.value)}
                  placeholder="Nous gerons votre dossier..." data-testid="svc-desc" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <InputField label="Cout" value={form.service_offering.cost}
                    onChange={e => updateService("cost", parseFloat(e.target.value) || 0)}
                    type="number" data-testid="svc-cost" />
                  <div>
                    <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Devise</label>
                    <select value={form.service_offering.currency} onChange={e => updateService("currency", e.target.value)}
                      className="w-full bg-white border border-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:border-[#FF6600]"
                      data-testid="svc-currency">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <InputField label="Delai" value={form.service_offering.delay}
                    onChange={e => updateService("delay", e.target.value)}
                    placeholder="5-7 jours" data-testid="svc-delay" />
                </div>

                {/* Included */}
                <div>
                  <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Ce qui est inclus</label>
                  <div className="space-y-1.5">
                    {form.service_offering.included.map((item, i) => (
                      <div key={`inc-${i}`} className="flex items-center gap-2">
                        <span className="text-green-500 text-sm flex-shrink-0">&#10003;</span>
                        <input value={item} onChange={e => updateServiceItem("included", i, e.target.value)}
                          className="flex-1 bg-white border border-zinc-200 text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600]"
                          data-testid={`svc-inc-${i}`} />
                        <button onClick={() => removeServiceItem("included", i)} className="text-zinc-400 hover:text-red-500 p-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addServiceItem("included")}
                    className="mt-1.5 text-xs text-[#FF6600] font-bold hover:underline flex items-center gap-1"
                    data-testid="add-svc-inc">
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>

                {/* Not included */}
                <div>
                  <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1.5 block">Ce qui n'est pas inclus</label>
                  <div className="space-y-1.5">
                    {form.service_offering.not_included.map((item, i) => (
                      <div key={`exc-${i}`} className="flex items-center gap-2">
                        <span className="text-red-500 text-sm flex-shrink-0">&#10007;</span>
                        <input value={item} onChange={e => updateServiceItem("not_included", i, e.target.value)}
                          className="flex-1 bg-white border border-zinc-200 text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600]"
                          data-testid={`svc-exc-${i}`} />
                        <button onClick={() => removeServiceItem("not_included", i)} className="text-zinc-400 hover:text-red-500 p-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addServiceItem("not_included")}
                    className="mt-1.5 text-xs text-[#FF6600] font-bold hover:underline flex items-center gap-1"
                    data-testid="add-svc-exc">
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>
              </div>
            </Section>
          </div>

          {/* ─── RIGHT: Live Preview ─── */}
          <div className="lg:col-span-2">
            <div className="sticky top-4">
              <div className="bg-white border border-zinc-200 shadow-lg overflow-hidden">
                <div className="bg-zinc-900 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Apercu du PDF
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                </div>
                <div className="p-5 max-h-[calc(100vh-160px)] overflow-y-auto" data-testid="fiche-preview">
                  {/* Logo + Company */}
                  <div className="text-center mb-4">
                    <img src="/nimba-logo.png" alt="Logo" className="h-10 mx-auto mb-1" />
                    <p className="font-['Oswald'] text-sm font-bold text-black">Matrix News</p>
                    <p className="text-[10px] text-zinc-400">Votre partenaire pour toutes vos demarches</p>
                  </div>
                  <div className="h-0.5 bg-[#FF6600] mb-4" />

                  {/* Title */}
                  <div className="bg-[#FF6600] text-white text-center py-2.5 px-3 mb-3">
                    <p className="font-bold text-sm">{form.title || "Titre de la procedure"}</p>
                  </div>

                  {/* Meta */}
                  {(form.country || form.category || form.estimated_delay) && (
                    <div className="grid grid-cols-3 gap-px bg-zinc-200 text-center text-[9px] text-zinc-500 mb-3">
                      <div className="bg-zinc-50 py-1.5">{form.country || "-"}</div>
                      <div className="bg-zinc-50 py-1.5">{form.category || "-"}</div>
                      <div className="bg-zinc-50 py-1.5">{form.estimated_delay || "-"}</div>
                    </div>
                  )}

                  {/* Summary */}
                  {form.summary && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-[#FF6600] uppercase mb-1">Resume</p>
                      <p className="text-[10px] text-zinc-600 leading-relaxed">{form.summary}</p>
                    </div>
                  )}

                  {/* Fees */}
                  {(form.official_fees > 0 || form.service_cost > 0) && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-[#FF6600] uppercase mb-1">Frais et Couts</p>
                      <div className="text-[9px] space-y-1">
                        {form.official_fees > 0 && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Frais officiels</span>
                            <span className="font-bold text-[#FF6600]">{form.official_fees.toLocaleString()} {form.currency}</span>
                          </div>
                        )}
                        {form.service_cost > 0 && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Cout prestation</span>
                            <span className="font-bold text-[#FF6600]">{form.service_cost.toLocaleString()} {form.currency}</span>
                          </div>
                        )}
                        {totalCost > 0 && (
                          <div className="flex justify-between border-t border-[#FF6600]/30 pt-1 mt-1">
                            <span className="font-bold text-zinc-900">TOTAL</span>
                            <span className="font-bold text-[#FF6600]">{totalCost.toLocaleString()} {form.currency}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {form.documents.some(d => d.name) && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-[#FF6600] uppercase mb-1">Documents requis</p>
                      <div className="space-y-1">
                        {form.documents.filter(d => d.name).map((doc, i) => (
                          <div key={`prev-doc-${i}`} className="text-[9px]">
                            <span className="font-bold">{i + 1}.</span> {doc.name}
                            <span className={`ml-1 text-[8px] ${doc.required ? "text-[#FF6600] font-bold" : "text-zinc-400"}`}>
                              ({doc.required ? "Obligatoire" : "Optionnel"})
                            </span>
                            {doc.note && <p className="text-[8px] text-zinc-400 italic ml-3">{doc.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  {form.steps.some(s => s.title) && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-[#FF6600] uppercase mb-1">Etapes</p>
                      <div className="space-y-2">
                        {form.steps.filter(s => s.title).map((step, i) => (
                          <div key={`prev-step-${i}`} className="flex items-start gap-2">
                            <span className="bg-[#FF6600] text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                            <div className="text-[9px]">
                              <p className="font-bold text-zinc-900">{step.title}</p>
                              {step.duration && <p className="text-[#FF6600] text-[8px]">Duree: {step.duration}</p>}
                              {step.description && <p className="text-zinc-500 mt-0.5">{step.description}</p>}
                              {step.remarks && <p className="text-red-500 text-[8px] mt-0.5">Important: {step.remarks}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional details */}
                  {form.additional_details.filter(d => d.title && d.content).map((d, i) => (
                    <div key={`prev-detail-${i}`} className="mb-3">
                      <p className="text-[10px] font-bold text-[#FF6600] uppercase mb-1">{d.title}</p>
                      <p className="text-[9px] text-zinc-600">{d.content}</p>
                    </div>
                  ))}

                  {/* Service offering */}
                  {form.service_offering.title && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-[#FF6600] uppercase mb-1">Notre prestation</p>
                      <p className="text-[9px] font-bold text-zinc-900">{form.service_offering.title}</p>
                      {form.service_offering.description && (
                        <p className="text-[9px] text-zinc-600 mt-0.5">{form.service_offering.description}</p>
                      )}
                      {(form.service_offering.cost > 0 || form.service_offering.delay) && (
                        <p className="text-[9px] text-zinc-500 mt-1">
                          {form.service_offering.cost > 0 && <span className="font-bold text-[#FF6600]">{form.service_offering.cost.toLocaleString()} {form.service_offering.currency}</span>}
                          {form.service_offering.cost > 0 && form.service_offering.delay && " | "}
                          {form.service_offering.delay && <span>Delai: {form.service_offering.delay}</span>}
                        </p>
                      )}
                      {form.service_offering.included.filter(Boolean).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {form.service_offering.included.filter(Boolean).map((item, i) => (
                            <p key={`prev-inc-${i}`} className="text-[8px] text-green-600">&#10003; {item}</p>
                          ))}
                        </div>
                      )}
                      {form.service_offering.not_included.filter(Boolean).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {form.service_offering.not_included.filter(Boolean).map((item, i) => (
                            <p key={`prev-exc-${i}`} className="text-[8px] text-red-500">&#10007; {item}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t border-zinc-200 mt-4 pt-2 text-center">
                    <p className="text-[8px] text-zinc-400">
                      Document genere le {new Date().toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
