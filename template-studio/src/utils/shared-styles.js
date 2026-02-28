const HEADING_ROLES = new Set(['primary-title', 'secondary-title', 'section-title']);

function parsePx(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && isFinite(value)) {
    return value;
  }
  const numeric = parseFloat(String(value).replace(/px$/i, '').trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function resolveRoleMetrics(role, brandSnapshot) {
  const metrics = brandSnapshot?.typography?.roles?.[role];
  if (!metrics) return null;
  const fontSizePx = parsePx(metrics.fontSize);
  const lineHeightPx = parsePx(metrics.lineHeight);
  if (!fontSizePx && !lineHeightPx) return null;
  return { fontSizePx, lineHeightPx };
}

function resolveFontFamily(role, brandSnapshot) {
  const headingFont = brandSnapshot?.typography?.heading;
  const bodyFont = brandSnapshot?.typography?.body;
  if (HEADING_ROLES.has(role) && headingFont) {
    return headingFont;
  }
  if (bodyFont) {
    return bodyFont;
  }
  return '"Space Grotesk", "Segoe UI", sans-serif';
}

function normalizeScale(scale) {
  if (!Number.isFinite(scale) || scale <= 0) {
    return 1;
  }
  return scale;
}

export function getRoleTypographyStyle({ role, scale = 1, brandSnapshot } = {}) {
  const normalizedScale = normalizeScale(scale);
  const isLight = brandSnapshot?.theme === 'light';
  const roleMetrics = resolveRoleMetrics(role, brandSnapshot);
  const baseStyles = {
    fontFamily: resolveFontFamily(role, brandSnapshot),
    margin: 0,
    display: 'block'
  };
  const applyMetricSize = (fallback) => {
    if (roleMetrics?.fontSizePx) {
      return `${roleMetrics.fontSizePx * normalizedScale}px`;
    }
    return fallback;
  };
  const applyMetricLineHeight = (fallback) => {
    if (roleMetrics?.lineHeightPx) {
      return `${roleMetrics.lineHeightPx * normalizedScale}px`;
    }
    if (typeof fallback === 'number') {
      return fallback.toString();
    }
    return fallback;
  };

  switch (role) {
    case 'primary-title':
      return {
        ...baseStyles,
        fontFamily: brandSnapshot?.typography?.heading || '"Newsreader", serif',
        fontSize: applyMetricSize(`${1.6 * normalizedScale}rem`),
        lineHeight: applyMetricLineHeight(1.15),
        letterSpacing: '-0.01em',
        color: isLight ? '#1a1a1a' : '#f5f7ff',
        fontWeight: 400
      };

    case 'secondary-title':
      return {
        ...baseStyles,
        fontSize: applyMetricSize(`${1.05 * normalizedScale}rem`),
        lineHeight: applyMetricLineHeight(1.3),
        color: isLight ? '#1a1a1a' : 'rgba(255, 255, 255, 0.92)',
        fontWeight: 400
      };

    case 'section-title':
      return {
        ...baseStyles,
        fontFamily: brandSnapshot?.typography?.heading || '"Newsreader", serif',
        fontSize: applyMetricSize(`${1 * normalizedScale}rem`),
        lineHeight: applyMetricLineHeight(1.2),
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: isLight ? '#1a1a1a' : '#f5f7ff',
        fontWeight: 400
      };

    case 'supporting-text':
    case 'context-info':
      return {
        ...baseStyles,
        fontSize: applyMetricSize(`${0.92 * normalizedScale}rem`),
        lineHeight: applyMetricLineHeight(1.35),
        color: isLight ? '#1a1a1a' : '#f5f7ff'
      };

    case 'criteria-list':
      return {
        ...baseStyles,
        fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
        fontSize: applyMetricSize(`${0.9 * normalizedScale}rem`),
        lineHeight: applyMetricLineHeight(1.3),
        color: isLight ? '#1a1a1a' : '#f5f7ff',
        whiteSpace: 'pre-line'
      };

    case 'key-data':
    case 'supporting-data':
      return {
        ...baseStyles,
        fontSize: applyMetricSize(`${1 * normalizedScale}rem`),
        lineHeight: applyMetricLineHeight(1.2),
        color: isLight ? '#1a1a1a' : '#f5f7ff',
        fontWeight: 600
      };

    case 'footer':
      return {
        ...baseStyles,
        fontSize: applyMetricSize(`${0.72 * normalizedScale}rem`),
        lineHeight: applyMetricLineHeight(1.2),
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: isLight ? '#1a1a1a' : 'rgba(255, 255, 255, 0.7)'
      };

    case 'page-number':
      return {
        ...baseStyles,
        fontSize: applyMetricSize(`${0.7 * normalizedScale}rem`),
        lineHeight: applyMetricLineHeight(1.2),
        letterSpacing: '0.2em',
        color: isLight ? '#1a1a1a' : '#f5f7ff'
      };

    default:
      return {
        ...baseStyles,
        fontSize: applyMetricSize(`${0.9 * normalizedScale}rem`),
        lineHeight: applyMetricLineHeight(1.4),
        color: isLight ? '#1a1a1a' : '#f5f7ff'
      };
  }
}

export function getTableStyleConfig({ scale = 1, brandSnapshot } = {}) {
  const normalizedScale = normalizeScale(scale);
  const isLight = brandSnapshot?.theme === 'light';
  const bodyFont = brandSnapshot?.typography?.body || '"Space Grotesk", "Segoe UI", sans-serif';
  return {
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: `${0.78 * normalizedScale}rem`,
      lineHeight: '1.3',
      color: isLight ? '#0b1633' : '#f8fbff',
      backgroundColor: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(0, 5, 12, 0.35)',
      borderRadius: '0.6rem',
      overflow: 'hidden',
      fontFamily: bodyFont
    },
    headCell: {
      padding: `${0.3 * normalizedScale}rem ${0.5 * normalizedScale}rem`,
      textAlign: 'left',
      borderBottom: `2px solid ${isLight ? '#e0e0e0' : 'rgba(255, 255, 255, 0.2)'}`,
      color: isLight ? '#1a1a1a' : '#f5f7ff',
      fontWeight: 600,
      fontFamily: bodyFont,
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    },
    bodyCell: {
      padding: `${0.25 * normalizedScale}rem ${0.5 * normalizedScale}rem`,
      borderBottom: `1px solid ${isLight ? '#f0f0f0' : 'rgba(255, 255, 255, 0.1)'}`,
      color: isLight ? '#1a1a1a' : 'rgba(255, 255, 255, 0.9)',
      fontFamily: bodyFont
    }
  };
}

function camelToKebab(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function styleObjectToCss(style = {}) {
  return Object.entries(style)
    .map(([key, value]) => `${camelToKebab(key)}: ${value};`)
    .join(' ');
}
