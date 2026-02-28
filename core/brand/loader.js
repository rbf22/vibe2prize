const isNodeRuntime = typeof process !== 'undefined' && !!process.versions?.node;
const isBrowser = !isNodeRuntime && typeof window !== 'undefined' && typeof document !== 'undefined';

let pathModule = null;
let fsExtraModule = null;
let ajvInstance = null;
let validateBrandDefinition = null;

if (!isBrowser) {
  const [pathImport, fsImport, ajvImport] = await Promise.all([
    import('node:path'),
    import('fs-extra'),
    import('ajv')
  ]);
  pathModule = pathImport.default || pathImport;
  fsExtraModule = fsImport.default || fsImport;
  const AjvCtor = ajvImport.default || ajvImport;
  ajvInstance = new AjvCtor({ allErrors: true, allowUnionTypes: true });
} else {
  pathModule = {
    resolve: () => '/',
    join: (...parts) => parts
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/')
  };
}

const ROOT = isBrowser ? '/' : pathModule.resolve(process.cwd());
const TEMPLATES_DIR = isBrowser ? '/templates' : pathModule.join(ROOT, 'templates');
const BRAND_INDEX_PATH = isBrowser ? '/templates/brands.json' : pathModule.join(TEMPLATES_DIR, 'brands.json');
const BRAND_SCHEMA_PATH = isBrowser ? '/core/brand/brand-schema.json' : pathModule.join(ROOT, 'core', 'brand', 'brand-schema.json');

/** @type {Array<{id: string, label: string, version: number|null}>} */
let brandIndex = [];
/** @type {Map<string, any>} */
const brandDefinitions = new Map();

async function readJson(filePath) {
  if (isBrowser) {
    const response = await fetch(filePath, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
  return fsExtraModule.readJson(filePath);
}

function mergeAssets(baseAssets = {}, variantAssets = {}) {
  return {
    ...baseAssets,
    logo: {
      ...(baseAssets.logo || {}),
      ...(variantAssets.logo || {})
    },
    ...variantAssets
  };
}

function mergeCopy(baseCopy = {}, variantCopy = {}) {
  return {
    ...baseCopy,
    ...variantCopy
  };
}

function mergeTokens(baseTokens = {}, variantTokens = {}) {
  return {
    palette: {
      ...(baseTokens.palette || {}),
      ...(variantTokens.palette || {})
    },
    cssVars: {
      ...(baseTokens.cssVars || {}),
      ...(variantTokens.cssVars || {})
    }
  };
}

function normalizeVariant(definition, variantId) {
  const variants = definition.variants || {};
  if (variantId && variants[variantId]) {
    return variantId;
  }
  return definition.defaultTheme || Object.keys(variants)[0];
}

function composeSnapshot(definition, variantKey) {
  const variantConfig = (definition.variants && definition.variants[variantKey]) || {};
  return {
    id: definition.id,
    label: definition.label,
    version: definition.version,
    theme: variantKey,
    masterTemplate: definition.masterTemplate,
    typography: { ...definition.typography },
    assets: mergeAssets(definition.assets, variantConfig.assets),
    copy: mergeCopy(definition.copy, variantConfig.copy),
    tokens: mergeTokens(definition.tokens, variantConfig.tokens),
    editorialThemes: definition.editorialThemes || null
  };
}

async function initialize() {
  if (ajvInstance) {
    const schema = await readJson(BRAND_SCHEMA_PATH);
    validateBrandDefinition = ajvInstance.compile(schema);
  }

  const indexData = await readJson(BRAND_INDEX_PATH);
  if (!indexData || !Array.isArray(indexData.brands)) {
    throw new Error('templates/brands.json must export an object with a "brands" array');
  }

  brandIndex = indexData.brands.map((entry) => ({
    id: entry.id,
    label: entry.label || entry.id,
    version: typeof entry.version === 'number' ? entry.version : null
  }));

  await Promise.all(
    brandIndex.map(async ({ id, version }) => {
      const brandPath = isBrowser
        ? `${TEMPLATES_DIR}/${id}/brand.json`
        : pathModule.join(TEMPLATES_DIR, id, 'brand.json');
      const definition = await readJson(brandPath);
      if (validateBrandDefinition && !validateBrandDefinition(definition)) {
        const errors = validateBrandDefinition.errors || [];
        const formatted = errors.map((err) => `${err.instancePath || '(root)'} ${err.message}`).join(', ');
        throw new Error(`Invalid brand definition for "${id}": ${formatted}`);
      }
      if (typeof version === 'number' && definition.version !== version) {
        throw new Error(`Version mismatch for brand "${id}": index declares ${version}, definition has ${definition.version}`);
      }
      brandDefinitions.set(id, definition);
    })
  );
}

await initialize();

export function listBrandOptions() {
  return brandIndex.map(({ id, label }) => ({ id, label }));
}

export function listBrandThemeOptions(brandId) {
  const definition = brandDefinitions.get(brandId);
  if (!definition) {
    throw new Error(`Brand "${brandId}" is not registered in templates/brands.json`);
  }
  return Object.entries(definition.variants || {}).map(([id, variant]) => ({
    id,
    label: variant.label || id
  }));
}

export function getBrandDefinition(brandId = 'default') {
  const definition = brandDefinitions.get(brandId);
  if (!definition) {
    throw new Error(`Brand "${brandId}" is not registered in templates/brands.json`);
  }
  return definition;
}

export function getBrandSnapshot(brandId = 'default', variantId) {
  const definition = getBrandDefinition(brandId);
  const variantKey = normalizeVariant(definition, variantId);
  return composeSnapshot(definition, variantKey);
}

export function getBrandIndex() {
  return brandIndex;
}
