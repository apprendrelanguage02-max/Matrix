import { useRef, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// Modules Quill avec gestion d'image via URL
function getModules(quillRef) {
  return {
    toolbar: {
      container: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote"],
        ["image"],
        ["clean"],
      ],
      handlers: {
        image: function () {
          const url = window.prompt("URL de l'image :");
          if (!url || !url.match(/^https?:\/\/.+/i)) {
            if (url) window.alert("URL invalide. Elle doit commencer par http:// ou https://");
            return;
          }
          const quill = quillRef.current?.getEditor();
          if (!quill) return;
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", url, "user");
          quill.setSelection(range.index + 1, 0);
        },
      },
    },
    clipboard: { matchVisual: false },
  };
}

const FORMATS = [
  "header", "bold", "italic", "underline",
  "list", "bullet",
  "blockquote", "image",
];

export default function RichEditor({ value, onChange, error }) {
  const quillRef = useRef(null);
  const modules = useCallback(() => getModules(quillRef), [])();

  return (
    <div className={`rich-editor-wrapper ${error ? "ring-1 ring-red-400" : ""}`}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={FORMATS}
        placeholder="Rédigez votre article ici... Utilisez la barre d'outils pour insérer des images, mettre du texte en gras, créer des listes, etc."
      />
    </div>
  );
}
