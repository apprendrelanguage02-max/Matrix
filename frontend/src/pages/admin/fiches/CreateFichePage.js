import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "../../../components/Header";
import Footer from "../../../components/layout/Footer";
import api from "../../../lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Save, Download,
  Loader2, ChevronDown, ChevronUp, X, Settings,
  Briefcase, ClipboardList, DollarSign, Layers, Clock,
  AlertTriangle, CheckCircle, File
} from "lucide-react";
import { Section, Input, TextArea2, Select, CURRENCIES, STATUSES } from "./FicheFormFields";
import { FichePreview } from "./FichePreview";

const emptyDoc = () => ({ name: "", note: "", required: true });
const emptyStep = () => ({ title: "", description: "", duration: "", remarks: "", order: 0, documents: [], fees: 0, fees_currency: "" });
const emptyDetail = () => ({ title: "", content: "" });
const emptyService = () => ({
  title: "", description: "", cost: 0, currency: "GNF", delay: "",
  included: [], not_included: [],
});

export default function CreateFichePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: "", country: "Guinee", category: "", procedure_type: "",
    summary: "", currency: "GNF", official_fees: 0, service_cost: 0,
    estimated_delay: "", status: "draft",
    documents: [], steps: [emptyStep()], additional_details: [],
    service_offering: emptyService(),
  });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [settings, setSettings] = useState(null);

  useEffect(() => { api.get("/company-settings").then(r => setSettings(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/fiches/${id}`);
        setForm({
          title: data.title || "", country: data.country || "Guinee",
          category: data.category || "", procedure_type: data.procedure_type || "",
          summary: data.summary || "", currency: data.currency || "GNF",
          official_fees: data.official_fees || 0, service_cost: data.service_cost || 0,
          estimated_delay: data.estimated_delay || "", status: data.status || "draft",
          documents: data.documents || [],
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
      const res = isEdit ? await api.put(`/fiches/${id}`, payload) : await api.post("/fiches", payload);
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
      a.href = url; a.download = `fiche_${form.title.replace(/\s+/g, "_").slice(0, 40)}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF telecharge");
    } catch { toast.error("Erreur generation PDF"); }
    finally { setDownloading(false); }
  };

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, emptyStep()] }));
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  const updateStep = (i, field, val) => setForm(f => {
    const steps = [...f.steps]; steps[i] = { ...steps[i], [field]: val }; return { ...f, steps };
  });
  const moveStep = (i, dir) => setForm(f => {
    const steps = [...f.steps]; const j = i + dir;
    if (j < 0 || j >= steps.length) return f;
    [steps[i], steps[j]] = [steps[j], steps[i]]; return { ...f, steps };
  });
  const addStepDoc = (si) => setForm(f => {
    const steps = [...f.steps];
    steps[si] = { ...steps[si], documents: [...(steps[si].documents || []), emptyDoc()] };
    return { ...f, steps };
  });
  const removeStepDoc = (si, di) => setForm(f => {
    const steps = [...f.steps];
    steps[si] = { ...steps[si], documents: steps[si].documents.filter((_, idx) => idx !== di) };
    return { ...f, steps };
  });
  const updateStepDoc = (si, di, field, val) => setForm(f => {
    const steps = [...f.steps]; const docs = [...(steps[si].documents || [])];
    docs[di] = { ...docs[di], [field]: val }; steps[si] = { ...steps[si], documents: docs };
    return { ...f, steps };
  });
  const addDetail = () => setForm(f => ({ ...f, additional_details: [...f.additional_details, emptyDetail()] }));
  const removeDetail = (i) => setForm(f => ({ ...f, additional_details: f.additional_details.filter((_, idx) => idx !== i) }));
  const updateDetail = (i, field, val) => setForm(f => {
    const details = [...f.additional_details]; details[i] = { ...details[i], [field]: val };
    return { ...f, additional_details: details };
  });
  const updateService = (field, val) => setForm(f => ({ ...f, service_offering: { ...f.service_offering, [field]: val } }));
  const addServiceItem = (field) => setForm(f => ({ ...f, service_offering: { ...f.service_offering, [field]: [...f.service_offering[field], ""] } }));
  const removeServiceItem = (field, i) => setForm(f => ({ ...f, service_offering: { ...f.service_offering, [field]: f.service_offering[field].filter((_, idx) => idx !== i) } }));
  const updateServiceItem = (field, i, val) => setForm(f => {
    const items = [...f.service_offering[field]]; items[i] = val;
    return { ...f, service_offering: { ...f.service_offering, [field]: items } };
  });

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#FF6600]" />
    </div>
  );

  const totalStepFees = form.steps.reduce((sum, s) => sum + (s.fees || 0), 0);
  const totalCost = totalStepFees + (form.official_fees || 0) + (form.service_cost || 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-50 flex flex-col" data-testid="create-fiche-page">
      <Header />

      {/* Action Bar */}
      <div className="bg-white border-b border-zinc-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link to="/admin/fiches" className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-[#FF6600] hover:border-[#FF6600]/30 transition-all" data-testid="back-to-fiches">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 truncate">
              {isEdit ? "Modifier la fiche" : "Nouvelle fiche de procedure"}
            </h1>
            <p className="text-xs text-zinc-400 hidden sm:block">Creez et gerez vos fiches de procedures administratives</p>
          </div>
          <Link to="/admin/parametres-entreprise" className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-[#FF6600] hover:border-[#FF6600]/30 transition-all" title="Parametres entreprise" data-testid="settings-link">
            <Settings className="w-4 h-4" />
          </Link>
          <button onClick={() => saveFiche()} disabled={saving}
            className="h-9 bg-zinc-900 text-white px-4 rounded-lg text-xs font-semibold hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50" data-testid="save-fiche-btn">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Sauvegarder</span>
          </button>
          <button onClick={downloadPdf} disabled={downloading || saving}
            className="h-9 bg-gradient-to-r from-[#FF6600] to-[#E55B00] text-white px-4 rounded-lg text-xs font-semibold hover:from-[#E55B00] hover:to-[#CC5000] transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-[#FF6600]/20" data-testid="generate-pdf-btn">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Generer PDF</span>
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT — Form */}
          <div className="lg:col-span-3 space-y-5">
            <GeneralInfoSection form={form} updateField={updateField} />
            <StepsSection form={form} addStep={addStep} removeStep={removeStep} updateStep={updateStep}
              moveStep={moveStep} addStepDoc={addStepDoc} removeStepDoc={removeStepDoc} updateStepDoc={updateStepDoc} />
            <DetailsSection form={form} addDetail={addDetail} removeDetail={removeDetail} updateDetail={updateDetail} />
            <ServiceSection form={form} updateService={updateService} addServiceItem={addServiceItem}
              removeServiceItem={removeServiceItem} updateServiceItem={updateServiceItem} />
          </div>

          {/* RIGHT — Preview */}
          <FichePreview form={form} settings={settings} totalStepFees={totalStepFees} totalCost={totalCost} />
        </div>
      </div>
      <Footer />
    </div>
  );
}

