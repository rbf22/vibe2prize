const DEFAULT_BRAND = {
  id: 'default',
  label: 'Template Studio',
  typography: {
    heading: '"Newsreader", serif',
    body: '"Space Grotesk", "Segoe UI", sans-serif'
  },
  assets: {
    logo: {
      dark: null,
      light: null
    }
  },
  defaultTheme: 'dark',
  variants: {
    dark: {
      label: 'Midnight',
      cssVars: {
        '--bg': 'radial-gradient(circle at top left, #0f1c34, #040715 65%)',
        '--panel': 'rgba(6, 12, 24, 0.85)',
        '--panel-border': 'rgba(255, 255, 255, 0.09)',
        '--primary': '#81f0c8',
        '--accent': '#f6b36c',
        '--muted': 'rgba(255, 255, 255, 0.7)',
        '--grid-line': 'rgba(160, 170, 190, 0.35)',
        '--indicator': 'rgba(255, 94, 214, 0.9)',
        '--indicator-soft': 'rgba(255, 94, 214, 0.35)',
        '--guide-line': 'rgba(255, 94, 214, 0.35)',
        '--guide-accent': 'rgba(255, 94, 214, 0.9)',
        '--guide-label': 'rgba(8, 19, 37, 0.7)',
        '--font-heading': '"Newsreader", serif',
        '--font-body': '"Space Grotesk", "Segoe UI", sans-serif'
      },
      tokens: {
        palette: {
          primary: '#81f0c8',
          accent: '#f6b36c',
          muted: 'rgba(255, 255, 255, 0.7)',
          surface: '#040715'
        }
      }
    },
    light: {
      label: 'Frost',
      cssVars: {
        '--bg': 'radial-gradient(circle at top left, #ffffff, #eef2ff 65%)',
        '--panel': 'rgba(247, 248, 255, 0.95)',
        '--panel-border': 'rgba(10, 34, 92, 0.12)',
        '--primary': '#3a6ff8',
        '--accent': '#f07f4f',
        '--muted': 'rgba(18, 23, 44, 0.7)',
        '--grid-line': 'rgba(34, 54, 94, 0.25)',
        '--indicator': '#3a6ff8',
        '--indicator-soft': 'rgba(58, 111, 248, 0.3)',
        '--guide-line': 'rgba(58, 111, 248, 0.3)',
        '--guide-accent': '#3a6ff8',
        '--guide-label': 'rgba(255, 255, 255, 0.8)',
        '--font-heading': '"Newsreader", serif',
        '--font-body': '"Space Grotesk", "Segoe UI", sans-serif'
      },
      tokens: {
        palette: {
          primary: '#3a6ff8',
          accent: '#f07f4f',
          muted: 'rgba(18, 23, 44, 0.7)',
          surface: '#f7f8ff'
        }
      }
    }
  }
};

const EPAM_BRAND = {
  id: 'epam',
  label: 'EPAM Systems',
  typography: {
    heading: '"Museo", "Newsreader", serif',
    body: '"Source Sans Pro", "Space Grotesk", "Segoe UI", sans-serif'
  },
  assets: {
    logo: {
      dark: 'assets/brands/epam/logo-light.svg',
      light: 'assets/brands/epam/logo-dark.svg'
    }
  },
  editorialThemes: [
    'Converging Forces',
    'The Modernization Imperative',
    'Orchestrating Complexity',
    'The Value of Trust'
  ],
  defaultTheme: 'dark',
  variants: {
    dark: {
      label: 'Sea Night',
      cssVars: {
        '--bg': 'linear-gradient(120deg, #050b1a 0%, #0b182f 100%)',
        '--panel': 'rgba(8, 16, 40, 0.85)',
        '--panel-border': 'rgba(255, 255, 255, 0.08)',
        '--primary': '#00F6FF',
        '--accent': '#00FFF0',
        '--muted': 'rgba(246, 251, 255, 0.7)',
        '--grid-line': 'rgba(123, 168, 255, 0.3)',
        '--indicator': '#00FFF0',
        '--indicator-soft': 'rgba(0, 255, 240, 0.35)',
        '--guide-line': 'rgba(0, 255, 240, 0.35)',
        '--guide-accent': '#00F6FF',
        '--guide-label': 'rgba(8, 16, 40, 0.7)',
        '--font-heading': '"Museo", "Newsreader", serif',
        '--font-body': '"Source Sans Pro", "Space Grotesk", "Segoe UI", sans-serif'
      },
      tokens: {
        palette: {
          sea: '#00F6FF',
          mint: '#00FFF0',
          lilac: '#B896FF',
          sky: '#7BA8FF',
          night: '#060606'
        }
      },
      assets: {
        backgroundNoise: 'radial-gradient(circle at 20% 20%, rgba(0, 255, 240, 0.08), transparent 55%)'
      }
    },
    light: {
      label: 'Cobalt Day',
      cssVars: {
        '--bg': 'linear-gradient(120deg, #f5f7fb 0%, #ffffff 100%)',
        '--panel': 'rgba(255, 255, 255, 0.92)',
        '--panel-border': 'rgba(10, 34, 92, 0.1)',
        '--primary': '#0047FF',
        '--accent': '#00D1FF',
        '--muted': 'rgba(0, 0, 0, 0.65)',
        '--grid-line': 'rgba(74, 113, 189, 0.25)',
        '--indicator': '#0047FF',
        '--indicator-soft': 'rgba(0, 71, 255, 0.2)',
        '--guide-line': 'rgba(0, 71, 255, 0.2)',
        '--guide-accent': '#0047FF',
        '--guide-label': 'rgba(255, 255, 255, 0.9)',
        '--font-heading': '"Museo", "Newsreader", serif',
        '--font-body': '"Source Sans Pro", "Space Grotesk", "Segoe UI", sans-serif'
      },
      tokens: {
        palette: {
          cobalt: '#0047FF',
          aqua: '#0078C2',
          iris: '#8453D2',
          slate: '#4A71BD',
          snow: '#FBFAFA'
        }
      }
    }
  }
};

