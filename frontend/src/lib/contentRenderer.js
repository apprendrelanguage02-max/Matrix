/**
 * Smart content renderer:
 * - If content contains HTML tags → renders as sanitized HTML
 * - Otherwise → renders legacy [img:url] format (backwards compat)
 */

export function isHtmlContent(content) {
  return content && /<[a-z][\s\S]*>/i.test(content);
}

/**
 * Strip all HTML tags and [img:...] tokens for plain text excerpts
 */
export function stripToPlainText(content) {
  if (!content) return "";
  return content
    .replace(/<[^>]*>/g, " ")
    .replace(/\[img:[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Legacy: keep for old [img:url] articles
export function renderContent(content) {
  if (!content) return null;
  const parts = content.split(/(\[img:[^\]]+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[img:(.+)\]$/);
    if (match) {
      return (
        <span key={i} className="block my-6">
          <img
            src={match[1]}
            alt="Image insérée"
            loading="lazy"
            className="max-w-full w-full object-cover rounded-lg"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </span>
      );
    }
    return part ? <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span> : null;
  });
}

export function stripImageTags(content) {
  return stripToPlainText(content);
}
