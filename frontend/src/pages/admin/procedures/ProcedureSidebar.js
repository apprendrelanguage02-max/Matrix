import {
  ChevronDown, ChevronRight, Trash2, Plus, FileText,
  Download, Eye, MessageSquare, Zap, Loader2, Upload
} from "lucide-react";

const FLAG_URL = (code) => `https://flagcdn.com/24x18/${code}.png`;

export function ChatActionsSection({ chatActions }) {
  return (
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
  );
}

export function QuickActionsSection({ quickActions, addQuickAction, updateQuickAction, deleteQuickAction }) {
  return (
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
  );
}

export function PreviewSection({ form, categories, countries, steps, files }) {
  return (
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
  );
}

export function FilesSection({ form, files, isEdit, fileInputRef, uploadingFile, handleFileUpload, deleteFile }) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="section-files">
      <h2 className="text-[#FF6600] font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Conditions et Fichiers</h2>
      {form.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {form.keywords.map((kw) => (
            <span key={`kw-preview-${kw}`} className="bg-[#FF6600]/20 text-[#FF6600] text-[10px] font-bold px-2 py-0.5">{kw}</span>
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
  );
}
