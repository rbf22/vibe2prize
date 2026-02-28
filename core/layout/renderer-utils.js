export function formatPageNumberLabel({ pageNumber, totalSlides, label = 'Page' } = {}) {
  const numericPage = Number.isFinite(pageNumber) ? pageNumber : null;
  if (!numericPage) {
    return label;
  }

  const paddedPage = String(Math.max(1, Math.floor(numericPage))).padStart(2, '0');
  if (Number.isFinite(totalSlides) && totalSlides > 0) {
    const paddedTotal = String(Math.max(1, Math.floor(totalSlides))).padStart(2, '0');
    return `${paddedPage} / ${paddedTotal}`;
  }

  return `${label} ${paddedPage}`;
}

export function normalizeRendererFlags(flags = {}) {
  return {
    previewChrome: Boolean(flags.previewChrome),
    showDiagnostics: Boolean(flags.showDiagnostics),
    showRegionOutlines: Boolean(flags.showRegionOutlines ?? flags.previewChrome),
    detectDomOverflow: flags.detectDomOverflow !== false
  };
}
