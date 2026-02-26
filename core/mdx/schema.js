export function assert(condition, message) {
  if (!condition) {
    throw new Error(`MDX validation error: ${message}`);
  }
}

export function validateFrontmatter(frontmatter) {
  const errors = [];
  
  if (!frontmatter || typeof frontmatter !== 'object') {
    errors.push('frontmatter must be an object');
    return { valid: false, errors };
  }

  if (typeof frontmatter.title !== 'string' || !frontmatter.title.trim()) {
    errors.push('title is required and must be a non-empty string');
  }
  
  if (typeof frontmatter.phase !== 'string' || !frontmatter.phase.trim()) {
    errors.push('phase is required and must be a non-empty string');
  } else {
    const allowedPhases = ['concept', 'design', 'development', 'production', 'draft'];
    if (!allowedPhases.includes(frontmatter.phase.toLowerCase())) {
      errors.push(`phase must be one of: ${allowedPhases.join(', ')}`);
    }
  }
  
  if (typeof frontmatter.maxWords !== 'number' || !Number.isFinite(frontmatter.maxWords) || frontmatter.maxWords <= 0) {
    errors.push('maxWords must be a positive finite number');
  }

  const layout = frontmatter.layout;
  if (!layout || typeof layout !== 'object') {
    errors.push('layout must be provided and must be an object');
  } else {
    if (typeof layout.type !== 'string' || !layout.type.trim()) {
      errors.push('layout.type is required and must be a non-empty string');
    } else {
      const allowedTypes = ['grid', 'grid-designer'];
      if (!allowedTypes.includes(layout.type.toLowerCase())) {
        errors.push(`layout.type must be one of: ${allowedTypes.join(', ')}`);
      }
    }
    if (typeof layout.template !== 'string' || !layout.template.trim()) {
      errors.push('layout.template is required and must be a non-empty string');
    }
    if (!Array.isArray(layout.components)) {
      errors.push('layout.components must be an array');
    } else {
      layout.components.forEach((component, index) => {
        if (!component || typeof component !== 'object') {
          errors.push(`layout.components[${index}] must be an object`);
        } else {
          if (typeof component.type !== 'string' || !component.type.trim()) {
            errors.push(`layout.components[${index}] type is required and must be a non-empty string`);
          }
          if (typeof component.id !== 'string' || !component.id.trim()) {
            errors.push(`layout.components[${index}] id is required and must be a non-empty string`);
          }
          if (typeof component.role !== 'string' || !component.role.trim()) {
            errors.push(`layout.components[${index}] role is required and must be a non-empty string`);
          }
          if (typeof component.area !== 'string' || !component.area.trim()) {
            errors.push(`layout.components[${index}] area is required and must be a non-empty string`);
          }
          if ('maxWords' in component) {
            if (typeof component.maxWords !== 'number' || !Number.isFinite(component.maxWords) || component.maxWords <= 0) {
              errors.push(`layout.components[${index}] maxWords must be a positive finite number`);
            }
          }
        }
      });
    }
  }

  const regions = frontmatter.regions;
  if (!Array.isArray(regions) || regions.length === 0) {
    errors.push('regions must be a non-empty array');
  } else {
    regions.forEach((region, index) => {
      if (!region || typeof region !== 'object') {
        errors.push(`region[${index}] must be an object`);
      } else {
        if (typeof region.id !== 'string' || !region.id.trim()) {
          errors.push(`region[${index}] id is required and must be a non-empty string`);
        }
        if (typeof region.role !== 'string' || !region.role.trim()) {
          errors.push(`region[${index}] role is required and must be a non-empty string`);
        }
        if ('maxWords' in region) {
          if (typeof region.maxWords !== 'number' || !Number.isFinite(region.maxWords) || region.maxWords <= 0) {
            errors.push(`region[${index}] maxWords must be a positive finite number`);
          }
        }
      }
    });
  }

  // Check that layout components and regions have matching IDs
  if (layout && Array.isArray(layout.components) && Array.isArray(regions)) {
    const componentIds = new Set(layout.components.map(c => c.id).filter(Boolean));
    const regionIds = new Set(regions.map(r => r.id).filter(Boolean));
    
    for (const id of componentIds) {
      if (!regionIds.has(id)) {
        errors.push(`layout component id "${id}" has no matching region`);
      }
    }
    for (const id of regionIds) {
      if (!componentIds.has(id)) {
        errors.push(`region id "${id}" has no matching layout component`);
      }
    }
  }

  if ('tags' in frontmatter) {
    if (!Array.isArray(frontmatter.tags)) {
      errors.push('tags must be an array');
    } else {
      frontmatter.tags.forEach((tag, index) => {
        if (typeof tag !== 'string') {
          errors.push(`tags[${index}] must be a string`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
