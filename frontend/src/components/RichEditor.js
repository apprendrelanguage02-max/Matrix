import { useRef, useEffect, useCallback, useState } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered,
  Quote, Image, Heading2, Heading3, Trash2, Upload, Loader2, Film
} from "lucide-react";
import api from "../lib/api";

function ToolbarBtn({ onClick, title, active, icon: Icon }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded transition-colors duration-150 ${
        active ? "bg-[#FF6600] text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-[#FF6600]"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-zinc-300 mx-1" />;
}

export default function RichEditor({ value, onChange, error }) {
  const editorRef = useRef(null);
  const [showImgPanel, setShowImgPanel] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const savedRange = useRef(null);

  // Initialize content
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Only set innerHTML on mount or external reset, not on every keystroke
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, []); // eslint-disable-line

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    notifyChange();
  }, []); // eslint-disable-line

  const notifyChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreRange = () => {
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const insertImage = () => {
    const url = imgUrl.trim();
    if (!url || !url.match(/^https?:\/\/.+/i)) {
      alert("URL invalide. Elle doit commencer par http:// ou https://");
      return;
    }
    editorRef.current?.focus();
    restoreRange();

    // Insert image as responsive block
    const img = `<p><img src="${url}" alt="Image insérée" loading="lazy" style="max-width:100%;height:auto;border-radius:8px;margin:12px auto;display:block;" /></p>`;
    document.execCommand("insertHTML", false, img);
    notifyChange();
    setImgUrl("");
    setShowImgPanel(false);
  };

  const handleImgBtnClick = () => {
    saveRange();
    setShowImgPanel((v) => !v);
  };

  return (
    <div className={`rich-editor-wrapper border ${error ? "border-red-400" : "border-zinc-300"} focus-within:border-[#FF6600] focus-within:ring-1 focus-within:ring-[#FF6600] transition-colors`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-zinc-200 bg-zinc-50">
        <ToolbarBtn icon={Heading2} title="Titre H2" onClick={() => exec("formatBlock", "h2")} />
        <ToolbarBtn icon={Heading3} title="Titre H3" onClick={() => exec("formatBlock", "h3")} />
        <ToolbarSep />
        <ToolbarBtn icon={Bold} title="Gras" onClick={() => exec("bold")} />
        <ToolbarBtn icon={Italic} title="Italique" onClick={() => exec("italic")} />
        <ToolbarBtn icon={Underline} title="Souligné" onClick={() => exec("underline")} />
        <ToolbarSep />
        <ToolbarBtn icon={List} title="Liste à puces" onClick={() => exec("insertUnorderedList")} />
        <ToolbarBtn icon={ListOrdered} title="Liste numérotée" onClick={() => exec("insertOrderedList")} />
        <ToolbarBtn icon={Quote} title="Citation" onClick={() => exec("formatBlock", "blockquote")} />
        <ToolbarSep />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleImgBtnClick(); }}
          title="Insérer une image"
          data-testid="insert-image-btn"
          className={`flex items-center gap-1.5 px-3 h-8 text-xs font-bold font-['Manrope'] uppercase tracking-wider rounded transition-colors duration-150 ${
            showImgPanel ? "bg-[#FF6600] text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-[#FF6600] border border-zinc-300"
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          Image
        </button>
        <div className="ml-auto">
          <ToolbarBtn icon={Trash2} title="Effacer la mise en forme" onClick={() => exec("removeFormat")} />
        </div>
      </div>

      {/* Image URL panel */}
      {showImgPanel && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-b border-[#FF6600]/30" data-testid="inline-image-panel">
          <Image className="w-4 h-4 text-[#FF6600] flex-shrink-0" />
          <input
            type="url"
            value={imgUrl}
            onChange={(e) => setImgUrl(e.target.value)}
            data-testid="inline-image-url-input"
            placeholder="https://exemple.com/photo.jpg"
            className="flex-1 bg-white border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:border-[#FF6600]"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), insertImage())}
            autoFocus
          />
          <button
            type="button"
            onClick={insertImage}
            data-testid="confirm-inline-image-btn"
            className="bg-[#FF6600] text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 hover:bg-[#CC5200] transition-colors whitespace-nowrap"
          >
            Insérer
          </button>
          <button
            type="button"
            onClick={() => { setShowImgPanel(false); setImgUrl(""); }}
            className="text-zinc-400 hover:text-black transition-colors p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-testid="content-input"
        onInput={notifyChange}
        onBlur={notifyChange}
        className="min-h-[320px] p-4 focus:outline-none article-content text-base"
        data-placeholder="Rédigez votre article ici... Utilisez la barre d'outils pour mettre en forme le texte et insérer des images."
      />
    </div>
  );
}
