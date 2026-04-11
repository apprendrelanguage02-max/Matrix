import {
  FileText, CheckCircle, Clock, Eye, FolderOpen, Loader2,
  Download, Trash2, MessageSquare, Tag, Globe, Plus, Save, Edit, X
} from "lucide-react";
import { useMemo } from "react";
import { StatCard } from "./DashboardHelpers";

const FLAG_URL = (code) => `https://flagcdn.com/24x18/${code}.png`;

export function StatsTab({ stats, categories, countries, procedures }) {
  const topViewed = useMemo(
    () => [...procedures].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    [procedures]
  );

  const categoryBars = useMemo(() => {
    if (!stats?.by_category) return [];
    return Object.entries(stats.by_category).map(([cat, count]) => ({
      id: cat,
      name: categories.find(c => c.id === cat)?.name || cat,
      count,
      pct: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
    }));
  }, [stats, categories]);

  const countryCards = useMemo(() => {
    if (!stats?.by_country) return [];
    return Object.entries(stats.by_country).map(([cid, count]) => ({
      id: cid,
      country: countries.find(x => x.id === cid),
      count,
    }));
  }, [stats, countries]);

  return (
    <>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" value={stats.total} icon={FileText} />
          <StatCard label="Publiees" value={stats.published} icon={CheckCircle} color="#22c55e" />
          <StatCard label="Brouillons" value={stats.drafts} icon={Clock} color="#eab308" />
          <StatCard label="Vues totales" value={stats.total_views} icon={Eye} color="#3b82f6" />
        </div>
      )}
      {stats?.by_category && categoryBars.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6" data-testid="stats-by-category">
          <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Par categorie</h3>
          <div className="space-y-2">
            {categoryBars.map(({ id, name, count, pct }) => (
              <div key={id} className="flex items-center gap-3">
                <span className="text-zinc-400 text-xs w-44 truncate">{name}</span>
                <div className="flex-1 bg-zinc-800 h-3 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF6600] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-white text-xs font-bold w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {stats?.by_country && countryCards.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="stats-by-country">
          <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Par pays</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {countryCards.map(({ id, country: c, count }) => (
              <div key={id} className="flex items-center gap-3 bg-zinc-800 px-3 py-2.5 rounded">
                {c?.flag && <img src={FLAG_URL(c.flag)} alt="" className="w-5 h-4" />}
                <span className="text-zinc-300 text-xs flex-1">{c?.name || id}</span>
                <span className="text-[#FF6600] text-sm font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mt-6" data-testid="stats-top-viewed">
        <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4">Les plus consultees</h3>
        <div className="space-y-2">
          {topViewed.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 bg-zinc-800 px-3 py-2.5 rounded">
              <span className="text-[#FF6600] text-sm font-bold w-6">{i + 1}.</span>
              {p.country_flag && <img src={FLAG_URL(p.country_flag)} alt="" className="w-5 h-4" />}
              <span className="text-white text-sm flex-1 truncate">{p.title}</span>
              <span className="text-zinc-400 text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function DocumentsTab({ allFiles, filesLoading, handleDeleteFile }) {
  return (
    <>
      <p className="text-zinc-400 text-xs mb-4">{allFiles.length} fichier{allFiles.length !== 1 ? "s" : ""} attache{allFiles.length !== 1 ? "s" : ""}</p>
      {filesLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /></div>
      ) : allFiles.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Aucun document.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allFiles.map(f => (
            <div key={f.id} className="bg-zinc-900 border border-zinc-800 p-4 flex items-center gap-4 group" data-testid={`doc-${f.id}`}>
              <div className="w-10 h-10 bg-[#FF6600]/10 rounded flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-[#FF6600]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{f.file_name || f.original_filename}</p>
                <p className="text-zinc-500 text-[10px] mt-0.5">Procedure : <span className="text-zinc-400">{f.procedure_title}</span> | {f.file_type?.toUpperCase()}</p>
              </div>
              <a href={`${process.env.REACT_APP_BACKEND_URL}/api/procedures/files/${f.id}/download`} target="_blank" rel="noreferrer" className="p-2 text-zinc-400 hover:text-green-400"><Download className="w-4 h-4" /></a>
              <button onClick={() => handleDeleteFile(f.id)} className="p-2 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function ConfigTab({ countries, categories, chatActions, chatLoading, newAction, setNewAction, editingAction, setEditingAction, handleCreateChatAction, handleDeleteChatAction, handleUpdateChatAction }) {
  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6" data-testid="config-chat-actions">
        <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#FF6600]" /> Actions de Chat
        </h3>
        <div className="flex items-center gap-2 mb-4">
          <input value={newAction.title} onChange={e => setNewAction(prev => ({ ...prev, title: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleCreateChatAction()} placeholder="Ex: Visa Canada..." data-testid="new-chat-action-title"
            className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-[#FF6600]" />
          <select value={newAction.country} onChange={e => setNewAction(prev => ({ ...prev, country: e.target.value }))} data-testid="new-chat-action-country"
            className="bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 w-40 focus:outline-none focus:border-[#FF6600]">
            {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={handleCreateChatAction} data-testid="add-chat-action-btn" className="bg-[#FF6600] text-white text-xs font-bold uppercase px-4 py-2.5 hover:bg-[#CC5200]"><Plus className="w-4 h-4" /></button>
        </div>
        {chatLoading ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#FF6600]" /></div> :
          chatActions.length === 0 ? <p className="text-zinc-600 text-xs text-center py-4">Aucune action configuree.</p> : (
          <div className="space-y-1.5">
            {chatActions.map(a => (
              <div key={a.id} className="flex items-center gap-3 bg-zinc-800 px-3 py-2.5 rounded group" data-testid={`chat-action-${a.id}`}>
                {a.country_flag && <img src={FLAG_URL(a.country_flag)} alt="" className="w-5 h-4" />}
                {editingAction?.id === a.id ? (
                  <>
                    <input value={editingAction.title} onChange={e => setEditingAction(prev => ({ ...prev, title: e.target.value }))}
                      className="flex-1 bg-zinc-700 border border-zinc-600 text-white text-sm px-2 py-1 focus:outline-none focus:border-[#FF6600]" />
                    <button onClick={() => handleUpdateChatAction(editingAction)} className="text-green-400 hover:text-green-300"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingAction(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <span className="text-white text-sm flex-1">{a.title}</span>
                    <span className="text-zinc-600 text-[10px]">{a.country_name}</span>
                    <button onClick={() => setEditingAction({ ...a })} className="p-1 text-zinc-500 hover:text-[#FF6600] opacity-0 group-hover:opacity-100"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteChatAction(a.id)} className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="config-categories">
          <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-[#FF6600]" /> Categories</h3>
          <div className="space-y-1.5">
            {categories.map(c => <div key={c.id} className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded"><div className="w-2 h-2 bg-[#FF6600] rounded-full" /><span className="text-zinc-300 text-sm">{c.name}</span><span className="text-zinc-600 text-[10px] ml-auto">{c.id}</span></div>)}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5" data-testid="config-countries">
          <h3 className="text-white font-['Oswald'] text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-[#FF6600]" /> Pays disponibles</h3>
          <div className="space-y-1.5">
            {countries.map(c => <div key={c.id} className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded"><img src={FLAG_URL(c.flag)} alt="" className="w-5 h-4" /><span className="text-zinc-300 text-sm">{c.name}</span><span className="text-zinc-600 text-[10px] ml-auto">{c.id}</span></div>)}
          </div>
        </div>
      </div>
    </>
  );
}
