import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['br', 'b', 'strong', 'i', 'em', 'a', 'p', 'span', 'ul', 'ol', 'li'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export function sanitizeHTML(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

export function sanitizeAndPreserveNewlines(text: string | null | undefined): string {
  if (!text) return '';
  return sanitizeHTML(text.replace(/\n/g, '<br>'));
}
