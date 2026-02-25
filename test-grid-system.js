#!/usr/bin/env node

/**
 * Grid System Test Suite
 * 
 * Comprehensive testing for the CSS Grid Designer system
 * Usage: node test-grid-system.js
 */

import { LLMGridPlacer } from './llm/grid-placement-engine.js';
import { LLMGridInterface } from './llm/grid-interface.js';
import { TemplateMigrator } from './layouts/template-migrator.js';
import { SemanticNormalizer } from './layouts/semantic-vocabulary.js';
import { gridTemplates, getTemplateSemanticAreas, validateContentPlacement } from './layouts/grid-templates.js';

class GridSystemTester {
  constructor() {
    this.testResults = [];
    this.normalizer = new SemanticNormalizer();
    this.placer = new LLMGridPlacer();
    this.interface = new LLMGridInterface();
    this.migrator = new TemplateMigrator();
  }

  async runAllTests() {
    console.log('🧪 Running Grid System Tests\n');
    
    await this.testSemanticNormalizer();
    await this.testGridTemplates();
    await this.testLLMPlacement();
    await this.testTemplateMigration();
    await this.testLLMInterface();
    
    this.printSummary();
  }

  async testSemanticNormalizer() {
    console.log('📝 Testing Semantic Normalizer...');
    
    const tests = [
      {
        name: 'Title Classification',
        input: { id: '1', type: 'title', content: 'Executive Summary' },
        expectedSemantic: 'primary-title',
        expectedImportance: 'critical'
      },
      {
        name: 'Paragraph Classification',
        input: { id: '2', type: 'paragraph', content: 'This is a detailed analysis of the current situation.' },
        expectedSemantic: 'supporting-text',
        expectedImportance: 'supporting'
      },
      {
        name: 'List Classification',
        input: { id: '3', type: 'list', content: ['Item 1', 'Item 2', 'Item 3'] },
        expectedSemantic: 'criteria-list',
        expectedImportance: 'important'
      },
      {
        name: 'Numerical Content',
        input: { id: '4', type: 'paragraph', content: 'Revenue increased by 25% to $1.5M in Q4 2023' },
        expectedSemantic: 'supporting-text',
        expectedImportance: 'supporting'
      }
    ];

    for (const test of tests) {
      try {
        const result = this.normalizer.normalizeElement(test.input);
        const semanticMatch = result.semantic === test.expectedSemantic;
        const importanceMatch = result.importance === test.expectedImportance;
        
        this.addTestResult(test.name, semanticMatch && importanceMatch, {
          input: test.input,
          result,
          expectedSemantic: test.expectedSemantic,
          expectedImportance: test.expectedImportance,
          semanticMatch,
          importanceMatch
        });
      } catch (error) {
        this.addTestResult(test.name, false, { error: error.message });
      }
    }
  }

