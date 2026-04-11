import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, ChevronDown, ChevronRight, Trash2, Plus,
  FileText, Video, Link as LinkIcon, X
} from "lucide-react";

export function SortableStep({ step, index, isOpen, onToggle, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="border border-zinc-700 bg-zinc-900/50 rounded-lg mb-2 overflow-hidden"
      data-testid={`step-${index}`}>
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
          <StepDocuments step={step} index={index} onUpdate={onUpdate} />
          <label className="flex items-center gap-2 cursor-pointer">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              step.mandatory ? "bg-[#FF6600] border-[#FF6600]" : "border-zinc-600"
            }`} onClick={() => onUpdate({ ...step, mandatory: !step.mandatory })}>
              {step.mandatory && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
            </div>
            <span className="text-zinc-300 text-xs">Cette etape est obligatoire</span>
          </label>
          <div>
            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block flex items-center gap-1">
              <Video className="w-3 h-3" /> URL Video
            </label>
            <input value={step.video_url || ""} onChange={e => onUpdate({ ...step, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=... ou URL directe"
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs px-3 py-2 focus:outline-none focus:border-[#FF6600]"
              data-testid={`step-video-${index}`} />
          </div>
          <StepLinks step={step} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

function StepDocuments({ step, index, onUpdate }) {
  return (
    <div>
      <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block flex items-center gap-1">
        <FileText className="w-3 h-3" /> Documents requis
      </label>
      <div className="space-y-1.5">
        {(step.required_documents || []).map((doc, di) => (
          <div key={`doc-${di}`} className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#FF6600]/20 border border-[#FF6600] rounded flex items-center justify-center">
              <div className="w-2 h-2 bg-[#FF6600] rounded-sm" />
            </div>
            <input value={doc} onChange={e => {
              const docs = [...step.required_documents]; docs[di] = e.target.value;
              onUpdate({ ...step, required_documents: docs });
            }} className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FF6600]" />
            <button onClick={() => {
              onUpdate({ ...step, required_documents: step.required_documents.filter((_, i) => i !== di) });
            }} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate({ ...step, required_documents: [...(step.required_documents || []), ""] })}
          className="text-[#FF6600] text-xs font-bold flex items-center gap-1 hover:text-[#CC5200]">
          <Plus className="w-3 h-3" /> Ajouter un document
        </button>
      </div>
    </div>
  );
}

function StepLinks({ step, onUpdate }) {
  return (
    <div>
      <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1 block flex items-center gap-1">
        <LinkIcon className="w-3 h-3" /> Liens utiles
      </label>
      <div className="space-y-1.5">
        {(step.links || []).map((link, li) => (
          <div key={`link-${li}`} className="flex items-center gap-2">
            <input value={link.label || ""} onChange={e => {
              const links = [...(step.links || [])]; links[li] = { ...links[li], label: e.target.value };
              onUpdate({ ...step, links });
            }} placeholder="Label" className="w-1/3 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FF6600]" />
            <input value={link.url || ""} onChange={e => {
              const links = [...(step.links || [])]; links[li] = { ...links[li], url: e.target.value };
              onUpdate({ ...step, links });
            }} placeholder="https://..." className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FF6600]" />
            <button onClick={() => {
              onUpdate({ ...step, links: (step.links || []).filter((_, i) => i !== li) });
            }} className="text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate({ ...step, links: [...(step.links || []), { label: "", url: "" }] })}
          className="text-[#FF6600] text-xs font-bold flex items-center gap-1 hover:text-[#CC5200]">
          <Plus className="w-3 h-3" /> Ajouter un lien
        </button>
      </div>
    </div>
  );
}
