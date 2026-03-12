import html
import re
import bleach
from typing import Optional

ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'video', 'source',
    'div', 'span', 'hr', 'pre', 'code', 'table', 'thead', 'tbody',
    'tr', 'th', 'td', 'figure', 'figcaption', 'sup', 'sub'
]
ALLOWED_ATTRS = {
    '*': ['style', 'class', 'id', 'data-*', 'contenteditable', 'draggable'],
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'width', 'height', 'style'],
    'video': ['src', 'controls', 'width', 'height', 'style'],
    'source': ['src', 'type'],
    'div': ['style', 'contenteditable', 'draggable'],
}

def sanitize_html(content: str) -> str:
    if not content:
        return ""
    cleaned = bleach.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        strip=True,
        protocols=['http', 'https', 'data', 'mailto']
    )
    return cleaned

def sanitize(text: str) -> str:
    if not text:
        return ""
    # Strip any HTML tags but preserve special characters (accents, apostrophes, etc.)
    cleaned = re.sub(r'<[^>]+>', '', text)
    return cleaned.strip()

def sanitize_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = url.strip()
    if not re.match(r'^https?://', url) and not url.startswith('/api/media/'):
        return None
    return url