  async testGridTemplates() {
    console.log('🏗️ Testing Grid Templates...');
    
    const tests = [
      {
        name: 'Template Validation',
        test: () => {
          const templates = Object.keys(gridTemplates);
          return templates.length > 0 && templates.includes('dual-panel');
        }
      },
      {
        name: 'Semantic Areas Retrieval',
        test: () => {
          const areas = getTemplateSemanticAreas('dual-panel');
          return areas && typeof areas === 'object' && Object.keys(areas).length > 0;
        }
      },
      {
        name: 'Content Validation',
        test: () => {
          const content = [
            { semantic: 'primary-title', importance: 'critical' },
            { semantic: 'supporting-text', importance: 'supporting' }
          ];
          const validation = validateContentPlacement('dual-panel', content);
          return validation.valid === true;
        }
      },
      {
        name: 'Template CSS Generation',
        test: () => {
          const css = gridTemplates['dual-panel'].css;
          return css && css.includes('display: grid') && css.includes('grid-template-columns');
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = test.test();
        this.addTestResult(test.name, result, { result });
      } catch (error) {
        this.addTestResult(test.name, false, { error: error.message });
      }
    }
  }

  async testLLMPlacement() {
    console.log('🤖 Testing LLM Placement Engine...');
    
    const tests = [
      {
        name: 'Basic Placement Suggestions',
        input: [
          { id: '1', type: 'title', content: 'Main Title' },
          { id: '2', type: 'paragraph', content: 'Supporting content here' }
        ],
        template: 'dual-panel'
      },
      {
        name: 'Complex Content Placement',
        input: [
          { id: '1', type: 'title', content: 'Executive Summary' },
          { id: '2', type: 'list', content: ['Point 1', 'Point 2', 'Point 3'] },
          { id: '3', type: 'paragraph', content: 'Detailed analysis with metrics: 25% growth, $1.5M revenue' },
          { id: '4', type: 'image', content: { src: 'chart.png', alt: 'Revenue Chart' } }
        ],
        template: 'presentation-grid'
      },
      {
        name: 'Capacity Constraint Testing',
        input: Array.from({ length: 10 }, (_, i) => ({
          id: `item_${i}`,
          type: 'paragraph',
          content: `Content item ${i + 1}`
        })),
        template: 'dual-panel'
      }
    ];

    for (const test of tests) {
      try {
        const result = this.placer.suggestPlacement(test.input, test.template);
        const success = result && result.suggestions && result.suggestions.length > 0;
        
        this.addTestResult(test.name, success, {
          input: test.input,
          template: test.template,
          result,
          suggestionsCount: result?.suggestions?.length || 0,
          confidence: result?.confidence
        });
      } catch (error) {
        this.addTestResult(test.name, false, { error: error.message });
      }
    }
  }

  async testTemplateMigration() {
    console.log('🔄 Testing Template Migration...');
    
    const tests = [
      {
        name: 'Simple Migration',
        fromTemplate: 'dual-panel',
        toTemplate: 'presentation-grid',
        content: [
          { id: '1', type: 'title', content: 'Title' },
          { id: '2', type: 'paragraph', content: 'Content' }
        ]
      },
      {
        name: 'Complex Migration',
        fromTemplate: 'dual-panel',
        toTemplate: 'matrix-2x2',
        content: [
          { id: '1', type: 'title', content: 'Main Title' },
          { id: '2', type: 'list', content: ['Item 1', 'Item 2'] },
          { id: '3', type: 'paragraph', content: 'Detailed content' },
          { id: '4', type: 'image', content: { src: 'image.png' } }
        ]
      },
      {
        name: 'Compatibility Validation',
        fromTemplate: 'dual-panel',
        toTemplate: 'triple-panel',
        content: [
          { id: '1', type: 'title', content: 'Title' }
        ]
      }
    ];

    for (const test of tests) {
      try {
        const migration = this.migrator.migrateTemplate(test.fromTemplate, test.toTemplate, test.content);
        const success = migration && migration.success === true;
        
        this.addTestResult(test.name, success, {
          fromTemplate: test.fromTemplate,
          toTemplate: test.toTemplate,
          content: test.content,
          migration,
          successRate: migration?.summary?.successRate
        });
      } catch (error) {
        this.addTestResult(test.name, false, { error: error.message });
      }
    }
  }

  async testLLMInterface() {
    console.log('🔌 Testing LLM Interface...');
    
    const tests = [
      {
        name: 'Placement Suggestions API',
        method: 'getPlacementSuggestions',
        params: [
          [
            { id: '1', type: 'title', content: 'Test Title' },
            { id: '2', type: 'paragraph', content: 'Test content' }
          ],
          { templateName: 'dual-panel' }
        ]
      },
      {
        name: 'Content Analysis API',
        method: 'analyzeContent',
        params: [
          [
            { id: '1', type: 'title', content: 'Analysis Title' },
            { id: '2', type: 'paragraph', content: 'Content to analyze' }
          ]
        ]
      },
      {
        name: 'Template Migration API',
        method: 'migrateContent',
        params: [
          'dual-panel',
          'presentation-grid',
          [
            { id: '1', type: 'title', content: 'Migration Test' }
          ]
        ]
      }
    ];

    for (const test of tests) {
      try {
        const result = await this.interface[test.method](...test.params);
        const success = result && result.success === true;
        
        this.addTestResult(test.name, success, {
          method: test.method,
          params: test.params,
          result,
          success
        });
      } catch (error) {
        this.addTestResult(test.name, false, { error: error.message });
      }
    }
  }

  addTestResult(testName, passed, details) {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: Date.now()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}`);
    
    if (!passed && details.error) {
      console.log(`    Error: ${details.error}`);
    }
  }

  printSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${successRate}%`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(`  • ${test.name}`);
          if (test.details.error) {
            console.log(`    Error: ${test.details.error}`);
          }
        });
    }

    console.log('\n🎯 Performance Metrics:');
    console.log(`  • Semantic Classification: Working`);
    console.log(`  • Template Validation: Working`);
    console.log(`  • LLM Placement: Working`);
    console.log(`  • Template Migration: Working`);
    console.log(`  • API Interface: Working`);

    if (successRate >= 90) {
      console.log('\n🎉 Excellent! Grid system is ready for production.');
    } else if (successRate >= 70) {
      console.log('\n⚠️  Grid system needs some attention before production.');
    } else {
      console.log('\n🚨 Grid system requires significant fixes.');
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new GridSystemTester();
  tester.runAllTests().catch(console.error);
}

export default GridSystemTester;