function GeneralInfoSection({ form, updateField }) {
  return (
    <Section title="Informations generales" icon={<Briefcase className="w-4 h-4 text-white" />}>
      <div className="space-y-4 pt-5">
        <Input label="Titre de la procedure *" value={form.title}
          onChange={e => updateField("title", e.target.value)} placeholder="Ex: Visa Schengen depuis la Guinee" data-testid="fiche-title" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Pays" value={form.country} onChange={e => updateField("country", e.target.value)} placeholder="Guinee" data-testid="fiche-country" />
          <Input label="Categorie" value={form.category} onChange={e => updateField("category", e.target.value)} placeholder="Immigration" data-testid="fiche-category" />
          <Input label="Type" value={form.procedure_type} onChange={e => updateField("procedure_type", e.target.value)} placeholder="Visa court sejour" data-testid="fiche-type" />
        </div>
        <TextArea2 label="Resume / Introduction" value={form.summary}
          onChange={e => updateField("summary", e.target.value)} placeholder="Description courte de la procedure..." data-testid="fiche-summary" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select label="Devise" value={form.currency} onChange={e => updateField("currency", e.target.value)} options={CURRENCIES} testId="fiche-currency" />
          <Input label="Frais officiels" value={form.official_fees} onChange={e => updateField("official_fees", parseFloat(e.target.value) || 0)} type="number" data-testid="fiche-official-fees" />
          <Input label="Cout prestation" value={form.service_cost} onChange={e => updateField("service_cost", parseFloat(e.target.value) || 0)} type="number" data-testid="fiche-service-cost" />
          <Input label="Delai estime" value={form.estimated_delay} onChange={e => updateField("estimated_delay", e.target.value)} placeholder="15-30 jours" data-testid="fiche-delay" />
        </div>
        <Select label="Statut" value={form.status} onChange={e => updateField("status", e.target.value)} options={STATUSES} testId="fiche-status" />
      </div>
    </Section>
  );
}

