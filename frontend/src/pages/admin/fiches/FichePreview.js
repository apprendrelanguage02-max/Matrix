import { Eye } from "lucide-react";
import { useMemo } from "react";

export function FichePreview({ form, settings, totalStepFees, totalCost }) {
  const logoUrl = settings?.logo_url || "/Matrix.png";
  const companyName = settings?.company_name || "Matrix News";
  const sloganText = settings?.slogan || "Votre partenaire pour toutes vos demarches";

  return (
    <div className="lg:col-span-2">
      <div className="sticky top-[73px]">
        <div className="bg-white rounded-lg border border-zinc-200/80 shadow-lg overflow-hidden">
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

          <div className="p-6 max-h-[calc(100vh-180px)] overflow-y-auto bg-white" data-testid="fiche-preview">
            <PreviewHeader logoUrl={logoUrl} companyName={companyName} sloganText={sloganText} />
            <PreviewTitle title={form.title} />
            <PreviewMeta form={form} />
            <PreviewSummary summary={form.summary} />
            <PreviewSteps steps={form.steps} currency={form.currency} />
            <PreviewDetails details={form.additional_details} />
            <PreviewService service={form.service_offering} />
            <PreviewFees form={form} totalStepFees={totalStepFees} totalCost={totalCost} />
            <PreviewFooter settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewHeader({ logoUrl, companyName, sloganText }) {
  return (
    <div className="text-center mb-4">
      <img src={logoUrl} alt="Logo" className="h-12 mx-auto mb-2" onError={e => { e.target.style.display = 'none'; }} />
      <p className="text-sm font-bold text-zinc-900 tracking-wide">{companyName}</p>
      <p className="text-[10px] text-zinc-400 mt-0.5">{sloganText}</p>
      <div className="h-[2px] bg-[#FF6600] mt-4 mb-1" />
      <div className="h-px bg-zinc-200 w-3/5 mx-auto mb-5" />
    </div>
  );
}

function PreviewTitle({ title }) {
  return (
    <div className="bg-gradient-to-r from-[#FF6600] to-[#E55B00] text-white text-center py-3 px-4 rounded-[3px] mb-4">
      <p className="font-bold text-[13px] leading-tight">{title || "Titre de la procedure"}</p>
    </div>
  );
}

function PreviewMeta({ form }) {
  if (!form.country && !form.category && !form.estimated_delay) return null;
  return (
    <div className="grid grid-cols-3 gap-px bg-zinc-200 text-center text-[8px] mb-4 rounded overflow-hidden border border-zinc-200">
      {[
        { label: "Pays", value: form.country },
        { label: "Categorie", value: form.category },
        { label: "Delai", value: form.estimated_delay },
      ].map(m => (
        <div key={m.label} className="bg-zinc-50 py-2">
          <div className="text-[7px] text-zinc-400 uppercase font-semibold">{m.label}</div>
          <div className="font-bold text-zinc-700 mt-0.5">{m.value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

function PreviewSummary({ summary }) {
  if (!summary) return null;
  return (
    <div className="mb-4">
      <SectionLabel>Resume</SectionLabel>
      <div className="bg-orange-50/50 border border-orange-100 rounded-sm p-2.5">
        <p className="text-[9px] text-zinc-600 leading-relaxed whitespace-pre-wrap">{summary}</p>
      </div>
    </div>
  );
}

function PreviewSteps({ steps, currency }) {
  const filtered = useMemo(() => steps.filter(s => s.title), [steps]);
  if (!filtered.length) return null;
  return (
    <div className="mb-4">
      <SectionLabel>Etapes de la Procedure</SectionLabel>
      <div className="space-y-2">
        {filtered.map((step, i) => (
          <div key={`prev-step-${i}`} className="flex items-start gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-[#FF6600] to-[#E55B00] text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
            <div className="text-[9px] flex-1 min-w-0">
              <p className="font-bold text-zinc-900">{step.title}</p>
              {step.duration && <p className="text-[#FF6600] text-[8px]">Duree : {step.duration}</p>}
              {step.description && <p className="text-zinc-500 mt-0.5 leading-relaxed whitespace-pre-wrap">{step.description}</p>}
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
                  <p className="text-[8px] font-bold text-zinc-700">Frais : <span className="text-[#FF6600]">{step.fees.toLocaleString()} {step.fees_currency || currency}</span></p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewDetails({ details }) {
  const filtered = useMemo(() => details.filter(d => d.title && d.content), [details]);
  if (!filtered.length) return null;
  return filtered.map((d, i) => (
    <div key={`prev-detail-${i}`} className="mb-3">
      <SectionLabel>{d.title}</SectionLabel>
      <p className="text-[9px] text-zinc-600 leading-relaxed whitespace-pre-wrap">{d.content}</p>
    </div>
  ));
}

function PreviewService({ service }) {
  if (!service.title) return null;
  return (
    <div className="mb-3">
      <SectionLabel>Notre prestation</SectionLabel>
      <div className="bg-zinc-50 border border-zinc-200 rounded-sm p-2.5">
        <p className="text-[9px] font-bold text-zinc-900">{service.title}</p>
        {service.description && <p className="text-[9px] text-zinc-500 mt-0.5 whitespace-pre-wrap">{service.description}</p>}
        {(service.cost > 0 || service.delay) && (
          <p className="text-[9px] text-zinc-500 mt-1">
            {service.cost > 0 && <span className="font-bold text-[#FF6600]">{service.cost.toLocaleString()} {service.currency}</span>}
            {service.cost > 0 && service.delay && " | "}
            {service.delay && <span>Delai : {service.delay}</span>}
          </p>
        )}
        {service.included.filter(Boolean).length > 0 && (
          <div className="mt-1 space-y-0.5">
            {service.included.filter(Boolean).map((item, idx) => (
              <p key={`pi-${idx}`} className="text-[8px] text-green-600">&bull; {item}</p>
            ))}
          </div>
        )}
        {service.not_included.filter(Boolean).length > 0 && (
          <div className="mt-1 space-y-0.5">
            {service.not_included.filter(Boolean).map((item, idx) => (
              <p key={`pe-${idx}`} className="text-[8px] text-red-500">&bull; {item}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewFees({ form, totalStepFees, totalCost }) {
  const stepsWithFees = useMemo(() => form.steps.filter(s => s.fees > 0), [form.steps]);
  if (totalCost <= 0) return null;
  return (
    <div className="mb-3">
      <SectionLabel>Recapitulatif des Frais</SectionLabel>
      <div className="border border-zinc-200 rounded-sm overflow-hidden">
        <div className="text-[8px] divide-y divide-zinc-100">
          {stepsWithFees.map((step, idx) => (
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
  );
}

function PreviewFooter({ settings }) {
  return (
    <div className="border-t border-zinc-200 mt-4 pt-3 text-center space-y-0.5">
      <p className="text-[8px] font-semibold text-zinc-500">{settings?.signature_text || "Matrix News - Services Professionnels"}</p>
      <p className="text-[7px] text-zinc-400">Document genere le {new Date().toLocaleDateString("fr-FR")}</p>
      <p className="text-[7px] text-zinc-400">{settings?.footer_text || ""}</p>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <div className="w-0.5 h-3 bg-[#FF6600] rounded-full" />
      <p className="text-[9px] font-bold text-zinc-900 uppercase tracking-wider">{children}</p>
    </div>
  );
}
