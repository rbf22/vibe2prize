// LLM Grid Interface - API integration layer for LLM communication
// Provides structured interface for LLM placement suggestions and validation

import { LLMGridPlacer } from './grid-placement-engine.js';
import { TemplateMigrator } from '../layouts/template-migrator.js';
import { SemanticNormalizer } from '../layouts/semantic-vocabulary.js';

export class LLMGridInterface {
  constructor() {
    this.placer = new LLMGridPlacer();
    this.migrator = new TemplateMigrator();
    this.normalizer = new SemanticNormalizer();
    this.feedbackHistory = [];
  }
  
  // Main API method for LLM to get placement suggestions
  async getPlacementSuggestions(content, options = {}) {
    const {
      templateName = null,
      strictMode = false,
      includeAlternatives = true,
      validateCapacity = true
    } = options;
    
    try {
      // Validate input
      const validatedContent = this.validateLLMInput(content);
      
      // Get placement suggestions
      const suggestions = this.placer.suggestPlacement(validatedContent, templateName);
      
      // Apply additional validation if requested
      if (validateCapacity) {
        suggestions.suggestions = this.validateCapacityConstraints(suggestions.suggestions, suggestions.template);
      }
      
      // Generate final response
      const response = {
        success: true,
        template: suggestions.template,
        placements: suggestions.suggestions.map(s => this.formatPlacementResponse(s, includeAlternatives)),
        confidence: suggestions.confidence,
        warnings: suggestions.warnings,
        summary: suggestions.summary,
        metadata: {
          totalElements: validatedContent.length,
          processingTime: Date.now(),
          strictMode,
          validatedCapacity: validateCapacity
        }
      };
      
      return response;
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestions: [],
        warnings: [{
          type: 'processing-error',
          severity: 'high',
          message: `Failed to process placement request: ${error.message}`
        }]
      };
    }
  }
  
  // Template migration API
  async migrateContent(fromTemplate, toTemplate, content, options = {}) {
    const {
      preserveImportance = true,
      resolveConflicts = true,
      validateResult = true
    } = options;
    
    try {
      // Validate templates
      const compatibility = this.migrator.validateMigrationCompatibility(fromTemplate, toTemplate);
      if (!compatibility.compatible && !options.forceMigration) {
        return {
          success: false,
          error: 'Templates are not compatible for migration',
          compatibility,
          suggestions: [`Consider using intermediate template or manual placement`]
        };
      }
      
      // Perform migration
      const migration = this.migrator.migrateTemplate(fromTemplate, toTemplate, content);
      
      // Validate result if requested
      if (validateResult) {
        migration.validation = this.validateMigrationResult(migration);
      }
      
      return {
        success: true,
        migration,
        compatibility,
        summary: migration.summary
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestions: ['Check template names and content format']
      };
    }
  }
  
  // Content analysis API
  async analyzeContent(content, options = {}) {
    const {
      includeSemanticAnalysis = true,
      includeImportanceAssessment = true,
      includeRelationships = true
    } = options;
    
    try {
      const validatedContent = this.validateLLMInput(content);
      const analysis = {
        elements: [],
        summary: {
          totalElements: validatedContent.length,
          semanticDistribution: {},
          importanceDistribution: {
            critical: 0,
            important: 0,
            supporting: 0,
            supplementary: 0
          },
          contentCharacteristics: {
            hasVisualElements: 0,
            hasNumericalData: 0,
            averageLength: 0
          }
        }
      };
      
      validatedContent.forEach(element => {
        const normalized = this.normalizer.normalizeElement(element);
        
        const elementAnalysis = {
          id: normalized.id,
          originalType: normalized.originalType,
          semantic: normalized.semantic,
          importance: normalized.importance,
          metadata: normalized.metadata
        };
        
        if (includeSemanticAnalysis) {
          elementAnalysis.semanticDetails = this.normalizer.getRoleConfig(normalized.semantic);
        }
        
        if (includeRelationships) {
          elementAnalysis.relationships = normalized.relationships;
        }
        
        analysis.elements.push(elementAnalysis);
        
        // Update summary statistics
        analysis.summary.semanticDistribution[normalized.semantic] = 
          (analysis.summary.semanticDistribution[normalized.semantic] || 0) + 1;
        analysis.summary.importanceDistribution[normalized.importance]++;
        
        if (normalized.metadata.hasVisualElements) {
          analysis.summary.contentCharacteristics.hasVisualElements++;
        }
        
        if (normalized.metadata.hasNumericalData) {
          analysis.summary.contentCharacteristics.hasNumericalData++;
        }
        
        analysis.summary.contentCharacteristics.averageLength += normalized.metadata.contentLength;
      });
      
      // Calculate averages
      if (validatedContent.length > 0) {
        analysis.summary.contentCharacteristics.averageLength /= validatedContent.length;
      }
      
      return {
        success: true,
        analysis,
        recommendations: this.generateAnalysisRecommendations(analysis)
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        recommendations: ['Check content format and structure']
      };
    }
  }
  
  // Feedback collection API
  async collectFeedback(originalPlacement, correctedPlacement, feedback) {
    const feedbackEntry = {
      id: this.generateFeedbackId(),
      timestamp: Date.now(),
      original: originalPlacement,
      corrected: correctedPlacement,
      feedback: {
        type: feedback.type || 'correction',
        reason: feedback.reason || '',
        rating: feedback.rating || null,
        comments: feedback.comments || ''
      },
      context: this.captureContext()
    };
    
    this.feedbackHistory.push(feedbackEntry);
    
    // Process feedback for learning
    const insights = this.processFeedback(feedbackEntry);
    
    return {
      success: true,
      feedbackId: feedbackEntry.id,
      insights,
      totalFeedbackEntries: this.feedbackHistory.length
    };
  }
  
  // Learning insights API
  async getLearningInsights(options = {}) {
    const {
      timeframe = null,
      feedbackType = null,
      minEntries = 10
    } = options;
    
    if (this.feedbackHistory.length < minEntries) {
      return {
        success: false,
        error: 'Insufficient feedback data for insights',
        currentEntries: this.feedbackHistory.length,
        minimumRequired: minEntries
      };
    }
    
    const filteredFeedback = this.filterFeedback(this.feedbackHistory, timeframe, feedbackType);
    const insights = this.analyzeFeedbackPatterns(filteredFeedback);
    
    return {
      success: true,
      insights,
      metadata: {
        totalEntries: this.feedbackHistory.length,
        analyzedEntries: filteredFeedback.length,
        timeframe,
        feedbackType
      }
    };
  }
  
  // Helper methods
  validateLLMInput(content) {
    if (!Array.isArray(content)) {
      throw new Error('Content must be an array of elements');
    }
    
    return content.map((element, index) => ({
      id: element.id || `auto_${Date.now()}_${index}`,
      type: element.type || 'paragraph',
      content: element.content || '',
      metadata: element.metadata || {}
    }));
  }
  
  formatPlacementResponse(suggestion, includeAlternatives) {
    const response = {
      elementId: suggestion.elementId,
      suggestedArea: suggestion.suggestedArea,
      confidence: Number(suggestion.confidence.toFixed(3)),
      reasoning: suggestion.reasoning,
      importance: suggestion.importance
    };
    
    if (includeAlternatives && suggestion.alternatives.length > 0) {
      response.alternatives = suggestion.alternatives;
    }
    
    if (suggestion.metadata) {
      response.metadata = suggestion.metadata;
    }
    
    return response;
  }
  
  validateCapacityConstraints(suggestions, templateName) {
    // This would integrate with the template system to check actual capacity
    // For now, return suggestions unchanged
    return suggestions;
  }
  
  validateMigrationResult(migration) {
    const validation = {
      isValid: true,
      issues: [],
      score: 0.0
    };
    
    // Check for orphaned elements
    if (migration.migrationPlan.statistics.orphanedElements > 0) {
      validation.issues.push({
        type: 'orphaned-elements',
        count: migration.migrationPlan.statistics.orphanedElements,
        severity: 'high'
      });
      validation.isValid = false;
    }
    
    // Check for conflicts
    if (migration.migrationPlan.statistics.conflicts > 0) {
      validation.issues.push({
        type: 'conflicts',
        count: migration.migrationPlan.statistics.conflicts,
        severity: 'medium'
      });
    }
    
    // Calculate validation score
    const totalElements = migration.migrationPlan.statistics.totalElements;
    const mappedElements = migration.migrationPlan.statistics.mappedElements;
    validation.score = totalElements > 0 ? mappedElements / totalElements : 0;
    
    return validation;
  }
  
  generateAnalysisRecommendations(analysis) {
    const recommendations = [];
    const { summary } = analysis;
    
    // Template recommendations based on content
    if (summary.semanticDistribution['criteria-list'] > 2) {
      recommendations.push('Consider using criteria-matrix template for better organization');
    }
    
    if (summary.contentCharacteristics.hasVisualElements > 2) {
      recommendations.push('Consider dual-panel template to balance text and visuals');
    }
    
    if (summary.importanceDistribution.critical > 3) {
      recommendations.push('Consider presentation-grid template for hierarchical content');
    }
    
    // Content organization recommendations
    if (summary.contentCharacteristics.averageLength > 500) {
      recommendations.push('Consider breaking down long content into smaller elements');
    }
    
    return recommendations;
  }
  
  generateFeedbackId() {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  captureContext() {
    return {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      template: this.currentTemplate || null,
      version: '1.0.0'
    };
  }
  
  processFeedback(feedbackEntry) {
    // Simple feedback processing for now
    return {
      pattern: 'correction',
      frequency: 1,
      impact: 'medium'
    };
  }
  
  filterFeedback(feedback, timeframe, type) {
    let filtered = [...feedback];
    
    if (timeframe) {
      const cutoff = Date.now() - timeframe;
      filtered = filtered.filter(entry => entry.timestamp > cutoff);
    }
    
    if (type) {
      filtered = filtered.filter(entry => entry.feedback.type === type);
    }
    
    return filtered;
  }
  
  analyzeFeedbackPatterns(feedback) {
    const patterns = {
      commonCorrections: {},
      preferredPlacements: {},
      confidenceIssues: []
    };
    
    feedback.forEach(entry => {
      // Analyze correction patterns
      if (entry.original.suggestedArea !== entry.corrected.suggestedArea) {
        const key = `${entry.original.suggestedArea} → ${entry.corrected.suggestedArea}`;
        patterns.commonCorrections[key] = (patterns.commonCorrections[key] || 0) + 1;
      }
      
      // Analyze preferred placements
      const area = entry.corrected.suggestedArea;
      patterns.preferredPlacements[area] = (patterns.preferredPlacements[area] || 0) + 1;
      
      // Track confidence issues
      if (entry.original.confidence < 0.7) {
        patterns.confidenceIssues.push({
          elementId: entry.original.elementId,
          originalConfidence: entry.original.confidence,
          issue: 'low-confidence-placement'
        });
      }
    });
    
    return patterns;
  }
}

export default LLMGridInterface;
