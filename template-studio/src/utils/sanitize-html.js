const SCRIPT_REGEX = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const EVENT_HANDLER_REGEX = / on[a-z]+="[^"]*"/gi;
const EVENT_HANDLER_REGEX_SINGLE = / on[a-z]+='[^']*'/gi;
const JAVASCRIPT_URI_REGEX = /javascript:/gi;

function basicSanitize(html) {
  return String(html || '')
    .replace(SCRIPT_REGEX, '')
    .replace(EVENT_HANDLER_REGEX, '')
    .replace(EVENT_HANDLER_REGEX_SINGLE, '')
    .replace(JAVASCRIPT_URI_REGEX, '');
}

function stripDangerousAttributes(node) {
  if (!node || !node.querySelectorAll) return;
  const scripts = node.querySelectorAll('script');
  scripts.forEach((script) => script.remove());

  const elements = node.querySelectorAll('*');
  elements.forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
}

export function sanitizeHtmlFragment(html) {
  if (!html) return '';

  if (typeof document === 'undefined') {
    return basicSanitize(html);
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  stripDangerousAttributes(template.content);
  return template.innerHTML;
}