export const BRANDS = {
  [DEFAULT_BRAND.id]: DEFAULT_BRAND,
  [EPAM_BRAND.id]: EPAM_BRAND
};

export function listBrandOptions() {
  return Object.values(BRANDS).map(({ id, label }) => ({ id, label }));
}

export function getBrandDefinition(brandId) {
  return BRANDS[brandId] || BRANDS.default;
}

function resolveBrandVariant(brandId, variantId) {
  const brand = getBrandDefinition(brandId);
  const desiredVariant = variantId && brand.variants[variantId] ? variantId : brand.defaultTheme;
  const variantConfig = brand.variants[desiredVariant];
  return {
    brand,
    variantId: desiredVariant,
    variantConfig
  };
}

export function listBrandThemeOptions(brandId) {
  const brand = getBrandDefinition(brandId);
  return Object.entries(brand.variants).map(([id, variant]) => ({
    id,
    label: variant.label || id
  }));
}

export function applyBrandTheme(brandId, variantId) {
  if (typeof document === 'undefined') {
    const { brand, variantId: resolvedVariant } = resolveBrandVariant(brandId, variantId);
    return { brandId: brand.id, variant: resolvedVariant };
  }

  const { brand, variantId: resolvedVariant, variantConfig } = resolveBrandVariant(brandId, variantId);
  const root = document.documentElement;
  root.dataset.brand = brand.id;
  root.dataset.brandTheme = resolvedVariant;

  const cssVars = variantConfig?.cssVars || {};
  Object.entries(cssVars).forEach(([token, value]) => {
    if (value !== undefined && value !== null) {
      root.style.setProperty(token, value);
    }
  });

  if (brand.typography) {
    if (brand.typography.heading) {
      root.style.setProperty('--font-heading', brand.typography.heading);
    }
    if (brand.typography.body) {
      root.style.setProperty('--font-body', brand.typography.body);
    }
  }

  return { brandId: brand.id, variant: resolvedVariant };
}

export function getBrandSnapshot(brandId, variantId) {
  const { brand, variantId: resolvedVariant, variantConfig } = resolveBrandVariant(brandId, variantId);
  if (!brand) return null;

  return {
    id: brand.id,
    label: brand.label,
    theme: resolvedVariant,
    typography: { ...brand.typography },
    assets: {
      ...(brand.assets || {}),
      ...(variantConfig?.assets || {})
    },
    tokens: {
      palette: variantConfig?.tokens?.palette || null,
      cssVars: variantConfig?.cssVars || null
    },
    editorialThemes: brand.editorialThemes || null
  };
}

export function emitBrandStateChanged(brandState = null) {
  if (typeof document === 'undefined') return;
  const detail = brandState
    ? { brand: { ...brandState } }
    : { brand: null };
  document.dispatchEvent(new CustomEvent('brandStateChanged', { detail }));
}
