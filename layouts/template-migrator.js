// Template Migration System - Cross-template content migration with semantic mapping
// Enables seamless content movement between different grid layouts while preserving semantic meaning

import { gridTemplates, templateMappingRegistry } from './grid-templates.js';
import { SemanticNormalizer } from './semantic-vocabulary.js';

export class TemplateMigrator {
  constructor(mappingRegistry = templateMappingRegistry, normalizer = new SemanticNormalizer()) {
    this.mappingRegistry = mappingRegistry;
    this.normalizer = normalizer;
  }
  
  // Migrate content from one template to another
  migrateTemplate(fromTemplate, toTemplate, elements) {
    const fromMapping = this.mappingRegistry[fromTemplate];
    const toMapping = this.mappingRegistry[toTemplate];
    
    if (!fromMapping) {
      throw new Error(`No mapping found for source template '${fromTemplate}'`);
    }
    
    if (!toMapping) {
      throw new Error(`No mapping found for target template '${toTemplate}'`);
    }
    
    const migrationPlan = this.createMigrationPlan(fromTemplate, toTemplate, elements);
    const migratedElements = this.executeMigration(migrationPlan);
    
    return {
      success: true,
      migratedElements,
      migrationPlan,
      warnings: this.generateMigrationWarnings(migrationPlan),
      summary: this.generateMigrationSummary(migrationPlan)
    };
  }
  
  createMigrationPlan(fromTemplate, toTemplate, elements) {
    const fromMapping = this.mappingRegistry[fromTemplate];
    const toMapping = this.mappingRegistry[toTemplate];
    
    const plan = {
      fromTemplate,
      toTemplate,
      elements: [],
      conflicts: [],
      orphaned: [],
      statistics: {
        totalElements: elements.length,
        mappedElements: 0,
        orphanedElements: 0,
        conflicts: 0
      }
    };
    
    // Normalize all elements
    const normalizedElements = elements.map(el => this.normalizer.normalizeElement(el));
    
    // Map each element to new template
    normalizedElements.forEach(element => {
      const semantic = element.semantic;
      const fromPlacement = fromMapping[semantic];
      const toPlacement = toMapping[semantic];
      
      if (toPlacement) {
        const migrationItem = {
          element,
          fromArea: fromPlacement?.targetArea || 'unknown',
          toArea: toPlacement.targetArea,
          fromPriority: fromPlacement?.priority || 999,
          toPriority: toPlacement.priority,
          confidence: this.calculateMigrationConfidence(element, fromPlacement, toPlacement),
          reasoning: this.generateMigrationReasoning(element, fromPlacement, toPlacement)
        };
        
        plan.elements.push(migrationItem);
        plan.statistics.mappedElements++;
      } else {
        plan.orphaned.push({
          element,
          reason: `No mapping for semantic role '${semantic}' in template '${toTemplate}'`,
          suggestedFallback: this.findFallbackArea(semantic, toMapping)
        });
        plan.statistics.orphanedElements++;
      }
    });
    
    // Check for conflicts (multiple elements targeting same area with same priority)
    const areaConflicts = this.detectAreaConflicts(plan.elements);
    plan.conflicts = areaConflicts;
    plan.statistics.conflicts = areaConflicts.length;
    
    return plan;
  }
  
  executeMigration(migrationPlan) {
    const migratedElements = [];
    
    // Sort by priority and confidence
    const sortedElements = migrationPlan.elements.sort((a, b) => {
      // First sort by priority (lower number = higher priority)
      if (a.toPriority !== b.toPriority) {
        return a.toPriority - b.toPriority;
      }
      // Then by confidence (higher = better)
      return b.confidence - a.confidence;
    });
    
    // Apply placements with conflict resolution
    const areaUsage = {};
    
    sortedElements.forEach(item => {
      const areaKey = item.toArea;
      
      // Initialize area usage tracking
      if (!areaUsage[areaKey]) {
        areaUsage[areaKey] = {
          count: 0,
          maxCapacity: this.getAreaCapacity(migrationPlan.toTemplate, areaKey)
        };
      }
      
      // Check capacity
      if (areaUsage[areaKey].count >= areaUsage[areaKey].maxCapacity) {
        // Find alternative area
        const fallbackArea = this.findAlternativeArea(item, migrationPlan.elements, areaUsage);
        if (fallbackArea) {
          item.toArea = fallbackArea;
          item.confidence *= 0.8; // Reduce confidence for fallback placement
          item.reasoning += ` (capacity exceeded, moved to ${fallbackArea})`;
        }
      }
      
      const migratedElement = {
        ...item.element,
        targetArea: item.toArea,
        placementConfidence: item.confidence,
        migrationPath: `${item.fromArea} → ${item.toArea}`,
        placementPriority: item.toPriority,
        reasoning: item.reasoning
      };
      
      migratedElements.push(migratedElement);
      areaUsage[areaKey].count++;
    });
    
    return migratedElements;
  }
  