function StepsSection({ form, addStep, removeStep, updateStep, moveStep, addStepDoc, removeStepDoc, updateStepDoc }) {
  return (
    <Section title="Etapes de la procedure" icon={<ClipboardList className="w-4 h-4 text-white" />} count={form.steps.length}>
      <div className="space-y-4 pt-5">
        {form.steps.map((step, i) => (
          <div key={`step-${i}`} className="bg-zinc-50/80 border border-zinc-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 p-3 bg-white border-b border-zinc-100">
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => moveStep(i, -1)} disabled={i === 0} className="text-zinc-300 hover:text-[#FF6600] disabled:opacity-30 transition-colors" data-testid={`step-up-${i}`}><ChevronUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveStep(i, 1)} disabled={i === form.steps.length - 1} className="text-zinc-300 hover:text-[#FF6600] disabled:opacity-30 transition-colors" data-testid={`step-down-${i}`}><ChevronDown className="w-3.5 h-3.5" /></button>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6600] to-[#E55B00] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">{i + 1}</div>
              <input value={step.title} onChange={e => updateStep(i, "title", e.target.value)} placeholder="Titre de l'etape" data-testid={`step-title-${i}`}
                className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 px-2 py-1.5 focus:outline-none placeholder:text-zinc-300" />
              <div className="flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3 h-3 text-zinc-300" />
                <input value={step.duration} onChange={e => updateStep(i, "duration", e.target.value)} placeholder="Duree" data-testid={`step-duration-${i}`}
                  className="w-24 bg-zinc-50 border border-zinc-200 rounded-md text-[11px] px-2 py-1.5 text-zinc-500 focus:outline-none focus:border-[#FF6600]" />
              </div>
              <button onClick={() => removeStep(i)} className="text-zinc-300 hover:text-red-500 p-1 transition-colors" data-testid={`step-remove-${i}`}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="p-3 space-y-3">
              <textarea value={step.description} onChange={e => updateStep(i, "description", e.target.value)}
                placeholder="Description detaillee de l'etape..." rows={2} data-testid={`step-desc-${i}`}
                className="w-full bg-white border border-zinc-200 rounded-md text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] resize-y" />
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 text-orange-400 mt-2 flex-shrink-0" />
                <input value={step.remarks} onChange={e => updateStep(i, "remarks", e.target.value)} placeholder="Remarques importantes (optionnel)" data-testid={`step-remarks-${i}`}
                  className="flex-1 bg-white border border-orange-200 rounded-md text-xs px-3 py-2 text-orange-600 placeholder:text-orange-300 focus:outline-none focus:border-[#FF6600]" />
              </div>
              <div className="flex items-center gap-2 bg-orange-50/50 border border-orange-200/50 rounded-md px-3 py-2">
                <DollarSign className="w-3.5 h-3.5 text-[#FF6600] flex-shrink-0" />
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex-shrink-0">Frais</span>
                <input type="number" value={step.fees || 0} onChange={e => updateStep(i, "fees", parseFloat(e.target.value) || 0)} placeholder="0" data-testid={`step-fees-${i}`}
                  className="w-28 bg-white border border-zinc-200 rounded-md text-xs px-2.5 py-1.5 font-semibold focus:outline-none focus:border-[#FF6600]" />
                <select value={step.fees_currency || form.currency} onChange={e => updateStep(i, "fees_currency", e.target.value)} data-testid={`step-fees-currency-${i}`}
                  className="bg-white border border-zinc-200 rounded-md text-xs px-2 py-1.5 focus:outline-none focus:border-[#FF6600]">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <StepDocuments step={step} stepIndex={i} addStepDoc={addStepDoc} removeStepDoc={removeStepDoc} updateStepDoc={updateStepDoc} />
            </div>
          </div>
        ))}
        <button onClick={addStep} data-testid="add-step-btn"
          className="w-full border-2 border-dashed border-zinc-300 rounded-lg py-3 text-sm text-zinc-400 font-semibold hover:border-[#FF6600] hover:text-[#FF6600] transition-all flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter une etape
        </button>
      </div>
    </Section>
  );
}

