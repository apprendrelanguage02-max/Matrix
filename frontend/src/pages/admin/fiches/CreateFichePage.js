import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Header from "../../../components/Header";
import Footer from "../../../components/layout/Footer";
import api from "../../../lib/api";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, Save, Download, Eye,
  FileText, Loader2, ChevronDown, ChevronUp, X, Settings,
  Briefcase, ClipboardList, DollarSign, Layers, Clock, MapPin,
  AlertTriangle, CheckCircle, File
} from "lucide-react";

const CURRENCIES = ["GNF", "EUR", "USD", "CAD", "XOF", "GBP"];
const STATUSES = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publie" },
  { value: "archived", label: "Archive" },
];

const emptyDoc = () => ({ name: "", note: "", required: true });
const emptyStep = () => ({ title: "", description: "", duration: "", remarks: "", order: 0, documents: [], fees: 0, fees_currency: "" });
const emptyDetail = () => ({ title: "", content: "" });
const emptyService = () => ({
  title: "", description: "", cost: 0, currency: "GNF", delay: "",
  included: [], not_included: [],
});

/* ─── Reusable Components ─────────────────────────────────────── */

function Section({ title, icon, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-zinc-200/80 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button onClick={() => setOpen(!open)} type="button"
        className="w-full flex items-center gap-3 px-6 py-4 text-left group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6600] to-[#E55B00] flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <span className="font-semibold text-sm tracking-wide text-zinc-900 flex-1">{title}</span>
        {count !== undefined && (
          <span className="text-xs font-bold text-[#FF6600] bg-[#FF6600]/10 px-2 py-0.5 rounded-full">{count}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-6 pb-6 border-t border-zinc-100">{children}</div>}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", className = "", ...rest }) {
  return (
    <Field label={label} className={className}>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] transition-all"
        {...rest} />
    </Field>
  );
}

function TextArea2({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return (
    <Field label={label} className={className}>
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] transition-all resize-y" />
    </Field>
  );
}

function Select({ label, value, onChange, options, className = "", testId }) {
  return (
    <Field label={label} className={className}>
      <select value={value} onChange={onChange}
        className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]"
        data-testid={testId}>
        {options.map(o => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </Field>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */

export default function CreateFichePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: "", country: "Guinee", category: "", procedure_type: "",
    summary: "", currency: "GNF", official_fees: 0, service_cost: 0,
    estimated_delay: "", status: "draft",
    documents: [],
    steps: [emptyStep()],
    additional_details: [],
    service_offering: emptyService(),
  });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get("/company-settings").then(r => setSettings(r.data)).catch(() => {});
  }, []);

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

  // Step-level document handlers
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
    const steps = [...f.steps];
    const docs = [...(steps[si].documents || [])];
    docs[di] = { ...docs[di], [field]: val };
    steps[si] = { ...steps[si], documents: docs };
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

  const totalStepFees = form.steps.reduce((sum, s) => sum + (s.fees || 0), 0);
  const totalCost = totalStepFees + (form.official_fees || 0) + (form.service_cost || 0);
  const logoUrl = settings?.logo_url || "/Matrix.png";
  const companyName = settings?.company_name || "Matrix News";
  const sloganText = settings?.slogan || "Votre partenaire pour toutes vos demarches";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-50 flex flex-col" data-testid="create-fiche-page">
      <Header />

      {/* ─── Top Action Bar ─── */}
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
          <Link to="/admin/parametres-entreprise"
            className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-[#FF6600] hover:border-[#FF6600]/30 transition-all"
            title="Parametres entreprise" data-testid="settings-link">
            <Settings className="w-4 h-4" />
          </Link>
          <button onClick={() => saveFiche()} disabled={saving}
            className="h-9 bg-zinc-900 text-white px-4 rounded-lg text-xs font-semibold hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
            data-testid="save-fiche-btn">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Sauvegarder</span>
          </button>
          <button onClick={downloadPdf} disabled={downloading || saving}
            className="h-9 bg-gradient-to-r from-[#FF6600] to-[#E55B00] text-white px-4 rounded-lg text-xs font-semibold hover:from-[#E55B00] hover:to-[#CC5000] transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-[#FF6600]/20"
            data-testid="generate-pdf-btn">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Generer PDF</span>
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN — Form */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 space-y-5">

            {/* General Info */}
            <Section title="Informations generales" icon={<Briefcase className="w-4 h-4 text-white" />}>
              <div className="space-y-4 pt-5">
                <Input label="Titre de la procedure *" value={form.title}
                  onChange={e => updateField("title", e.target.value)}
                  placeholder="Ex: Visa Schengen depuis la Guinee" data-testid="fiche-title" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label="Pays" value={form.country}
                    onChange={e => updateField("country", e.target.value)} placeholder="Guinee" data-testid="fiche-country" />
                  <Input label="Categorie" value={form.category}
                    onChange={e => updateField("category", e.target.value)} placeholder="Immigration" data-testid="fiche-category" />
                  <Input label="Type" value={form.procedure_type}
                    onChange={e => updateField("procedure_type", e.target.value)} placeholder="Visa court sejour" data-testid="fiche-type" />
                </div>
                <TextArea2 label="Resume / Introduction" value={form.summary}
                  onChange={e => updateField("summary", e.target.value)}
                  placeholder="Description courte de la procedure..." data-testid="fiche-summary" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Select label="Devise" value={form.currency}
                    onChange={e => updateField("currency", e.target.value)}
                    options={CURRENCIES} testId="fiche-currency" />
                  <Input label="Frais officiels" value={form.official_fees}
                    onChange={e => updateField("official_fees", parseFloat(e.target.value) || 0)}
                    type="number" data-testid="fiche-official-fees" />
                  <Input label="Cout prestation" value={form.service_cost}
                    onChange={e => updateField("service_cost", parseFloat(e.target.value) || 0)}
                    type="number" data-testid="fiche-service-cost" />
                  <Input label="Delai estime" value={form.estimated_delay}
                    onChange={e => updateField("estimated_delay", e.target.value)}
                    placeholder="15-30 jours" data-testid="fiche-delay" />
                </div>
                <Select label="Statut" value={form.status}
                  onChange={e => updateField("status", e.target.value)}
                  options={STATUSES} testId="fiche-status" />
              </div>
            </Section>

            {/* Steps */}
            <Section title="Etapes de la procedure" icon={<ClipboardList className="w-4 h-4 text-white" />} count={form.steps.length}>
              <div className="space-y-4 pt-5">
                {form.steps.map((step, i) => (
                  <div key={`step-${i}`} className="bg-zinc-50/80 border border-zinc-200 rounded-lg overflow-hidden">
                    {/* Step header */}
                    <div className="flex items-center gap-2 p-3 bg-white border-b border-zinc-100">
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button onClick={() => moveStep(i, -1)} disabled={i === 0}
                          className="text-zinc-300 hover:text-[#FF6600] disabled:opacity-30 transition-colors" data-testid={`step-up-${i}`}>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveStep(i, 1)} disabled={i === form.steps.length - 1}
                          className="text-zinc-300 hover:text-[#FF6600] disabled:opacity-30 transition-colors" data-testid={`step-down-${i}`}>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6600] to-[#E55B00] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">{i + 1}</div>
                      <input value={step.title} onChange={e => updateStep(i, "title", e.target.value)}
                        placeholder="Titre de l'etape" data-testid={`step-title-${i}`}
                        className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 px-2 py-1.5 focus:outline-none placeholder:text-zinc-300" />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3 text-zinc-300" />
                        <input value={step.duration} onChange={e => updateStep(i, "duration", e.target.value)}
                          placeholder="Duree" data-testid={`step-duration-${i}`}
                          className="w-24 bg-zinc-50 border border-zinc-200 rounded-md text-[11px] px-2 py-1.5 text-zinc-500 focus:outline-none focus:border-[#FF6600]" />
                      </div>
                      <button onClick={() => removeStep(i)} className="text-zinc-300 hover:text-red-500 p-1 transition-colors" data-testid={`step-remove-${i}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Step body */}
                    <div className="p-3 space-y-3">
                      <textarea value={step.description} onChange={e => updateStep(i, "description", e.target.value)}
                        placeholder="Description detaillee de l'etape..." rows={2}
                        className="w-full bg-white border border-zinc-200 rounded-md text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] resize-y"
                        data-testid={`step-desc-${i}`} />
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-orange-400 mt-2 flex-shrink-0" />
                        <input value={step.remarks} onChange={e => updateStep(i, "remarks", e.target.value)}
                          placeholder="Remarques importantes (optionnel)"
                          className="flex-1 bg-white border border-orange-200 rounded-md text-xs px-3 py-2 text-orange-600 placeholder:text-orange-300 focus:outline-none focus:border-[#FF6600]"
                          data-testid={`step-remarks-${i}`} />
                      </div>

                      {/* Fees for step */}
                      <div className="flex items-center gap-2 bg-orange-50/50 border border-orange-200/50 rounded-md px-3 py-2">
                        <DollarSign className="w-3.5 h-3.5 text-[#FF6600] flex-shrink-0" />
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex-shrink-0">Frais</span>
                        <input type="number" value={step.fees || 0} onChange={e => updateStep(i, "fees", parseFloat(e.target.value) || 0)}
                          placeholder="0" data-testid={`step-fees-${i}`}
                          className="w-28 bg-white border border-zinc-200 rounded-md text-xs px-2.5 py-1.5 font-semibold focus:outline-none focus:border-[#FF6600]" />
                        <select value={step.fees_currency || form.currency}
                          onChange={e => updateStep(i, "fees_currency", e.target.value)}
                          data-testid={`step-fees-currency-${i}`}
                          className="bg-white border border-zinc-200 rounded-md text-xs px-2 py-1.5 focus:outline-none focus:border-[#FF6600]">
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      {/* Documents for step */}
                      <div className="bg-white border border-zinc-200 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <File className="w-3.5 h-3.5 text-[#FF6600]" />
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                            Documents requis ({(step.documents || []).length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(step.documents || []).map((doc, di) => (
                            <div key={`s${i}-d${di}`} className="flex items-center gap-2 bg-zinc-50 rounded-md px-2.5 py-2">
                              <span className="text-[9px] font-bold text-[#FF6600] bg-[#FF6600]/10 w-5 h-5 rounded flex items-center justify-center flex-shrink-0">{di + 1}</span>
                              <div className="flex-1 space-y-1">
                                <input value={doc.name} onChange={e => updateStepDoc(i, di, "name", e.target.value)}
                                  placeholder="Nom du document" data-testid={`step-${i}-doc-name-${di}`}
                                  className="w-full bg-white border border-zinc-200 rounded text-[11px] px-2.5 py-1.5 focus:outline-none focus:border-[#FF6600]" />
                                <input value={doc.note} onChange={e => updateStepDoc(i, di, "note", e.target.value)}
                                  placeholder="Note (optionnel)" data-testid={`step-${i}-doc-note-${di}`}
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
                        <button onClick={() => addStepDoc(i)}
                          className="mt-2 w-full border border-dashed border-zinc-300 rounded-md py-1.5 text-[10px] font-semibold text-zinc-400 hover:text-[#FF6600] hover:border-[#FF6600]/50 transition-colors flex items-center justify-center gap-1"
                          data-testid={`step-${i}-add-doc`}>
                          <Plus className="w-3 h-3" /> Ajouter un document
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addStep}
                  className="w-full border-2 border-dashed border-zinc-300 rounded-lg py-3 text-sm text-zinc-400 font-semibold hover:border-[#FF6600] hover:text-[#FF6600] transition-all flex items-center justify-center gap-2"
                  data-testid="add-step-btn">
                  <Plus className="w-4 h-4" /> Ajouter une etape
                </button>
              </div>
            </Section>

            {/* Additional details */}
            <Section title="Details supplementaires" icon={<Layers className="w-4 h-4 text-white" />} count={form.additional_details.length} defaultOpen={false}>
              <div className="space-y-3 pt-5">
                {form.additional_details.map((d, i) => (
                  <div key={`detail-${i}`} className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={d.title} onChange={e => updateDetail(i, "title", e.target.value)}
                        placeholder="Titre (ex: Conseils importants)" data-testid={`detail-title-${i}`}
                        className="flex-1 bg-white border border-zinc-200 rounded-md text-sm px-3 py-2 font-medium focus:outline-none focus:border-[#FF6600]" />
                      <button onClick={() => removeDetail(i)} className="text-zinc-300 hover:text-red-500 p-1 transition-colors" data-testid={`detail-remove-${i}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea value={d.content} onChange={e => updateDetail(i, "content", e.target.value)}
                      placeholder="Contenu..." rows={3}
                      className="w-full bg-white border border-zinc-200 rounded-md text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600] resize-y"
                      data-testid={`detail-content-${i}`} />
                  </div>
                ))}
                <button onClick={addDetail}
                  className="w-full border-2 border-dashed border-zinc-300 rounded-lg py-3 text-sm text-zinc-400 font-semibold hover:border-[#FF6600] hover:text-[#FF6600] transition-all flex items-center justify-center gap-2"
                  data-testid="add-detail-btn">
                  <Plus className="w-4 h-4" /> Ajouter une section
                </button>
              </div>
            </Section>

            {/* Service Offering */}
            <Section title="Ma prestation de service" icon={<Briefcase className="w-4 h-4 text-white" />} defaultOpen={false}>
              <div className="space-y-4 pt-5">
                <Input label="Intitule de la prestation" value={form.service_offering.title}
                  onChange={e => updateService("title", e.target.value)}
                  placeholder="Accompagnement complet..." data-testid="svc-title" />
                <TextArea2 label="Description" value={form.service_offering.description}
                  onChange={e => updateService("description", e.target.value)}
                  placeholder="Nous gerons votre dossier..." data-testid="svc-desc" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label="Cout" value={form.service_offering.cost}
                    onChange={e => updateService("cost", parseFloat(e.target.value) || 0)}
                    type="number" data-testid="svc-cost" />
                  <Select label="Devise" value={form.service_offering.currency}
                    onChange={e => updateService("currency", e.target.value)}
                    options={CURRENCIES} testId="svc-currency" />
                  <Input label="Delai" value={form.service_offering.delay}
                    onChange={e => updateService("delay", e.target.value)}
                    placeholder="5-7 jours" data-testid="svc-delay" />
                </div>

                {/* Included */}
                <div>
                  <label className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-2 block">Ce qui est inclus</label>
                  <div className="space-y-1.5">
                    {form.service_offering.included.map((item, i) => (
                      <div key={`inc-${i}`} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <input value={item} onChange={e => updateServiceItem("included", i, e.target.value)}
                          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-md text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600]"
                          data-testid={`svc-inc-${i}`} />
                        <button onClick={() => removeServiceItem("included", i)} className="text-zinc-300 hover:text-red-500 p-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addServiceItem("included")}
                    className="mt-2 text-xs text-[#FF6600] font-semibold hover:underline flex items-center gap-1"
                    data-testid="add-svc-inc">
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>

                {/* Not included */}
                <div>
                  <label className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider mb-2 block">Ce qui n'est pas inclus</label>
                  <div className="space-y-1.5">
                    {form.service_offering.not_included.map((item, i) => (
                      <div key={`exc-${i}`} className="flex items-center gap-2">
                        <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <input value={item} onChange={e => updateServiceItem("not_included", i, e.target.value)}
                          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-md text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600]"
                          data-testid={`svc-exc-${i}`} />
                        <button onClick={() => removeServiceItem("not_included", i)} className="text-zinc-300 hover:text-red-500 p-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addServiceItem("not_included")}
                    className="mt-2 text-xs text-[#FF6600] font-semibold hover:underline flex items-center gap-1"
                    data-testid="add-svc-exc">
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>
              </div>
            </Section>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN — Live Preview */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2">
            <div className="sticky top-[73px]">
              <div className="bg-white rounded-lg border border-zinc-200/80 shadow-lg overflow-hidden">
                {/* Preview toolbar */}
                <div className="bg-zinc-900 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-semibold tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> APERCU PDF
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                </div>

                {/* Preview content */}
                <div className="p-6 max-h-[calc(100vh-180px)] overflow-y-auto bg-white" data-testid="fiche-preview">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <img src={logoUrl} alt="Logo" className="h-12 mx-auto mb-2" onError={e => { e.target.style.display = 'none'; }} />
                    <p className="text-sm font-bold text-zinc-900 tracking-wide">{companyName}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{sloganText}</p>
                  </div>
                  <div className="h-[2px] bg-[#FF6600] mb-1" />
                  <div className="h-px bg-zinc-200 w-3/5 mx-auto mb-5" />

                  {/* Title */}
                  <div className="bg-gradient-to-r from-[#FF6600] to-[#E55B00] text-white text-center py-3 px-4 rounded-[3px] mb-4">
                    <p className="font-bold text-[13px] leading-tight">{form.title || "Titre de la procedure"}</p>
                  </div>

                  {/* Meta */}
                  {(form.country || form.category || form.estimated_delay) && (
                    <div className="grid grid-cols-3 gap-px bg-zinc-200 text-center text-[8px] mb-4 rounded overflow-hidden border border-zinc-200">
                      <div className="bg-zinc-50 py-2">
                        <div className="text-[7px] text-zinc-400 uppercase font-semibold">Pays</div>
                        <div className="font-bold text-zinc-700 mt-0.5">{form.country || "-"}</div>
                      </div>
                      <div className="bg-zinc-50 py-2">
                        <div className="text-[7px] text-zinc-400 uppercase font-semibold">Categorie</div>
                        <div className="font-bold text-zinc-700 mt-0.5">{form.category || "-"}</div>
                      </div>
                      <div className="bg-zinc-50 py-2">
                        <div className="text-[7px] text-zinc-400 uppercase font-semibold">Delai</div>
                        <div className="font-bold text-zinc-700 mt-0.5">{form.estimated_delay || "-"}</div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {form.summary && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-0.5 h-3 bg-[#FF6600] rounded-full" />
                        <p className="text-[9px] font-bold text-zinc-900 uppercase tracking-wider">Resume</p>
                      </div>
                      <div className="bg-orange-50/50 border border-orange-100 rounded-sm p-2.5">
                        <p className="text-[9px] text-zinc-600 leading-relaxed">{form.summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  {form.steps.some(s => s.title) && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-0.5 h-3 bg-[#FF6600] rounded-full" />
                        <p className="text-[9px] font-bold text-zinc-900 uppercase tracking-wider">Etapes de la Procedure</p>
                      </div>
                      <div className="space-y-2">
                        {form.steps.filter(s => s.title).map((step, i) => (
                          <div key={`prev-step-${i}`} className="flex items-start gap-2">
                            <div className="w-5 h-5 rounded bg-gradient-to-br from-[#FF6600] to-[#E55B00] text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                            <div className="text-[9px] flex-1 min-w-0">
                              <p className="font-bold text-zinc-900">{step.title}</p>
                              {step.duration && <p className="text-[#FF6600] text-[8px]">Duree : {step.duration}</p>}
                              {step.description && <p className="text-zinc-500 mt-0.5 leading-relaxed">{step.description}</p>}
                              {step.remarks && (
                                <div className="bg-red-50 border border-red-100 rounded-sm px-1.5 py-1 mt-1">
                                  <p className="text-red-600 text-[8px]">Important : {step.remarks}</p>
                                </div>
                              )}
                              {(step.documents || []).filter(d => d.name).length > 0 && (
                                <div className="mt-1.5 pl-2 border-l border-[#FF6600]/30">
                                  <p className="text-[7px] font-bold text-[#FF6600] uppercase">Documents requis</p>
                                  {step.documents.filter(d => d.name).map((doc, di) => (
                                    <p key={`psd-${i}-${di}`} className="text-[8px] text-zinc-600 mt-0.5">
                                      &bull; {doc.name}
                                      <span className={`ml-1 ${doc.required ? "text-[#FF6600] font-bold" : "text-zinc-400"}`}>
                                        [{doc.required ? "OBLIG." : "Opt."}]
                                      </span>
                                      {doc.note && <span className="italic text-zinc-400 ml-1">— {doc.note}</span>}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {step.fees > 0 && (
                                <div className="bg-orange-50 rounded-sm px-1.5 py-1 mt-1 inline-block">
                                  <p className="text-[8px] font-bold text-zinc-700">Frais : <span className="text-[#FF6600]">{step.fees.toLocaleString()} {step.fees_currency || form.currency}</span></p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional details */}
                  {form.additional_details.filter(d => d.title && d.content).map((d, i) => (
                    <div key={`prev-detail-${i}`} className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-0.5 h-3 bg-[#FF6600] rounded-full" />
                        <p className="text-[9px] font-bold text-zinc-900 uppercase tracking-wider">{d.title}</p>
                      </div>
                      <p className="text-[9px] text-zinc-600 leading-relaxed">{d.content}</p>
                    </div>
                  ))}

                  {/* Service offering */}
                  {form.service_offering.title && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-0.5 h-3 bg-[#FF6600] rounded-full" />
                        <p className="text-[9px] font-bold text-zinc-900 uppercase tracking-wider">Notre prestation</p>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-200 rounded-sm p-2.5">
                        <p className="text-[9px] font-bold text-zinc-900">{form.service_offering.title}</p>
                        {form.service_offering.description && (
                          <p className="text-[9px] text-zinc-500 mt-0.5">{form.service_offering.description}</p>
                        )}
                        {(form.service_offering.cost > 0 || form.service_offering.delay) && (
                          <p className="text-[9px] text-zinc-500 mt-1">
                            {form.service_offering.cost > 0 && <span className="font-bold text-[#FF6600]">{form.service_offering.cost.toLocaleString()} {form.service_offering.currency}</span>}
                            {form.service_offering.cost > 0 && form.service_offering.delay && " | "}
                            {form.service_offering.delay && <span>Delai : {form.service_offering.delay}</span>}
                          </p>
                        )}
                        {form.service_offering.included.filter(Boolean).length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {form.service_offering.included.filter(Boolean).map((item, idx) => (
                              <p key={`pi-${idx}`} className="text-[8px] text-green-600">&bull; {item}</p>
                            ))}
                          </div>
                        )}
                        {form.service_offering.not_included.filter(Boolean).length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {form.service_offering.not_included.filter(Boolean).map((item, idx) => (
                              <p key={`pe-${idx}`} className="text-[8px] text-red-500">&bull; {item}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fees summary */}
                  {totalCost > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-0.5 h-3 bg-[#FF6600] rounded-full" />
                        <p className="text-[9px] font-bold text-zinc-900 uppercase tracking-wider">Recapitulatif des Frais</p>
                      </div>
                      <div className="border border-zinc-200 rounded-sm overflow-hidden">
                        <div className="text-[8px] divide-y divide-zinc-100">
                          {form.steps.filter(s => s.fees > 0).map((step, idx) => (
                            <div key={`pf-${idx}`} className="flex justify-between px-2.5 py-1.5">
                              <span className="text-zinc-500">Etape {form.steps.indexOf(step) + 1} : {step.title || "—"}</span>
                              <span className="font-semibold text-zinc-700">{step.fees.toLocaleString()} {step.fees_currency || form.currency}</span>
                            </div>
                          ))}
                          {totalStepFees > 0 && (
                            <div className="flex justify-between px-2.5 py-1.5 bg-orange-50/50">
                              <span className="font-bold text-[#FF6600]">Sous-total etapes</span>
                              <span className="font-bold text-[#FF6600]">{totalStepFees.toLocaleString()} {form.currency}</span>
                            </div>
                          )}
                          {form.official_fees > 0 && (
                            <div className="flex justify-between px-2.5 py-1.5">
                              <span className="text-zinc-500">Frais officiels</span>
                              <span className="font-semibold text-zinc-700">{form.official_fees.toLocaleString()} {form.currency}</span>
                            </div>
                          )}
                          {form.service_cost > 0 && (
                            <div className="flex justify-between px-2.5 py-1.5">
                              <span className="text-zinc-500">Cout prestation</span>
                              <span className="font-semibold text-zinc-700">{form.service_cost.toLocaleString()} {form.currency}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-2.5 py-2 bg-orange-50 border-t-2 border-[#FF6600]">
                            <span className="font-bold text-zinc-900 text-[9px]">TOTAL GENERAL</span>
                            <span className="font-bold text-[#FF6600] text-[9px]">{totalCost.toLocaleString()} {form.currency}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t border-zinc-200 mt-4 pt-3 text-center space-y-0.5">
                    <p className="text-[8px] font-semibold text-zinc-500">{settings?.signature_text || "Matrix News - Services Professionnels"}</p>
                    <p className="text-[7px] text-zinc-400">
                      Document genere le {new Date().toLocaleDateString("fr-FR")}
                    </p>
                    <p className="text-[7px] text-zinc-400">{settings?.footer_text || ""}</p>
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
