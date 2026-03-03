import { useRef, useState, useCallback } from "react";
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Image as ImageIcon,
  Type, Heading1, Heading2, Heading3, Pilcrow,
  Undo, Redo, Link as LinkIcon, Unlink
} from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

const FONT_SIZES = [
  { label: "Petit", value: "1" },
  { label: "Normal", value: "3" },
  { label: "Grand", value: "5" },
  { label: "Très grand", value: "7" },
];

const COLORS = [
  { label: "Noir", value: "#000000" },
  { label: "Gris", value: "#666666" },
  { label: "Orange", value: "#FF6600" },
  { label: "Rouge", value: "#DC2626" },
  { label: "Bleu", value: "#2563EB" },
  { label: "Vert", value: "#16A34A" },
];

function ToolButton({ icon: Icon, onClick, active, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 sm:p-2 rounded transition-colors ${
        active
          ? "bg-[#FF6600] text-white"
          : disabled
          ? "text-zinc-300 cursor-not-allowed"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-[#FF6600]"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function Separator() {
  return <div className="w-px h-6 bg-zinc-200 mx-1" />;
}

export default function AdvancedRichEditor({ value, onChange, placeholder = "Écrivez votre contenu ici..." }) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  
  // Execute command
  const exec = useCallback((cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleInput();
  }, []);
  
  // Handle content changes
  const handleInput = () => {
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };
  
  // Format block
  const formatBlock = (tag) => {
    exec("formatBlock", tag);
  };
  
  // Insert image
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Insert image at cursor position
      exec("insertHTML", `<img src="${res.data.url}" alt="Image" style="max-width: 100%; height: auto; margin: 1rem 0; border-radius: 8px;" />`);
      toast.success("Image ajoutée !");
    } catch (err) {
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  
  // Insert horizontal rule
  const insertHR = () => {
    exec("insertHTML", '<hr style="border: none; border-top: 2px solid #FF6600; margin: 1.5rem 0;" />');
  };
  
  // Insert link
  const insertLink = () => {
    if (!linkUrl.trim()) return;
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    exec("createLink", url);
    setShowLinkModal(false);
    setLinkUrl("");
  };
  
  // Remove link
  const removeLink = () => {
    exec("unlink");
  };
  
  // Insert blockquote with style
  const insertBlockquote = () => {
    exec("insertHTML", `<blockquote style="border-left: 4px solid #FF6600; background: #f9f9f9; padding: 1rem; margin: 1rem 0; font-style: italic;">Citation ici</blockquote>`);
  };
  
  // Insert bordered box
  const insertBox = () => {
    exec("insertHTML", `<div style="border: 2px solid #FF6600; padding: 1rem; margin: 1rem 0; border-radius: 8px; background: #FFF7ED;">Contenu encadré</div>`);
  };
  
  return (
    <div className="border border-zinc-300 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-zinc-200 bg-zinc-50 p-2 flex flex-wrap items-center gap-0.5">
        {/* Undo/Redo */}
        <ToolButton icon={Undo} onClick={() => exec("undo")} title="Annuler" />
        <ToolButton icon={Redo} onClick={() => exec("redo")} title="Rétablir" />
        
        <Separator />
        
        {/* Block formats */}
        <ToolButton icon={Pilcrow} onClick={() => formatBlock("p")} title="Paragraphe" />
        <ToolButton icon={Heading1} onClick={() => formatBlock("h1")} title="Titre 1" />
        <ToolButton icon={Heading2} onClick={() => formatBlock("h2")} title="Titre 2" />
        <ToolButton icon={Heading3} onClick={() => formatBlock("h3")} title="Titre 3" />
        
        <Separator />
        
        {/* Text formatting */}
        <ToolButton icon={Bold} onClick={() => exec("bold")} title="Gras (Ctrl+B)" />
        <ToolButton icon={Italic} onClick={() => exec("italic")} title="Italique (Ctrl+I)" />
        <ToolButton icon={Underline} onClick={() => exec("underline")} title="Souligné (Ctrl+U)" />
        <ToolButton icon={Strikethrough} onClick={() => exec("strikeThrough")} title="Barré" />
        
        <Separator />
        
        {/* Font size */}
        <select
          onChange={(e) => exec("fontSize", e.target.value)}
          className="text-xs border border-zinc-300 rounded px-1.5 py-1 focus:outline-none focus:border-[#FF6600]"
          title="Taille du texte"
        >
          <option value="">Taille</option>
          {FONT_SIZES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        
        {/* Color */}
        <select
          onChange={(e) => exec("foreColor", e.target.value)}
          className="text-xs border border-zinc-300 rounded px-1.5 py-1 focus:outline-none focus:border-[#FF6600]"
          title="Couleur du texte"
        >
          <option value="">Couleur</option>
          {COLORS.map(c => (
            <option key={c.value} value={c.value} style={{ color: c.value }}>{c.label}</option>
          ))}
        </select>
        
        <Separator />
        
        {/* Alignment */}
        <ToolButton icon={AlignLeft} onClick={() => exec("justifyLeft")} title="Aligner à gauche" />
        <ToolButton icon={AlignCenter} onClick={() => exec("justifyCenter")} title="Centrer" />
        <ToolButton icon={AlignRight} onClick={() => exec("justifyRight")} title="Aligner à droite" />
        <ToolButton icon={AlignJustify} onClick={() => exec("justifyFull")} title="Justifier" />
        
        <Separator />
        
        {/* Lists */}
        <ToolButton icon={List} onClick={() => exec("insertUnorderedList")} title="Liste à puces" />
        <ToolButton icon={ListOrdered} onClick={() => exec("insertOrderedList")} title="Liste numérotée" />
        
        <Separator />
        
        {/* Special elements */}
        <ToolButton icon={Quote} onClick={insertBlockquote} title="Citation" />
        <ToolButton icon={Minus} onClick={insertHR} title="Séparateur horizontal" />
        <button
          type="button"
          onClick={insertBox}
          title="Encadré"
          className="p-1.5 sm:p-2 rounded text-zinc-600 hover:bg-zinc-100 hover:text-[#FF6600] transition-colors text-xs font-bold border border-zinc-300"
        >
          ☐
        </button>
        
        <Separator />
        
        {/* Links */}
        <ToolButton icon={LinkIcon} onClick={() => setShowLinkModal(true)} title="Insérer un lien" />
        <ToolButton icon={Unlink} onClick={removeLink} title="Supprimer le lien" />
        
        <Separator />
        
        {/* Image */}
        <label className={`p-1.5 sm:p-2 rounded cursor-pointer transition-colors ${uploading ? "text-zinc-300" : "text-zinc-600 hover:bg-zinc-100 hover:text-[#FF6600]"}`}>
          <ImageIcon className="w-4 h-4" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {uploading && <span className="text-xs text-zinc-500 ml-1">Upload...</span>}
      </div>
      
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        dangerouslySetInnerHTML={{ __html: value || "" }}
        data-placeholder={placeholder}
        className="min-h-[400px] p-4 sm:p-6 focus:outline-none prose prose-sm sm:prose max-w-none
          prose-headings:font-['Oswald'] prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-black
          prose-p:font-['Manrope'] prose-p:text-zinc-700
          prose-a:text-[#FF6600]
          prose-strong:text-black
          prose-blockquote:border-l-[#FF6600]
          [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-zinc-400"
        style={{ 
          fontFamily: "'Manrope', sans-serif",
          fontSize: "16px",
          lineHeight: "1.7"
        }}
      />
      
      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="font-['Oswald'] text-lg font-bold uppercase mb-4">Insérer un lien</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border border-zinc-300 px-4 py-2 rounded mb-4 focus:outline-none focus:border-[#FF6600]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowLinkModal(false); setLinkUrl(""); }}
                className="px-4 py-2 text-sm font-bold uppercase text-zinc-600 hover:text-black"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={insertLink}
                className="px-4 py-2 text-sm font-bold uppercase bg-[#FF6600] text-white hover:bg-[#CC5200] rounded"
              >
                Insérer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