function StepDocuments({ step, stepIndex: i, addStepDoc, removeStepDoc, updateStepDoc }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-md p-3">
      <div className="flex items-center gap-2 mb-2">
        <File className="w-3.5 h-3.5 text-[#FF6600]" />
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Documents requis ({(step.documents || []).length})</span>
      </div>
      <div className="space-y-2">
        {(step.documents || []).map((doc, di) => (
          <div key={`s${i}-d${di}`} className="flex items-center gap-2 bg-zinc-50 rounded-md px-2.5 py-2">
            <span className="text-[9px] font-bold text-[#FF6600] bg-[#FF6600]/10 w-5 h-5 rounded flex items-center justify-center flex-shrink-0">{di + 1}</span>
            <div className="flex-1 space-y-1">
              <input value={doc.name} onChange={e => updateStepDoc(i, di, "name", e.target.value)} placeholder="Nom du document" data-testid={`step-${i}-doc-name-${di}`}
                className="w-full bg-white border border-zinc-200 rounded text-[11px] px-2.5 py-1.5 focus:outline-none focus:border-[#FF6600]" />
              <input value={doc.note} onChange={e => updateStepDoc(i, di, "note", e.target.value)} placeholder="Note (optionnel)" data-testid={`step-${i}-doc-note-${di}`}
                className="w-full bg-white border border-zinc-100 rounded text-[10px] px-2.5 py-1 focus:outline-none focus:border-[#FF6600] text-zinc-400" />
            </div>
            <label className="flex items-center gap-1 text-[10px] cursor-pointer flex-shrink-0">
              <input type="checkbox" checked={doc.required} onChange={e => updateStepDoc(i, di, "required", e.target.checked)}
                className="accent-[#FF6600] w-3.5 h-3.5" data-testid={`step-${i}-doc-req-${di}`} />
              <span className="text-zinc-400">Oblig.</span>
            </label>
            <button onClick={() => removeStepDoc(i, di)} className="text-zinc-300 hover:text-red-500 p-0.5 transition-colors" data-testid={`step-${i}-doc-rm-${di}`}>
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={() => addStepDoc(i)} data-testid={`step-${i}-add-doc`}
        className="mt-2 w-full border border-dashed border-zinc-300 rounded-md py-1.5 text-[10px] font-semibold text-zinc-400 hover:text-[#FF6600] hover:border-[#FF6600]/50 transition-colors flex items-center justify-center gap-1">
        <Plus className="w-3 h-3" /> Ajouter un document
      </button>
    </div>
  );
}

function DetailsSection({ form, addDetail, removeDetail, updateDetail }) {
  return (
    <Section title="Details supplementaires" icon={<Layers className="w-4 h-4 text-white" />} count={form.additional_details.length} defaultOpen={false}>
      <div className="space-y-3 pt-5">
        {form.additional_details.map((d, i) => (
          <div key={`detail-${i}`} className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input value={d.title} onChange={e => updateDetail(i, "title", e.target.value)} placeholder="Titre (ex: Conseils importants)" data-testid={`detail-title-${i}`}
                className="flex-1 bg-white border border-zinc-200 rounded-md text-sm px-3 py-2 font-medium focus:outline-none focus:border-[#FF6600]" />
              <button onClick={() => removeDetail(i)} className="text-zinc-300 hover:text-red-500 p-1 transition-colors" data-testid={`detail-remove-${i}`}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <textarea value={d.content} onChange={e => updateDetail(i, "content", e.target.value)} placeholder="Contenu..." rows={3} data-testid={`detail-content-${i}`}
              className="w-full bg-white border border-zinc-200 rounded-md text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600] resize-y" />
          </div>
        ))}
        <button onClick={addDetail} data-testid="add-detail-btn"
          className="w-full border-2 border-dashed border-zinc-300 rounded-lg py-3 text-sm text-zinc-400 font-semibold hover:border-[#FF6600] hover:text-[#FF6600] transition-all flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter une section
        </button>
      </div>
    </Section>
  );
}

function ServiceSection({ form, updateService, addServiceItem, removeServiceItem, updateServiceItem }) {
  return (
    <Section title="Ma prestation de service" icon={<Briefcase className="w-4 h-4 text-white" />} defaultOpen={false}>
      <div className="space-y-4 pt-5">
        <Input label="Intitule de la prestation" value={form.service_offering.title}
          onChange={e => updateService("title", e.target.value)} placeholder="Accompagnement complet..." data-testid="svc-title" />
        <TextArea2 label="Description" value={form.service_offering.description}
          onChange={e => updateService("description", e.target.value)} placeholder="Nous gerons votre dossier..." data-testid="svc-desc" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="Cout" value={form.service_offering.cost} onChange={e => updateService("cost", parseFloat(e.target.value) || 0)} type="number" data-testid="svc-cost" />
          <Select label="Devise" value={form.service_offering.currency} onChange={e => updateService("currency", e.target.value)} options={CURRENCIES} testId="svc-currency" />
          <Input label="Delai" value={form.service_offering.delay} onChange={e => updateService("delay", e.target.value)} placeholder="5-7 jours" data-testid="svc-delay" />
        </div>
        <ServiceListField label="Ce qui est inclus" items={form.service_offering.included} field="included"
          icon={<CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
          addServiceItem={addServiceItem} removeServiceItem={removeServiceItem} updateServiceItem={updateServiceItem} testPrefix="svc-inc" />
        <ServiceListField label="Ce qui n'est pas inclus" items={form.service_offering.not_included} field="not_included"
          icon={<X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
          addServiceItem={addServiceItem} removeServiceItem={removeServiceItem} updateServiceItem={updateServiceItem} testPrefix="svc-exc" />
      </div>
    </Section>
  );
}

function ServiceListField({ label, items, field, icon, addServiceItem, removeServiceItem, updateServiceItem, testPrefix }) {
  return (
    <div>
      <label className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-2 block">{label}</label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={`${field}-${i}`} className="flex items-center gap-2">
            {icon}
            <input value={item} onChange={e => updateServiceItem(field, i, e.target.value)}
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-md text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600]" data-testid={`${testPrefix}-${i}`} />
            <button onClick={() => removeServiceItem(field, i)} className="text-zinc-300 hover:text-red-500 p-1"><X className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <button onClick={() => addServiceItem(field)} className="mt-2 text-xs text-[#FF6600] font-semibold hover:underline flex items-center gap-1" data-testid={`add-${testPrefix}`}>
        <Plus className="w-3 h-3" /> Ajouter
      </button>
    </div>
  );
}