  calculateMigrationConfidence(element, fromPlacement, toPlacement) {
    let confidence = 0.8; // baseline confidence
    
    // Boost confidence for direct semantic matches
    if (fromPlacement && toPlacement && fromPlacement.targetArea === toPlacement.targetArea) {
      confidence += 0.2;
    }
    
    // Adjust based on importance level
    if (element.importance === 'critical') confidence += 0.1;
    if (element.importance === 'supplementary') confidence -= 0.1;
    
    // Adjust based on semantic role clarity
    if (element.semantic === 'primary-title' || element.semantic === 'secondary-title') {
      confidence += 0.1;
    }
    
    // Adjust based on content characteristics
    if (element.metadata.hasVisualElements && toPlacement.targetArea.includes('aside')) {
      confidence += 0.1;
    }
    
    if (element.metadata.hasNumericalData && toPlacement.targetArea.includes('main')) {
      confidence += 0.1;
    }
    
    return Math.min(1.0, Math.max(0.1, confidence));
  }
  
  generateMigrationReasoning(element, fromPlacement, toPlacement) {
    let reasoning = `Semantic role '${element.semantic}' mapped from ${fromPlacement?.targetArea || 'unknown'} to ${toPlacement.targetArea}`;
    
    if (element.importance === 'critical') {
      reasoning += ' (critical importance)';
    }
    
    if (fromPlacement?.targetArea === toPlacement.targetArea) {
      reasoning += ' (area preserved)';
    }
    
    return reasoning;
  }
  
  detectAreaConflicts(elements) {
    const areaUsage = {};
    const conflicts = [];
    
    elements.forEach(item => {
      const areaKey = `${item.toArea}-${item.toPriority}`;
      if (!areaUsage[areaKey]) {
        areaUsage[areaKey] = [];
      }
      areaUsage[areaKey].push(item);
    });
    
    Object.entries(areaUsage).forEach(([areaKey, items]) => {
      if (items.length > 1) {
        const [area, priority] = areaKey.split('-');
        conflicts.push({
          area,
          priority: parseInt(priority),
          conflictingItems: items,
          resolution: this.suggestConflictResolution(items)
        });
      }
    });
    
    return conflicts;
  }
  
  suggestConflictResolution(conflictingItems) {
    const suggestions = [];
    
    // Sort by confidence and importance
    const sortedItems = conflictingItems.sort((a, b) => {
      if (b.element.importance !== a.element.importance) {
        const importanceOrder = { 'critical': 4, 'important': 3, 'supporting': 2, 'supplementary': 1 };
        return importanceOrder[b.element.importance] - importanceOrder[a.element.importance];
      }
      return b.confidence - a.confidence;
    });
    
    // Keep the highest priority/confidence items
    const keepCount = Math.max(1, Math.floor(sortedItems.length / 2));
    const keepItems = sortedItems.slice(0, keepCount);
    const moveItems = sortedItems.slice(keepCount);
    
    suggestions.push({
      type: 'priority-based',
      description: `Keep top ${keepCount} items by importance/confidence`,
      keepItems: keepItems.map(item => item.element.id),
      moveItems: moveItems.map(item => item.element.id)
    });
    
    return suggestions;
  }
  
