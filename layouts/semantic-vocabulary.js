// Semantic Vocabulary System - Controlled vocabulary for EPAM slide content
// Provides consistent classification and mapping of content elements across templates

export const semanticVocabulary = {
  // Content roles (what the element DOES)
  roles: {
    'primary-title': { 
      synonyms: ['main-title', 'headline', 'heading', 'title'], 
      level: 1,
      description: 'Main heading of the slide, most important text element',
      characteristics: ['short', 'impactful', 'top-level']
    },
    'secondary-title': { 
      synonyms: ['subtitle', 'subheading', 'tagline', 'description'], 
      level: 2,
      description: 'Secondary heading that provides context or elaboration',
      characteristics: ['descriptive', 'supporting', 'contextual']
    },
    'supporting-text': { 
      synonyms: ['paragraph', 'description', 'explanation', 'content'], 
      level: 3,
      description: 'Main body text providing detailed information',
      characteristics: ['detailed', 'explanatory', 'comprehensive']
    },
    'key-data': { 
      synonyms: ['metrics', 'statistics', 'numbers', 'kpi'], 
      level: 2,
      description: 'Important numerical data or metrics',
      characteristics: ['quantitative', 'measurable', 'critical']
    },
    'supporting-data': { 
      synonyms: ['details', 'specifications', 'parameters', 'attributes'], 
      level: 3,
      description: 'Additional data that supports main content',
      characteristics: ['supplementary', 'technical', 'specific']
    },
    'visual-aid': { 
      synonyms: ['image', 'chart', 'diagram', 'graphic', 'illustration'], 
      level: 2,
      description: 'Visual elements that support or explain content',
      characteristics: ['visual', 'explanatory', 'supplementary']
    },
    'criteria-list': { 
      synonyms: ['checklist', 'requirements', 'conditions', 'standards'], 
      level: 2,
      description: 'List of criteria, requirements, or conditions',
      characteristics: ['structured', 'evaluative', 'specific']
    },
    'context-info': { 
      synonyms: ['metadata', 'background', 'context', 'methodology'], 
      level: 3,
      description: 'Background information providing context',
      characteristics: ['contextual', 'supporting', 'informational']
    },
    'reference': { 
      synonyms: ['footnote', 'source', 'citation', 'attribution'], 
      level: 4,
      description: 'Reference information and sources',
      characteristics: ['citational', 'supporting', 'optional']
    }
  },
  
  // Content types (what the element IS)
  types: {
    'textual': { 
      variants: ['heading', 'paragraph', 'list', 'quote', 'label'],
      description: 'Text-based content elements'
    },
    'tabular': { 
      variants: ['table', 'matrix', 'comparison', 'spreadsheet'],
      description: 'Structured data in table format'
    },
    'visual': { 
      variants: ['image', 'chart', 'diagram', 'icon', 'graph'],
      description: 'Visual content elements'
    },
    'structural': { 
      variants: ['divider', 'spacer', 'container', 'section'],
      description: 'Layout and structural elements'
    }
  },
  
  // Importance levels (for hierarchy)
  importance: {
    'critical': { 
      weight: 1.0, 
      visibility: 'always',
      description: 'Essential content that must be visible'
    },
    'important': { 
      weight: 0.8, 
      visibility: 'prominent',
      description: 'Important content that should be highlighted'
    },
    'supporting': { 
      weight: 0.6, 
      visibility: 'standard',
      description: 'Supporting content with standard visibility'
    },
    'supplementary': { 
      weight: 0.4, 
      visibility: 'optional',
      description: 'Optional content that can be hidden if needed'
    }
  },

  // EPAM-specific content categories
  epamCategories: {
    'executive-summary': {
      description: 'High-level overview and recommendations',
      typicalRoles: ['primary-title', 'secondary-title', 'supporting-text', 'key-data']
    },
    'technical-assessment': {
      description: 'Technical analysis and evaluation',
      typicalRoles: ['primary-title', 'criteria-list', 'supporting-data', 'visual-aid']
    },
    'process-workflow': {
      description: 'Process steps and workflow information',
      typicalRoles: ['primary-title', 'criteria-list', 'context-info', 'visual-aid']
    },
    'metrics-dashboard': {
      description: 'Performance metrics and KPIs',
      typicalRoles: ['primary-title', 'key-data', 'supporting-data', 'visual-aid']
    }
  }
};

