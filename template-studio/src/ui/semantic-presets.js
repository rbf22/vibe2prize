import { semanticVocabulary, getRoleMetadata } from '../../../core/layout/semantic-vocabulary.js';

export const PRESET_ROLE_MAP = {
  'header': { role: 'primary-title', name: 'header' },
  'footer': { role: 'reference', name: 'footer' },
  'left-sidebar': { role: 'supporting-data', name: 'left-sidebar' },
  'right-sidebar': { role: 'supporting-data', name: 'right-sidebar' },
  'hero': { role: 'visual-aid', name: 'hero' },
  'content': { role: 'supporting-text', name: 'content' },
  'caption': { role: 'context-info', name: 'caption' }
};

export const ROLE_OPTIONS = Object.keys(semanticVocabulary.roles);

export function applyRoleMetadataToBox(box, roleKey, options = {}) {
  if (!box || !roleKey) return null;
  const roleConfig = getRoleMetadata(roleKey);
  if (!roleConfig) {
    console.warn('[semantic-presets] Unknown role', roleKey);
    return null;
  }

  const overrides = options.overrides || {};
  const nextMetadata = {
    ...box.metadata,
    required: overrides.required ?? roleConfig.required,
    inputType: overrides.inputType || roleConfig.inputType || 'text',
    fieldTypes: overrides.fieldTypes || [...(roleConfig.fieldTypes || [roleKey])],
    llmHint: overrides.llmHint || roleConfig.llmHint || '',
    type: roleConfig.type,
    roleDescription: roleConfig.description,
    roleCharacteristics: roleConfig.characteristics,
    semanticLevel: roleConfig.level
  };

  box.metadata = nextMetadata;
  if (!options.preserveName && options.name) {
    box.name = options.name;
  }

  return nextMetadata;
}

export function getRoleForPreset(presetKey) {
  return PRESET_ROLE_MAP[presetKey] || null;
}
