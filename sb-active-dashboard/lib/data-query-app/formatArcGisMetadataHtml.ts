/**
 * Normalize and sanitize HTML snippets from ArcGIS portal / service metadata.
 * Allows basic formatting tags only (no scripts, events, or embedded content).
 */

const ALLOWED_TAGS = new Set([
  "br",
  "p",
  "div",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "span",
]);

export function metadataContainsHtml(value: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(value);
}

/** Normalize common ArcGIS break tag variants before rendering. */
export function normalizeArcGisBreakTags(html: string): string {
  return html
    .replace(/<br\s*\/?>\s*<\/br>/gi, "<br />")
    .replace(/<br\s*>/gi, "<br />");
}

function stripDisallowedElements(root: HTMLElement): void {
  const walker = root.querySelectorAll("*");
  walker.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }

    for (const attr of Array.from(el.attributes)) {
      if (tag === "a" && attr.name === "href") {
        const href = attr.value.trim();
        if (!/^https?:\/\//i.test(href)) {
          el.removeAttribute("href");
        }
        continue;
      }
      el.removeAttribute(attr.name);
    }
  });
}

/**
 * Returns sanitized HTML safe for `dangerouslySetInnerHTML` in metadata panels.
 */
export function formatArcGisMetadataHtml(raw: string): string {
  const normalized = normalizeArcGisBreakTags(raw.trim());
  if (!normalized) return "";

  if (typeof DOMParser === "undefined") {
    return normalized.replace(/<[^>]+>/g, "");
  }

  const doc = new DOMParser().parseFromString(normalized, "text/html");
  doc.querySelectorAll("script, style, iframe, object, embed").forEach((node) => {
    node.remove();
  });
  stripDisallowedElements(doc.body);
  return doc.body.innerHTML.trim();
}