// Semantic Element Normalizer
export class SemanticNormalizer {
  constructor(vocabulary = semanticVocabulary) {
    this.vocabulary = vocabulary;
  }
  
  // Normalize user input to controlled vocabulary
  normalizeElement(element) {
    const normalized = {
      id: element.id || this.generateId(),
      originalType: element.type || 'unknown',
      content: element.content || '',
      semantic: this.determineSemanticRole(element),
      importance: this.assessImportance(element),
      relationships: this.identifyRelationships(element),
      epamCategory: this.determineEPAMCategory(element),
      metadata: {
        contentLength: element.content ? element.content.toString().length : 0,
        wordCount: element.content ? element.content.toString().split(/\s+/).length : 0,
        hasVisualElements: this.containsVisualElements(element),
        hasNumericalData: this.containsNumericalData(element)
      }
    };
    
    return normalized;
  }
  
  determineSemanticRole(element) {
    const content = (element.content || '').toString().toLowerCase();
    const type = (element.type || '').toString().toLowerCase();
    
    // Rule-based semantic detection
    if (this.isMainHeading(content, type)) {
      return 'primary-title';
    }
    
    if (this.isSecondaryHeading(content, type)) {
      return 'secondary-title';
    }
    
    if (this.isTabularData(content, type)) {
      if (this.containsKeyMetrics(content)) {
        return 'key-data';
      }
      return 'supporting-data';
    }
    
    if (this.isVisualContent(content, type)) {
      return 'visual-aid';
    }
    
    if (this.isCriteriaList(content, type)) {
      return 'criteria-list';
    }
    
    if (this.isContextualInfo(content, type)) {
      return 'context-info';
    }
    
    if (this.isReference(content, type)) {
      return 'reference';
    }
    
    return 'supporting-text';
  }
  
  assessImportance(element) {
    let score = 0.5; // baseline
    
    const content = element.content || '';
    const type = element.type || '';
    
    // Length-based importance
    if (content.length < 50) score += 0.2; // short = likely important
    if (content.length > 1000) score -= 0.2; // long = likely supporting
    
    // Position-based importance (if available)
    if (element.position === 'first') score += 0.3;
    if (element.position === 'last') score -= 0.1;
    
    // Format-based importance
    if (type.includes('title') || type.includes('heading')) score += 0.4;
    if (type.includes('chart') || type.includes('metric')) score += 0.2;
    if (type.includes('footnote') || type.includes('reference')) score -= 0.2;
    
    // Content-based importance
    if (this.containsKeyMetrics(content)) score += 0.2;
    if (this.containsExecutiveKeywords(content)) score += 0.1;
    if (this.containsTechnicalTerms(content)) score += 0.1;
    
    // Convert to importance level
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'important';
    if (score >= 0.4) return 'supporting';
    return 'supplementary';
  }
  
  identifyRelationships(element) {
    const relationships = [];
    const content = (element.content || '').toString().toLowerCase();
    
    // Look for related elements based on content
    if (content.includes('figure') || content.includes('chart') || content.includes('diagram')) {
      relationships.push({ type: 'references-visual', target: 'visual-aid' });
    }
    
    if (content.includes('table') || content.includes('data') || content.includes('metrics')) {
      relationships.push({ type: 'references-data', target: 'key-data' });
    }
    
    if (content.includes('see') || content.includes('refer to') || content.includes('above')) {
      relationships.push({ type: 'references-other', target: 'cross-reference' });
    }
    
    return relationships;
  }
  
