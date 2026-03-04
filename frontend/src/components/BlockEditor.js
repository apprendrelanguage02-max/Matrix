import { useState, useRef, useCallback } from "react";
import {
  Type, Image as ImageIcon, Film, Quote, AlertTriangle, Table,
  GripVertical, Trash2, ChevronUp, ChevronDown, Plus, Loader2, Upload,
  Bold, Italic, Underline, AlignLeft, AlignCenter, List, ListOrdered, Link as LinkIcon
} from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

const BLOCK_TYPES = [
  { type: "text", label: "Texte", icon: Type, desc: "Paragraphe de texte riche" },
  { type: "image", label: "Image", icon: ImageIcon, desc: "Image avec legende" },
  { type: "video", label: "Video", icon: Film, desc: "Integration video (YouTube, etc.)" },
  { type: "quote", label: "Citation", icon: Quote, desc: "Citation stylisee" },
  { type: "alert", label: "Alerte", icon: AlertTriangle, desc: "Information cle / alerte" },
  { type: "table", label: "Tableau", icon: Table, desc: "Tableau de donnees" },
];

function genId() { return "blk_" + Math.random().toString(36).slice(2, 10); }

// ─── Rich Text Mini Editor ────────────────────────────────────────────────────
function RichTextBlock({ data, onChange }) {
  const editorRef = useRef(null);

  const exec = (cmd, val) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    onChange({ content: editorRef.current?.innerHTML || "" });
  };

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1 bg-zinc-50 border-b border-zinc-200 flex-wrap">
        {[
          { icon: Bold, cmd: "bold" },
          { icon: Italic, cmd: "italic" },
          { icon: Underline, cmd: "underline" },
          { icon: AlignLeft, cmd: "justifyLeft" },
          { icon: AlignCenter, cmd: "justifyCenter" },
          { icon: List, cmd: "insertUnorderedList" },
          { icon: ListOrdered, cmd: "insertOrderedList" },
        ].map(({ icon: Icon, cmd }) => (
          <button key={cmd} type="button" onMouseDown={e => { e.preventDefault(); exec(cmd); }}
            className="p-1.5 text-zinc-500 hover:text-[#FF6600] hover:bg-zinc-100 rounded transition-colors">
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <button type="button" onMouseDown={e => { e.preventDefault(); const url = prompt("URL du lien :"); if (url) exec("createLink", url); }}
          className="p-1.5 text-zinc-500 hover:text-[#FF6600] hover:bg-zinc-100 rounded transition-colors">
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[120px] p-4 text-sm leading-relaxed focus:outline-none prose prose-sm max-w-none"
        onInput={() => onChange({ content: editorRef.current?.innerHTML || "" })}
        dangerouslySetInnerHTML={{ __html: data.content || "" }}
      />
    </div>
  );
}

// ─── Image Block ──────────────────────────────────────────────────────────────
function ImageBlock({ data, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange({ ...data, url: res.data.url });
      toast.success("Image uploade");
    } catch { toast.error("Erreur upload"); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  if (!data.url) {
    return (
      <label className={`flex flex-col items-center justify-center h-40 border-2 border-dashed border-zinc-300 hover:border-[#FF6600] cursor-pointer transition-colors rounded-lg ${uploading ? "opacity-50" : ""}`}>
        {uploading ? <Loader2 className="w-6 h-6 animate-spin text-[#FF6600]" /> : (
          <>
            <Upload className="w-6 h-6 text-zinc-400 mb-2" />
            <span className="text-xs text-zinc-500">Cliquer pour uploader une image</span>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
    );
  }
  return (
    <div className="space-y-2">
      <div className="relative group rounded-lg overflow-hidden">
        <img src={data.url} alt={data.alt || ""} className="w-full max-h-[400px] object-cover" />
        <button type="button" onClick={() => onChange({ ...data, url: "" })}
          className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <input value={data.caption || ""} onChange={e => onChange({ ...data, caption: e.target.value })}
        placeholder="Legende de l'image..." className="w-full text-xs text-zinc-500 italic border-b border-zinc-200 py-1 px-1 focus:outline-none focus:border-[#FF6600]" />
      <input value={data.alt || ""} onChange={e => onChange({ ...data, alt: e.target.value })}
        placeholder="Texte alternatif (SEO)" className="w-full text-xs text-zinc-400 border-b border-zinc-100 py-1 px-1 focus:outline-none focus:border-[#FF6600]" />
    </div>
  );
}

// ─── Video Block ──────────────────────────────────────────────────────────────
function VideoBlock({ data, onChange }) {
  const getEmbedUrl = (url) => {
    if (!url) return "";
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    return url;
  };
  return (
    <div className="space-y-2">
      <input value={data.url || ""} onChange={e => onChange({ ...data, url: e.target.value })}
        placeholder="URL de la video (YouTube, Vimeo...)" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF6600]" />
      {data.url && (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe src={getEmbedUrl(data.url)} className="w-full h-full" frameBorder="0" allowFullScreen title="Video" />
        </div>
      )}
      <input value={data.caption || ""} onChange={e => onChange({ ...data, caption: e.target.value })}
        placeholder="Description de la video..." className="w-full text-xs text-zinc-500 italic border-b border-zinc-200 py-1 px-1 focus:outline-none focus:border-[#FF6600]" />
    </div>
  );
}

// ─── Quote Block ──────────────────────────────────────────────────────────────
function QuoteBlock({ data, onChange }) {
  return (
    <div className="border-l-4 border-[#FF6600] bg-orange-50 p-4 rounded-r-lg space-y-2">
      <textarea value={data.text || ""} onChange={e => onChange({ ...data, text: e.target.value })}
        placeholder="Texte de la citation..." rows={3}
        className="w-full bg-transparent text-base font-['Georgia'] italic resize-none focus:outline-none placeholder:text-orange-300" />
      <input value={data.author || ""} onChange={e => onChange({ ...data, author: e.target.value })}
        placeholder="— Auteur" className="w-full bg-transparent text-xs font-bold text-orange-700 focus:outline-none placeholder:text-orange-300" />
    </div>
  );
}

// ─── Alert Block ──────────────────────────────────────────────────────────────
function AlertBlock({ data, onChange }) {
  const types = [
    { value: "info", label: "Info", cls: "border-blue-400 bg-blue-50" },
    { value: "warning", label: "Attention", cls: "border-yellow-400 bg-yellow-50" },
    { value: "success", label: "Succes", cls: "border-green-400 bg-green-50" },
  ];
  const current = types.find(t => t.value === (data.type || "info")) || types[0];
  return (
    <div className={`border-l-4 ${current.cls} p-4 rounded-r-lg space-y-2`}>
      <div className="flex items-center gap-2">
        {types.map(t => (
          <button key={t.value} type="button" onClick={() => onChange({ ...data, type: t.value })}
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${data.type === t.value ? "bg-black text-white" : "bg-white text-zinc-500 border"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <textarea value={data.content || ""} onChange={e => onChange({ ...data, content: e.target.value })}
        placeholder="Contenu de l'alerte..." rows={2}
        className="w-full bg-transparent text-sm resize-none focus:outline-none" />
    </div>
  );
}

// ─── Table Block ──────────────────────────────────────────────────────────────
function TableBlock({ data, onChange }) {
  const headers = data.headers || ["Colonne 1", "Colonne 2"];
  const rows = data.rows || [["", ""]];

  const updateHeader = (i, val) => {
    const h = [...headers]; h[i] = val;
    onChange({ ...data, headers: h });
  };
  const updateCell = (ri, ci, val) => {
    const r = rows.map(row => [...row]); r[ri][ci] = val;
    onChange({ ...data, rows: r });
  };
  const addRow = () => onChange({ ...data, rows: [...rows, headers.map(() => "")] });
  const addCol = () => onChange({ ...data, headers: [...headers, `Col ${headers.length + 1}`], rows: rows.map(r => [...r, ""]) });
  const removeRow = (i) => onChange({ ...data, rows: rows.filter((_, j) => j !== i) });

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-zinc-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50">
              {headers.map((h, i) => (
                <th key={i} className="border-b border-r border-zinc-200 last:border-r-0">
                  <input value={h} onChange={e => updateHeader(i, e.target.value)} className="w-full px-3 py-2 font-bold text-xs uppercase bg-transparent focus:outline-none focus:bg-orange-50" />
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-zinc-50">
                {row.map((cell, ci) => (
                  <td key={ci} className="border-b border-r border-zinc-200 last:border-r-0">
                    <input value={cell} onChange={e => updateCell(ri, ci, e.target.value)} className="w-full px-3 py-2 text-sm bg-transparent focus:outline-none focus:bg-orange-50" />
                  </td>
                ))}
                <td className="border-b w-8 text-center">
                  <button type="button" onClick={() => removeRow(ri)} className="text-zinc-300 hover:text-red-500 p-1"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={addRow} className="text-[10px] font-bold uppercase text-[#FF6600] hover:underline">+ Ligne</button>
        <button type="button" onClick={addCol} className="text-[10px] font-bold uppercase text-[#FF6600] hover:underline">+ Colonne</button>
      </div>
    </div>
  );
}

// ─── Block Wrapper ────────────────────────────────────────────────────────────
function Block({ block, index, total, onChange, onDelete, onMoveUp, onMoveDown }) {
  const meta = BLOCK_TYPES.find(b => b.type === block.type);
  const Icon = meta?.icon || Type;
  const renderBlock = () => {
    switch (block.type) {
      case "text": return <RichTextBlock data={block.data} onChange={d => onChange(d)} />;
      case "image": return <ImageBlock data={block.data} onChange={d => onChange(d)} />;
      case "video": return <VideoBlock data={block.data} onChange={d => onChange(d)} />;
      case "quote": return <QuoteBlock data={block.data} onChange={d => onChange(d)} />;
      case "alert": return <AlertBlock data={block.data} onChange={d => onChange(d)} />;
      case "table": return <TableBlock data={block.data} onChange={d => onChange(d)} />;
      default: return <p className="text-zinc-400 text-sm">Bloc inconnu: {block.type}</p>;
    }
  };

  return (
    <div className="group relative bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 transition-colors" data-testid={`block-${block.id}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 bg-zinc-50 rounded-t-lg">
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="text-zinc-300 hover:text-zinc-600 disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="text-zinc-300 hover:text-zinc-600 disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
        </div>
        <Icon className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{meta?.label || block.type}</span>
        <div className="flex-1" />
        <button type="button" onClick={onDelete} className="text-zinc-300 hover:text-red-500 transition-colors p-1" title="Supprimer ce bloc">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-4">
        {renderBlock()}
      </div>
    </div>
  );
}

// ─── Block Picker ─────────────────────────────────────────────────────────────
function BlockPicker({ onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} data-testid="add-block-btn"
        className="flex items-center gap-2 mx-auto px-4 py-2 border-2 border-dashed border-zinc-300 text-zinc-400 text-xs font-bold uppercase tracking-wider hover:border-[#FF6600] hover:text-[#FF6600] transition-colors rounded-lg">
        <Plus className="w-4 h-4" /> Ajouter un bloc
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 p-2 grid grid-cols-2 sm:grid-cols-3 gap-1 w-[320px] sm:w-[420px]" data-testid="block-picker">
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} type="button" onClick={() => { onAdd(bt.type); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 hover:bg-orange-50 rounded-lg transition-colors text-left group" data-testid={`add-block-${bt.type}`}>
              <bt.icon className="w-4 h-4 text-zinc-400 group-hover:text-[#FF6600] flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-zinc-700 group-hover:text-[#FF6600]">{bt.label}</p>
                <p className="text-[10px] text-zinc-400">{bt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function BlockEditor({ blocks, onChange }) {
  const addBlock = useCallback((type) => {
    const defaultData = {
      text: { content: "" },
      image: { url: "", caption: "", alt: "" },
      video: { url: "", caption: "" },
      quote: { text: "", author: "" },
      alert: { type: "info", content: "" },
      table: { headers: ["Colonne 1", "Colonne 2", "Colonne 3"], rows: [["", "", ""]] },
    };
    onChange([...blocks, { id: genId(), type, data: defaultData[type] || {} }]);
  }, [blocks, onChange]);

  const updateBlock = useCallback((idx, newData) => {
    const updated = blocks.map((b, i) => i === idx ? { ...b, data: newData } : b);
    onChange(updated);
  }, [blocks, onChange]);

  const deleteBlock = useCallback((idx) => {
    onChange(blocks.filter((_, i) => i !== idx));
  }, [blocks, onChange]);

  const moveBlock = useCallback((idx, dir) => {
    const arr = [...blocks];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange(arr);
  }, [blocks, onChange]);

  return (
    <div className="space-y-3" data-testid="block-editor">
      {blocks.map((block, i) => (
        <Block
          key={block.id}
          block={block}
          index={i}
          total={blocks.length}
          onChange={d => updateBlock(i, d)}
          onDelete={() => deleteBlock(i)}
          onMoveUp={() => moveBlock(i, -1)}
          onMoveDown={() => moveBlock(i, 1)}
        />
      ))}
      <BlockPicker onAdd={addBlock} />
    </div>
  );
}