  findFallbackArea(semanticRole, toMapping) {
    // Find the best fallback area based on semantic compatibility
    const targetTemplate = gridTemplates[toMapping];
    if (!targetTemplate || !targetTemplate.semanticAreas) {
      return null;
    }
    
    const compatibleAreas = Object.entries(targetTemplate.semanticAreas)
      .filter(([area, config]) => config.accepts.includes(semanticRole))
      .sort(([, a], [, b]) => {
        // Sort by priority (critical > high > medium > low)
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    
    return compatibleAreas.length > 0 ? compatibleAreas[0][0] : null;
  }
  
  findAlternativeArea(item, allElements, areaUsage) {
    const targetTemplate = gridTemplates[item.toArea.split('-')[0]];
    if (!targetTemplate || !targetTemplate.semanticAreas) {
      return null;
    }
    
    // Find areas that accept this element type and have capacity
    const alternativeAreas = Object.entries(targetTemplate.semanticAreas)
      .filter(([area, config]) => {
        return config.accepts.includes(item.element.semantic) &&
               (!areaUsage[area] || areaUsage[area].count < areaUsage[area].maxCapacity);
      })
      .sort(([, a], [, b]) => {
        // Sort by priority
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    
    return alternativeAreas.length > 0 ? alternativeAreas[0][0] : null;
  }
  
  getAreaCapacity(templateName, areaName) {
    const template = gridTemplates[templateName];
    if (!template || !template.semanticAreas || !template.semanticAreas[areaName]) {
      return 5; // Default capacity
    }
    
    return template.semanticAreas[areaName].maxContent;
  }
  
  generateMigrationWarnings(migrationPlan) {
    const warnings = [];
    
    // Warn about orphaned elements
    migrationPlan.orphaned.forEach(orphan => {
      warnings.push({
        type: 'orphaned-element',
        severity: 'high',
        message: `Element "${orphan.element.id}" has no mapping: ${orphan.reason}`,
        elementId: orphan.element.id,
        suggestion: orphan.suggestedFallback
      });
    });
    
    // Warn about conflicts
    migrationPlan.conflicts.forEach(conflict => {
      warnings.push({
        type: 'area-conflict',
        severity: 'medium',
        message: `Conflict in area "${conflict.area}" with priority ${conflict.priority}: ${conflict.conflictingItems.length} elements competing`,
        area: conflict.area,
        priority: conflict.priority,
        resolution: conflict.resolution
      });
    });
    
    // Warn about low confidence placements
    migrationPlan.elements.filter(item => item.confidence < 0.7).forEach(item => {
      warnings.push({
        type: 'low-confidence',
        severity: 'low',
        message: `Low confidence (${item.confidence.toFixed(2)}) for ${item.element.id} in ${item.toArea}`,
        elementId: item.element.id,
        confidence: item.confidence,
        reasoning: item.reasoning
      });
    });
    
    return warnings;
  }
  
  generateMigrationSummary(migrationPlan) {
    return {
      templateChange: `${migrationPlan.fromTemplate} → ${migrationPlan.toTemplate}`,
      successRate: (migrationPlan.statistics.mappedElements / migrationPlan.statistics.totalElements * 100).toFixed(1),
      averageConfidence: this.calculateAverageConfidence(migrationPlan.elements),
      conflictCount: migrationPlan.statistics.conflicts,
      orphanedCount: migrationPlan.statistics.orphanedElements,
      recommendations: this.generateRecommendations(migrationPlan)
    };
  }
  
  calculateAverageConfidence(elements) {
    if (elements.length === 0) return 0;
    const totalConfidence = elements.reduce((sum, item) => sum + item.confidence, 0);
    return (totalConfidence / elements.length).toFixed(3);
  }
  
  generateRecommendations(migrationPlan) {
    const recommendations = [];
    
    if (migrationPlan.statistics.orphanedElements > 0) {
      recommendations.push('Consider manually reviewing orphaned elements for placement');
    }
    
    if (migrationPlan.statistics.conflicts > 0) {
      recommendations.push('Resolve area conflicts to optimize layout');
    }
    
    const avgConfidence = this.calculateAverageConfidence(migrationPlan.elements);
    if (avgConfidence < 0.8) {
      recommendations.push('Review low-confidence placements and consider manual adjustment');
    }
    
    return recommendations;
  }
  
  // Validate migration compatibility between templates
  validateMigrationCompatibility(fromTemplate, toTemplate) {
    const fromMapping = this.mappingRegistry[fromTemplate];
    const toMapping = this.mappingRegistry[toTemplate];
    
    if (!fromMapping || !toMapping) {
      return {
        compatible: false,
        reason: 'One or both templates not found in mapping registry'
      };
    }
    
    const fromRoles = Object.keys(fromMapping);
    const toRoles = Object.keys(toMapping);
    
    const commonRoles = fromRoles.filter(role => toRoles.includes(role));
    const orphanedRoles = fromRoles.filter(role => !toRoles.includes(role));
    
    return {
      compatible: commonRoles.length > 0,
      compatibilityScore: commonRoles.length / fromRoles.length,
      commonRoles,
      orphanedRoles,
      recommendation: orphanedRoles.length === 0 ? 
        'Templates are fully compatible' : 
        `Manual review needed for ${orphanedRoles.length} semantic roles`
    };
  }
}

export default TemplateMigrator;
