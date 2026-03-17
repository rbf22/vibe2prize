// LLM Grid Placement Engine - Intelligent content placement with confidence scoring
// Provides LLM-driven content analysis and placement suggestions for grid layouts

import { gridTemplates, getTemplateSemanticAreas, validateContentPlacement } from '../layouts/grid-templates.js';
import { SemanticNormalizer } from '../layouts/semantic-vocabulary.js';

export class LLMGridPlacer {
  constructor(schema = null, normalizer = new SemanticNormalizer()) {
    this.schema = schema || this.generateDefaultSchema();
    this.normalizer = normalizer;
    this.placementRules = this.generatePlacementRules();
  }
  
  generateDefaultSchema() {
    const schema = {
      templateName: 'content-focused',
      version: '1.0',
      areas: {}
    };
    
    // Extract areas from all available templates
    Object.entries(gridTemplates).forEach(([templateName, template]) => {
      if (template.semanticAreas) {
        Object.entries(template.semanticAreas).forEach(([areaName, areaConfig]) => {
          schema.areas[`${templateName}-${areaName}`] = {
            ...areaConfig,
            template: templateName,
            area: areaName
          };
        });
      }
    });
    
    return schema;
  }
  
  generatePlacementRules() {
    return {
      // Priority-based placement
      priority: {
        critical: ['header', 'title', 'main'],
        high: ['sidebar', 'content', 'left', 'center'],
        medium: ['right', 'aside'],
        low: ['footer', 'reference']
      },
      
      // Content type preferences
      contentMapping: {
        'primary-title': { 
          primary: 'header', 
          fallback: 'title', 
          alternatives: ['left', 'main'] 
        },
        'secondary-title': { 
          primary: 'header', 
          fallback: 'title', 
          alternatives: ['left', 'main'] 
        },
        'paragraph': { 
          primary: 'main', 
          fallback: 'content', 
          alternatives: ['left', 'center'] 
        },
        'table': { 
          primary: 'main', 
          fallback: 'content', 
          alternatives: ['center', 'right'] 
        },
        'image': { 
          primary: 'aside', 
          fallback: 'right', 
          alternatives: ['main', 'content'] 
        },
        'checklist': { 
          primary: 'sidebar', 
          fallback: 'left', 
          alternatives: ['main', 'content'] 
        },
        'metadata': { 
          primary: 'sidebar', 
          fallback: 'footer', 
          alternatives: ['left', 'reference'] 
        },
        'quote': { 
          primary: 'aside', 
          fallback: 'right', 
          alternatives: ['main', 'content'] 
        },
        'footnote': { 
          primary: 'footer', 
          fallback: 'reference', 
          alternatives: ['sidebar'] 
        }
      },
      
      // Capacity constraints
      capacity: {
        header: { maxItems: 3, maxLength: 200 },
        title: { maxItems: 2, maxLength: 150 },
        main: { maxItems: 8, maxLength: 2000 },
        content: { maxItems: 10, maxLength: 2500 },
        sidebar: { maxItems: 5, maxLength: 800 },
        left: { maxItems: 4, maxLength: 1000 },
        center: { maxItems: 6, maxLength: 1500 },
        right: { maxItems: 4, maxLength: 1000 },
        aside: { maxItems: 3, maxLength: 400 },
        footer: { maxItems: 4, maxLength: 300 },
        reference: { maxItems: 6, maxLength: 500 }
      }
    };
  }
  
