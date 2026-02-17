/**
 * Parse article content and render inline images.
 * Syntax: [img:https://url-de-limage.jpg]
 * Returns an array of React elements (text blocks + img tags).
 */
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
            className="max-w-full w-full object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </span>
      );
    }
    // Regular text — preserve line breaks
    return part ? (
      <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>
    ) : null;
  });
}

/**
 * Strip [img:...] tags to get plain text for previews
 */
export function stripImageTags(content) {
  if (!content) return "";
  return content.replace(/\[img:[^\]]+\]/g, "").trim();
}
