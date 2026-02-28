import {
  listBrandOptions as listRegisteredBrands,
  listBrandThemeOptions as listRegisteredThemes,
  getBrandDefinition as loadBrandDefinition,
  getBrandSnapshot as loadBrandSnapshot
} from '../../../core/brand/loader.js';

const DEFAULT_BRAND_ID = 'default';

function resolveBrandVariant(brandId, variantId) {
  const definition = loadBrandDefinition(brandId || DEFAULT_BRAND_ID);
  const variants = definition.variants || {};
  const desiredVariant = variantId && variants[variantId]
    ? variantId
    : (definition.defaultTheme || Object.keys(variants)[0] || 'default');
  const variantConfig = variants[desiredVariant] || {};
  return {
    definition,
    variantId: desiredVariant,
    variantConfig
  };
}

export function listBrandOptions() {
  return listRegisteredBrands();
}

export function listBrandThemeOptions(brandId) {
  return listRegisteredThemes(brandId || DEFAULT_BRAND_ID);
}

export function getBrandSnapshot(brandId, variantId) {
  return loadBrandSnapshot(brandId || DEFAULT_BRAND_ID, variantId);
}

export function adaptSnapshotToDom(snapshot) {
  if (typeof document === 'undefined' || !snapshot?.theme) {
    return snapshot;
  }
  const root = document.documentElement;
  const appliedTheme = root.dataset.brandTheme;
  if (!appliedTheme) {
    return snapshot;
  }
  return {
    ...snapshot,
    theme: appliedTheme
  };
}

function toCssVarName(roleKey, metric) {
  return `--role-${roleKey.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}-${metric}`;
}

function formatCssSize(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return `${value}px`;
  const trimmed = String(value).trim();
  if (!trimmed.length) return null;
  return trimmed;
}

export function applyBrandTheme(brandId, variantId) {
  const { definition, variantId: resolvedVariant, variantConfig } = resolveBrandVariant(brandId, variantId);

  if (typeof document === 'undefined') {
    return { brandId: definition.id, variant: resolvedVariant };
  }

  const root = document.documentElement;
  root.dataset.brand = definition.id;
  root.dataset.brandTheme = resolvedVariant;

  const priorRoleVars = root.dataset.brandRoleVars
    ? root.dataset.brandRoleVars.split(',').map((token) => token.trim()).filter(Boolean)
    : [];
  priorRoleVars.forEach((token) => {
    root.style.removeProperty(token);
  });

  const appliedRoleVars = [];

  const cssVars = variantConfig?.cssVars || {};
  Object.entries(cssVars).forEach(([token, value]) => {
    if (value !== undefined && value !== null) {
      root.style.setProperty(token, value);
    }
  });

  if (definition.typography) {
    if (definition.typography.heading) {
      root.style.setProperty('--font-heading', definition.typography.heading);
    }
    if (definition.typography.body) {
      root.style.setProperty('--font-body', definition.typography.body);
    }

    if (definition.typography.roles && typeof definition.typography.roles === 'object') {
      Object.entries(definition.typography.roles).forEach(([roleKey, metrics = {}]) => {
        const sizeValue = formatCssSize(metrics.fontSize);
        const lineHeightValue = formatCssSize(metrics.lineHeight);
        if (sizeValue) {
          const varName = toCssVarName(roleKey, 'font-size');
          root.style.setProperty(varName, sizeValue);
          appliedRoleVars.push(varName);
        }
        if (lineHeightValue) {
          const varName = toCssVarName(roleKey, 'line-height');
          root.style.setProperty(varName, lineHeightValue);
          appliedRoleVars.push(varName);
        }
      });
    }
  }

  root.dataset.brandRoleVars = appliedRoleVars.join(',');

  return { brandId: definition.id, variant: resolvedVariant };
}

export async function loadBrandMasterTemplate(brandId, variantId) {
  if (typeof fetch === 'undefined') return null;
  const snapshot = getBrandSnapshot(brandId, variantId);
  const templatePath = snapshot?.masterTemplate;
  if (!templatePath) return null;
  const response = await fetch(templatePath, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch master template from "${templatePath}": ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export function emitBrandStateChanged(brandState = null) {
  if (typeof document === 'undefined') return;
  const detail = brandState
    ? { brand: { ...brandState } }
    : { brand: null };
  const customEventCtor =
    (typeof window !== 'undefined' && typeof window.CustomEvent === 'function')
      ? window.CustomEvent
      : (typeof CustomEvent === 'function' ? CustomEvent : null);

  let event;
  if (customEventCtor) {
    event = new customEventCtor('brandStateChanged', { detail });
  } else {
    event = new Event('brandStateChanged');
    event.detail = detail;
  }

  document.dispatchEvent(event);
}