  // LLM-friendly placement function
  suggestPlacement(content, templateName = null) {
    const suggestions = [];
    
    // Normalize content
    const normalizedContent = content.map(element => this.normalizer.normalizeElement(element));
    
    // Determine template if not specified
    const targetTemplate = templateName || this.recommendTemplate(normalizedContent);
    
    // Get template semantic areas
    const semanticAreas = getTemplateSemanticAreas(targetTemplate);
    if (!semanticAreas) {
      throw new Error(`No semantic areas found for template '${targetTemplate}'`);
    }
    
    // Generate suggestions for each element
    normalizedContent.forEach(element => {
      const suggestion = this.generatePlacementSuggestion(element, semanticAreas, targetTemplate);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    });
    
    // Resolve conflicts and optimize placement
    const optimizedSuggestions = this.resolveConflicts(suggestions, semanticAreas);
    
    return {
      template: targetTemplate,
      suggestions: optimizedSuggestions,
      confidence: this.calculateOverallConfidence(optimizedSuggestions),
      warnings: this.generatePlacementWarnings(optimizedSuggestions, semanticAreas),
      summary: this.generatePlacementSummary(optimizedSuggestions)
    };
  }
  
  generatePlacementSuggestion(element, semanticAreas, templateName) {
    const mapping = this.placementRules.contentMapping[element.semantic];
    if (!mapping) {
      return {
        elementId: element.id,
        type: element.semantic,
        content: element.content,
        suggestedArea: 'main',
        confidence: 0.5,
        reasoning: `No specific mapping for '${element.semantic}', using default 'main' area`,
        alternatives: ['content', 'center'],
        importance: element.importance
      };
    }
    
    // Try primary area first
    let targetArea = this.findBestArea(mapping.primary, semanticAreas, element);
    let confidence = 0.9;
    let reasoning = `Primary mapping for '${element.semantic}' to '${mapping.primary}'`;
    
    // If primary not available, try fallback
    if (!targetArea) {
      targetArea = this.findBestArea(mapping.fallback, semanticAreas, element);
      confidence = 0.8;
      reasoning = `Fallback mapping for '${element.semantic}' to '${mapping.fallback}'`;
    }
    
    // If fallback not available, try alternatives
    if (!targetArea && mapping.alternatives) {
      for (const alt of mapping.alternatives) {
        targetArea = this.findBestArea(alt, semanticAreas, element);
        if (targetArea) {
          confidence = 0.7;
          reasoning = `Alternative mapping for '${element.semantic}' to '${alt}'`;
          break;
        }
      }
    }
    
    // If still no area, use first available
    if (!targetArea) {
      const availableAreas = Object.keys(semanticAreas);
      targetArea = availableAreas[0];
      confidence = 0.4;
      reasoning = `No suitable mapping found, using first available area '${targetArea}'`;
    }
    
    // Adjust confidence based on element characteristics
    confidence = this.adjustConfidence(element, targetArea, semanticAreas[targetArea], confidence);
    
    return {
      elementId: element.id,
      type: element.semantic,
      content: element.content,
      suggestedArea: targetArea,
      confidence,
      reasoning,
      alternatives: mapping.alternatives || [],
      importance: element.importance,
      metadata: element.metadata
    };
  }
  