  determineEPAMCategory(element) {
    const content = (element.content || '').toString().toLowerCase();
    
    // Check for category-specific keywords
    for (const [category, config] of Object.entries(this.vocabulary.epamCategories)) {
      const keywords = this.getCategoryKeywords(category);
      if (keywords.some(keyword => content.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }
  
  // Helper methods for semantic detection
  isMainHeading(content, type) {
    const mainKeywords = ['executive', 'summary', 'overview', 'introduction', 'analysis', 'assessment'];
    const headingTypes = ['title', 'heading', 'headline', 'h1', 'main'];
    
    return (type && headingTypes.some(t => type.includes(t))) ||
           (content.length < 100 && mainKeywords.some(keyword => content.includes(keyword)));
  }
  
  isSecondaryHeading(content, type) {
    const secondaryKeywords = ['recommendations', 'findings', 'conclusions', 'next steps'];
    const headingTypes = ['subtitle', 'subheading', 'h2', 'h3'];
    
    return (type && headingTypes.some(t => type.includes(t))) ||
           (content.length < 150 && secondaryKeywords.some(keyword => content.includes(keyword)));
  }
  
  isTabularData(content, type) {
    const tableIndicators = ['|', '\t', 'column', 'row', 'data:', 'metric:', 'kpi:'];
    const tableTypes = ['table', 'matrix', 'grid', 'spreadsheet'];
    
    return (type && tableTypes.some(t => type.includes(t))) ||
           tableIndicators.some(indicator => content.includes(indicator));
  }
  
  isVisualContent(content, type) {
    const visualTypes = ['image', 'chart', 'diagram', 'graph', 'figure', 'illustration'];
    const visualIndicators = ['![', '<img', 'chart:', 'diagram:', 'figure:'];
    
    return (type && visualTypes.some(t => type.includes(t))) ||
           visualIndicators.some(indicator => content.includes(indicator));
  }
  
  isCriteriaList(content, type) {
    const criteriaIndicators = ['•', '-', '1.', 'requirements:', 'criteria:', 'checklist:'];
    const listTypes = ['list', 'checklist', 'requirements', 'criteria'];
    
    return (type && listTypes.some(t => type.includes(t))) ||
           criteriaIndicators.some(indicator => content.includes(indicator));
  }
  
  isContextualInfo(content, type) {
    const contextKeywords = ['background', 'context', 'methodology', 'approach', 'process'];
    const contextTypes = ['context', 'background', 'methodology'];
    
    return (type && contextTypes.some(t => type.includes(t))) ||
           contextKeywords.some(keyword => content.includes(keyword));
  }
  
  isReference(content, type) {
    const referenceIndicators = ['source:', 'reference:', 'citation:', '[', 'doi:', 'url:'];
    const referenceTypes = ['reference', 'citation', 'footnote', 'source'];
    
    return (type && referenceTypes.some(t => type.includes(t))) ||
           referenceIndicators.some(indicator => content.includes(indicator));
  }
  
  containsKeyMetrics(content) {
    const metricKeywords = ['revenue', 'growth', 'performance', 'kpi', 'metric', '%', '$', 'score'];
    return metricKeywords.some(keyword => content.includes(keyword));
  }
  
  containsExecutiveKeywords(content) {
    const execKeywords = ['executive', 'summary', 'overview', 'strategic', 'recommendation'];
    return execKeywords.some(keyword => content.includes(keyword));
  }
  
  containsTechnicalTerms(content) {
    const techKeywords = ['technical', 'architecture', 'system', 'implementation', 'integration'];
    return techKeywords.some(keyword => content.includes(keyword));
  }
  
  containsVisualElements(element) {
    const content = (element.content || '').toString();
    const type = (element.type || '').toString();
    
    return type.includes('image') || type.includes('chart') || 
           content.includes('![') || content.includes('<img');
  }
  
  containsNumericalData(content) {
    const contentStr = (content || '').toString();
    const numberPattern = /\d+[%$]|\d+\.\d+|\d{4,}/;
    return numberPattern.test(contentStr);
  }
  
  getCategoryKeywords(category) {
    const keywordMap = {
      'executive-summary': ['executive', 'summary', 'overview', 'recommendation', 'strategic'],
      'technical-assessment': ['technical', 'assessment', 'architecture', 'system', 'implementation'],
      'process-workflow': ['process', 'workflow', 'steps', 'procedure', 'methodology'],
      'metrics-dashboard': ['metrics', 'dashboard', 'kpi', 'performance', 'measurement']
    };
    
    return keywordMap[category] || [];
  }
  
  generateId() {
    return `elem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Utility method to find synonym matches
  findSynonymRole(input) {
    const normalizedInput = input.toLowerCase();
    
    for (const [role, config] of Object.entries(this.vocabulary.roles)) {
      if (config.synonyms.some(synonym => synonym.includes(normalizedInput) || normalizedInput.includes(synonym))) {
        return role;
      }
    }
    
    return null;
  }
  
  // Validate semantic role
  isValidRole(role) {
    return Object.keys(this.vocabulary.roles).includes(role);
  }
  
  // Get role configuration
  getRoleConfig(role) {
    return this.vocabulary.roles[role];
  }
}

export default semanticVocabulary;
