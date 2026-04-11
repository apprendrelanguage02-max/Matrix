import {
  Calendar, Eye, User, Tag, Zap, FileText, CheckCircle,
  Download, ChevronRight
} from "lucide-react";
import { formatDate } from "../../components/DetailPageHelpers";

const FLAG_URL = (code) => `https://flagcdn.com/24x18/${code}.png`;
const LOGO = "/nimba-logo.png";

const COMPLEXITY_CONFIG = {
  facile: { label: "Facile", color: "text-green-500", bg: "bg-green-500/10 border-green-500/30" },
  modere: { label: "Modere", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30" },
  difficile: { label: "Difficile", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" },
};

export { COMPLEXITY_CONFIG };

export function ProcedureDetailSidebar({ procedure, steps, files, quickActions, cx, setActiveStep }) {
  return (
    <div className="space-y-4">
      <InfoCard procedure={procedure} steps={steps} files={files} cx={cx} />
      {procedure.keywords?.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-lg p-5">
          <h3 className="text-xs font-bold uppercase text-zinc-400 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {procedure.keywords.map(kw => (
              <span key={`kw-${kw}`} className="bg-[#FF6600]/10 text-[#FF6600] text-[10px] font-bold px-2 py-0.5 rounded">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {quickActions.length > 0 && <QuickActionsCard quickActions={quickActions} setActiveStep={setActiveStep} />}
      <BrandingCard />
    </div>
  );
}

function InfoCard({ procedure, steps, files, cx }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5">
      <div className="space-y-3">
        {[
          { label: "Pays", value: <span className="flex items-center gap-2 text-sm font-bold">{procedure.country_flag && <img src={FLAG_URL(procedure.country_flag)} alt="" className="w-5 h-4" />}{procedure.country_name}</span> },
          { label: "Categorie", value: <span className="flex items-center gap-1.5 text-xs text-zinc-700"><Tag className="w-3 h-3" /> {procedure.category_name}</span> },
          { label: "Complexite", value: <span className={`text-xs font-bold px-2 py-0.5 border rounded ${cx.bg} ${cx.color}`}>{cx.label}</span> },
          { label: "Etapes", value: <span className="text-sm font-bold text-black">{steps.length}</span> },
          { label: "Documents", value: <span className="text-sm font-bold text-black">{files.length}</span> },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-zinc-500 text-xs font-bold uppercase">{row.label}</span>{row.value}
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 mt-3 pt-3 flex items-center justify-between text-xs text-zinc-400">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(procedure.created_at)}</span>
        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {procedure.views} vues</span>
      </div>
      <div className="border-t border-zinc-200 mt-3 pt-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {procedure.author_username || "Admin"}</span>
      </div>
    </div>
  );
}

function QuickActionsCard({ quickActions, setActiveStep }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-5" data-testid="quick-actions-section">
      <h3 className="text-xs font-bold uppercase text-zinc-400 mb-3 flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-[#FF6600]" /> Actions rapides
      </h3>
      <div className="space-y-2">
        {quickActions.map((qa, i) => {
          const icons = { view_documents: FileText, start_procedure: CheckCircle, download: Download, navigate: ChevronRight };
          const Icon = icons[qa.action_type] || ChevronRight;
          return (
            <button key={qa.id || i} data-testid={`quick-action-${i}`}
              onClick={() => {
                if (qa.action_type === "view_documents") document.querySelector('[data-testid="files-section"]')?.scrollIntoView({ behavior: "smooth" });
                else if (qa.action_type === "start_procedure") { document.querySelector('[data-testid="steps-section"]')?.scrollIntoView({ behavior: "smooth" }); setActiveStep(0); }
              }}
              className="w-full flex items-center gap-2 bg-zinc-50 hover:bg-[#FF6600] hover:text-white text-sm px-3 py-2.5 rounded transition-colors text-left group">
              <Icon className="w-4 h-4 text-[#FF6600] group-hover:text-white" />
              <span className="font-bold text-xs">{qa.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BrandingCard() {
  return (
    <div className="bg-black text-white rounded-lg p-5 text-center">
      <img src={LOGO} alt="Matrix News" className="w-10 h-10 mx-auto mb-2" />
      <p className="font-['Oswald'] text-sm font-bold uppercase tracking-wider">Matrix News</p>
      <a href="https://matrixnews.org" target="_blank" rel="noreferrer" className="text-[#FF6600] text-xs font-bold">matrixnews.org</a>
    </div>
  );
}