  findBestArea(areaName, semanticAreas, element) {
    // Find areas that match the requested area name
    const matchingAreas = Object.entries(semanticAreas).filter(([area, config]) => {
      return area.includes(areaName) && config.accepts.includes(element.semantic);
    });
    
    if (matchingAreas.length === 0) return null;
    
    // Sort by priority and return the best
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    matchingAreas.sort(([, a], [, b]) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    return matchingAreas[0][0];
  }
  
  adjustConfidence(element, targetArea, areaConfig, baseConfidence) {
    let confidence = baseConfidence;
    
    // Boost confidence for perfect semantic matches
    if (areaConfig.accepts.includes(element.semantic)) {
      confidence += 0.1;
    }
    
    // Adjust based on importance vs area priority
    const importanceOrder = { 'critical': 4, 'important': 3, 'supporting': 2, 'supplementary': 1 };
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    const elementImportance = importanceOrder[element.importance];
    const areaPriority = priorityOrder[areaConfig.priority];
    
    if (elementImportance >= areaPriority) {
      confidence += 0.1;
    } else {
      confidence -= 0.1;
    }
    
    // Adjust based on content characteristics
    if (element.metadata.hasVisualElements && targetArea.includes('aside')) {
      confidence += 0.1;
    }
    
    if (element.metadata.hasNumericalData && (targetArea.includes('main') || targetArea.includes('content'))) {
      confidence += 0.1;
    }
    
    // Adjust based on content length vs area capacity
    if (element.metadata.contentLength > 500 && targetArea.includes('footer')) {
      confidence -= 0.2;
    }
    
    return Math.min(1.0, Math.max(0.1, confidence));
  }
  
  resolveConflicts(suggestions, semanticAreas) {
    const resolvedSuggestions = [...suggestions];
    const areaUsage = {};
    
    // Sort by importance and confidence
    resolvedSuggestions.sort((a, b) => {
      const importanceOrder = { 'critical': 4, 'important': 3, 'supporting': 2, 'supplementary': 1 };
      
      if (importanceOrder[b.importance] !== importanceOrder[a.importance]) {
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      }
      
      return b.confidence - a.confidence;
    });
    
    // Resolve conflicts by reassigning lower-priority items
    resolvedSuggestions.forEach((suggestion, index) => {
      const area = suggestion.suggestedArea;
      const areaConfig = semanticAreas[area];
      
      if (!areaUsage[area]) {
        areaUsage[area] = {
          count: 0,
          maxCapacity: areaConfig?.maxContent || 5
        };
      }
      
      // Check capacity
      const maxCapacity = areaConfig?.maxContent || 5;
      if (areaUsage[area].count >= maxCapacity) {
        // Find alternative area
        const alternativeArea = this.findAlternativeArea(suggestion, semanticAreas, areaUsage);
        if (alternativeArea) {
          suggestion.suggestedArea = alternativeArea;
          suggestion.confidence *= 0.8;
          suggestion.reasoning += ` (capacity exceeded, moved to ${alternativeArea})`;
        } else {
          suggestion.confidence *= 0.6;
          suggestion.reasoning += ` (capacity exceeded, no alternative available)`;
        }
      }
      
      areaUsage[area].count++;
    });
    
    return resolvedSuggestions;
  }
  
  findAlternativeArea(suggestion, semanticAreas, areaUsage) {
    const alternatives = suggestion.alternatives || [];
    
    // Try alternatives first
    for (const alt of alternatives) {
      const matchingArea = this.findBestArea(alt, semanticAreas, suggestion);
      if (matchingArea && (!areaUsage[matchingArea] || areaUsage[matchingArea].count < semanticAreas[matchingArea].maxCapacity)) {
        return matchingArea;
      }
    }
    
    // Find any area that accepts this content type
    for (const [areaName, areaConfig] of Object.entries(semanticAreas)) {
      if (areaConfig.accepts.includes(suggestion.type) && 
          (!areaUsage[areaName] || areaUsage[areaName].count < areaConfig.maxCapacity)) {
        return areaName;
      }
    }
    
    return null;
  }
  
  calculateOverallConfidence(suggestions) {
    if (suggestions.length === 0) return 0;
    
    const totalConfidence = suggestions.reduce((sum, suggestion) => sum + suggestion.confidence, 0);
    return (totalConfidence / suggestions.length).toFixed(3);
  }
  
  generatePlacementWarnings(suggestions, semanticAreas) {
    const warnings = [];
    
    // Check for low confidence placements
    suggestions.filter(s => s.confidence < 0.7).forEach(suggestion => {
      warnings.push({
        type: 'low-confidence',
        severity: 'medium',
        message: `Low confidence (${suggestion.confidence.toFixed(2)}) for ${suggestion.elementId} in ${suggestion.suggestedArea}`,
        elementId: suggestion.elementId,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning
      });
    });
    
    // Check for area capacity issues
    const areaCounts = {};
    suggestions.forEach(suggestion => {
      areaCounts[suggestion.suggestedArea] = (areaCounts[suggestion.suggestedArea] || 0) + 1;
    });
    
    Object.entries(areaCounts).forEach(([area, count]) => {
      const maxCapacity = semanticAreas[area]?.maxCapacity || 5;
      if (count > maxCapacity) {
        warnings.push({
          type: 'capacity-exceeded',
          severity: 'high',
          message: `Area ${area} exceeds capacity (${count}/${maxCapacity})`,
          area,
          actualCount: count,
          maxCapacity
        });
      }
    });
    
    return warnings;
  }
  
  generatePlacementSummary(suggestions) {
    const importanceCounts = {
      critical: 0,
      important: 0,
      supporting: 0,
      supplementary: 0
    };
    
    const areaCounts = {};
    let totalConfidence = 0;
    
    suggestions.forEach(suggestion => {
      importanceCounts[suggestion.importance]++;
      areaCounts[suggestion.suggestedArea] = (areaCounts[suggestion.suggestedArea] || 0) + 1;
      totalConfidence += suggestion.confidence;
    });
    
    return {
      totalElements: suggestions.length,
      averageConfidence: (totalConfidence / suggestions.length).toFixed(3),
      importanceDistribution: importanceCounts,
      areaDistribution: areaCounts,
      recommendations: this.generateRecommendations(suggestions)
    };
  }
  
  generateRecommendations(suggestions) {
    const recommendations = [];
    
    const lowConfidenceCount = suggestions.filter(s => s.confidence < 0.7).length;
    if (lowConfidenceCount > 0) {
      recommendations.push(`Review ${lowConfidenceCount} low-confidence placements`);
    }
    
    const criticalElements = suggestions.filter(s => s.importance === 'critical');
    const lowConfidenceCritical = criticalElements.filter(s => s.confidence < 0.8);
    if (lowConfidenceCritical.length > 0) {
      recommendations.push(`Priority review: ${lowConfidenceCritical.length} critical elements with low confidence`);
    }
    
    return recommendations;
  }
  
  recommendTemplate(normalizedContent) {
    // Analyze content to recommend best template
    const contentTypes = normalizedContent.map(el => el.semantic);
    const hasTitle = contentTypes.includes('primary-title');
    const hasCriteria = contentTypes.includes('criteria-list');
    const hasVisuals = normalizedContent.some(el => el.metadata.hasVisualElements);
    const hasData = normalizedContent.some(el => el.metadata.hasNumericalData);
    
    // Simple heuristic-based template recommendation
    if (hasCriteria && hasData) {
      return 'criteria-matrix';
    }
    
    if (hasVisuals && hasData) {
      return 'dual-panel';
    }
    
    if (hasTitle && normalizedContent.length > 5) {
      return 'presentation-grid';
    }
    
    return 'dual-panel'; // Default
  }
  
  // LLM prompt generation
  generateLLMPrompt(content, templateName = null) {
    const targetTemplate = templateName || this.recommendTemplate(content);
    const semanticAreas = getTemplateSemanticAreas(targetTemplate);
    
    return `
You are a slide layout expert for professional presentations.

TASK: Analyze the slide content and suggest optimal grid placement.

TEMPLATE: ${targetTemplate}

AVAILABLE_AREAS:
${JSON.stringify(semanticAreas, null, 2)}

CONTENT_TO_ANALYZE:
${JSON.stringify(content, null, 2)}

PLACEMENT_RULES:
1. Match content semantic roles to compatible areas
2. Respect area capacity constraints
3. Maintain visual hierarchy (critical > important > supporting > supplementary)
4. Consider content characteristics (visual elements, numerical data)
5. Provide confidence scores (0.0-1.0) and clear reasoning

RESPONSE_FORMAT:
{
  "placements": [
    {
      "elementId": "string",
      "suggestedArea": "string",
      "confidence": 0.95,
      "reasoning": "string",
      "alternatives": ["string"]
    }
  ],
  "overallStrategy": "string",
  "warnings": []
}
`;
  }
}

export default LLMGridPlacer;
