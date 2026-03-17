// Grid Template Registry - Generated layouts using CSS Grid Designer patterns
// Each template maintains Accenture styling while providing structured grid layouts
// Enhanced with semantic area mappings and content constraints

import { semanticVocabulary } from './semantic-vocabulary.js';

export const gridTemplates = {
  // Comparison layout - before/after or side-by-side comparison
  'comparison-layout': {
    css: `
      display: grid;
      grid-template-columns: 1fr 2px 1fr;
      grid-template-rows: 1fr;
      gap: 2rem;
      min-height: 500px;
      position: relative;
    `,
    areas: ['before', 'divider', 'after'],
    semanticAreas: {
      'before': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 8,
        priority: 'high',
        description: 'Before state or option A'
      },
      'divider': {
        accepts: ['primary-title', 'visual-aid', 'key-data'],
        maxContent: 3,
        priority: 'critical',
        description: 'Visual divider or comparison indicator'
      },
      'after': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 8,
        priority: 'high',
        description: 'After state or option B'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto 2px auto',
        gap: '1rem'
      }
    }
  },

  // Split screen layout - 50/50 split with optional divider
  'split-screen': {
    css: `
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr;
      gap: 2rem;
      min-height: 500px;
    `,
    areas: ['left', 'right'],
    semanticAreas: {
      'left': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 8,
        priority: 'high',
        description: 'Left side content'
      },
      'right': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 8,
        priority: 'high',
        description: 'Right side content'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '1rem'
      }
    }
  },

  // Card grid layout - masonry-style flexible card arrangement
  'card-grid': {
    css: `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      grid-template-rows: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      min-height: 600px;
    `,
    areas: ['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6'],
    semanticAreas: {
      'card-1': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 6,
        priority: 'medium',
        description: 'Content card 1'
      },
      'card-2': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 6,
        priority: 'medium',
        description: 'Content card 2'
      },
      'card-3': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 6,
        priority: 'medium',
        description: 'Content card 3'
      },
      'card-4': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 6,
        priority: 'medium',
        description: 'Content card 4'
      },
      'card-5': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 6,
        priority: 'medium',
        description: 'Content card 5'
      },
      'card-6': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 6,
        priority: 'medium',
        description: 'Content card 6'
      }
    },
    responsive: {
      '@media (max-width: 1200px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)'
      },
      '@media (max-width: 800px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(6, 1fr)'
      }
    }
  },

  // Tabbed content layout - tab navigation with content panels
  'tabbed-content': {
    css: `
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      gap: 1.5rem;
      min-height: 500px;
    `,
    areas: ['tabs', 'panel-1', 'panel-2', 'panel-3'],
    semanticAreas: {
      'tabs': {
        accepts: ['criteria-list', 'primary-title'],
        maxContent: 4,
        priority: 'critical',
        description: 'Tab navigation'
      },
      'panel-1': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 10,
        priority: 'high',
        description: 'Tab content panel 1'
      },
      'panel-2': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 10,
        priority: 'high',
        description: 'Tab content panel 2'
      },
      'panel-3': {
        accepts: ['primary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 10,
        priority: 'high',
        description: 'Tab content panel 3'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gap: '1rem'
      }
    }
  },

  // Dashboard layout - multi-section dashboard
  'dashboard': {
    css: `
      display: grid;
      grid-template-columns: 2fr 1fr;
      grid-template-rows: auto 1fr auto;
      gap: 1.5rem;
      min-height: 600px;
    `,
    areas: ['header', 'sidebar', 'main', 'footer'],
    semanticAreas: {
      'header': {
        accepts: ['primary-title', 'key-data'],
        maxContent: 3,
        priority: 'critical',
        description: 'Dashboard header'
      },
      'sidebar': {
        accepts: ['criteria-list', 'key-data', 'supporting-text'],
        maxContent: 8,
        priority: 'medium',
        description: 'Dashboard sidebar'
      },
      'main': {
        accepts: ['key-data', 'visual-aid', 'supporting-text', 'primary-title'],
        maxContent: 12,
        priority: 'high',
        description: 'Main dashboard content'
      },
      'footer': {
        accepts: ['context-info', 'key-data'],
        maxContent: 4,
        priority: 'low',
        description: 'Dashboard footer'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto auto 1fr auto',
        gap: '1rem'
      }
    }
  },

  // Feature showcase layout - feature highlight with details
  'feature-showcase': {
    css: `
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr auto;
      gap: 2rem;
      min-height: 600px;
    `,
    areas: ['hero', 'features', 'details'],
    semanticAreas: {
      'hero': {
        accepts: ['primary-title', 'key-data', 'visual-aid'],
        maxContent: 4,
        priority: 'critical',
        description: 'Feature hero section'
      },
      'features': {
        accepts: ['criteria-list', 'key-data'],
        maxContent: 8,
        priority: 'high',
        description: 'Feature highlights'
      },
      'details': {
        accepts: ['supporting-text', 'key-data', 'visual-aid'],
        maxContent: 10,
        priority: 'medium',
        description: 'Feature details'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gap: '1.5rem'
      }
    }
  },

  // Process flow layout - linear process with arrows
  'process-flow': {
    css: `
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 1.5rem;
      min-height: 400px;
      position: relative;
    `,
    areas: ['step-1', 'step-2', 'step-3', 'step-4', 'step-5'],
    semanticAreas: {
      'step-1': {
        accepts: ['primary-title', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'high',
        description: 'Process step 1'
      },
      'step-2': {
        accepts: ['primary-title', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'high',
        description: 'Process step 2'
      },
      'step-3': {
        accepts: ['primary-title', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'high',
        description: 'Process step 3'
      },
      'step-4': {
        accepts: ['primary-title', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'high',
        description: 'Process step 4'
      },
      'step-5': {
        accepts: ['primary-title', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'high',
        description: 'Process step 5'
      }
    },
    responsive: {
      '@media (max-width: 1200px)': {
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: '1fr 1fr'
      },
      '@media (max-width: 800px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: '1fr 1fr 1fr'
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(5, 1fr)'
      }
    }
  },

  // Quote layout - quote with attribution and context
  'quote-layout': {
    css: `
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: auto auto 1fr;
      gap: 2rem;
      min-height: 400px;
    `,
    areas: ['quote', 'attribution', 'context'],
    semanticAreas: {
      'quote': {
        accepts: ['supporting-text', 'primary-title'],
        maxContent: 8,
        priority: 'critical',
        description: 'Main quote content'
      },
      'attribution': {
        accepts: ['key-data', 'context-info'],
        maxContent: 3,
        priority: 'high',
        description: 'Quote attribution'
      },
      'context': {
        accepts: ['context-info', 'supporting-text'],
        maxContent: 6,
        priority: 'low',
        description: 'Additional context'
      }
    },
    responsive: {
      '@media (max-width: 600px)': {
        gap: '1rem'
      }
    }
  },

  // Data visualization layout - charts with annotations
  'data-viz': {
    css: `
      display: grid;
      grid-template-columns: 2fr 1fr;
      grid-template-rows: 1fr;
      gap: 2rem;
      min-height: 500px;
    `,
    areas: ['chart', 'legend', 'annotations'],
    semanticAreas: {
      'chart': {
        accepts: ['visual-aid', 'key-data'],
        maxContent: 3,
        priority: 'critical',
        description: 'Main chart or visualization'
      },
      'legend': {
        accepts: ['criteria-list', 'key-data'],
        maxContent: 8,
        priority: 'medium',
        description: 'Chart legend'
      },
      'annotations': {
        accepts: ['supporting-text', 'key-data'],
        maxContent: 10,
        priority: 'medium',
        description: 'Chart annotations'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr auto auto'
      }
    }
  },

  // Team layout - team member profiles
  'team-layout': {
    css: `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      grid-auto-rows: minmax(220px, auto);
      gap: 1.5rem;
      min-height: 500px;
    `,
    areas: ['member-1', 'member-2', 'member-3', 'member-4'],
    semanticAreas: {
      'member-1': {
        accepts: ['primary-title', 'supporting-text', 'key-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Team member 1'
      },
      'member-2': {
        accepts: ['primary-title', 'supporting-text', 'key-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Team member 2'
      },
      'member-3': {
        accepts: ['primary-title', 'supporting-text', 'key-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Team member 3'
      },
      'member-4': {
        accepts: ['primary-title', 'supporting-text', 'key-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Team member 4'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: 'repeat(2, 1fr)'
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr'
      }
    }
  },

  // Pricing table layout - service comparison
  'pricing-table': {
    css: `
      display: grid;
      grid-template-columns: 200px repeat(3, 1fr);
      grid-template-rows: auto 1fr;
      gap: 1.5rem;
      min-height: 500px;
    `,
    areas: ['header', 'basic', 'pro', 'enterprise'],
    semanticAreas: {
      'header': {
        accepts: ['criteria-list', 'primary-title'],
        maxContent: 4,
        priority: 'critical',
        description: 'Pricing table header'
      },
      'basic': {
        accepts: ['key-data', 'criteria-list', 'supporting-text'],
        maxContent: 10,
        priority: 'medium',
        description: 'Basic pricing plan'
      },
      'pro': {
        accepts: ['key-data', 'criteria-list', 'supporting-text'],
        maxContent: 10,
        priority: 'high',
        description: 'Pro pricing plan'
      },
      'enterprise': {
        accepts: ['key-data', 'criteria-list', 'supporting-text'],
        maxContent: 10,
        priority: 'high',
        description: 'Enterprise pricing plan'
      }
    },
    responsive: {
      '@media (max-width: 900px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(4, auto)'
      }
    }
  },

  // FAQ layout - Q&A sections
  'faq-layout': {
    css: `
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      gap: 2rem;
      min-height: 600px;
    `,
    areas: ['header', 'questions', 'details'],
    semanticAreas: {
      'header': {
        accepts: ['primary-title', 'key-data'],
        maxContent: 3,
        priority: 'critical',
        description: 'FAQ header'
      },
      'questions': {
        accepts: ['criteria-list', 'supporting-text'],
        maxContent: 12,
        priority: 'high',
        description: 'FAQ questions'
      },
      'details': {
        accepts: ['supporting-text', 'key-data'],
        maxContent: 15,
        priority: 'medium',
        description: 'FAQ details'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gap: '1rem'
      }
    }
  },

  // Slide title template - dedicated title slide layouts
  'slide-title': {
    css: `
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: 1fr auto auto;
      gap: 2rem;
      min-height: 600px;
      position: relative;
      justify-items: center;
      align-items: center;
    `,
    areas: ['title', 'subtitle', 'presenter'],
    semanticAreas: {
      'title': {
        accepts: ['primary-title', 'key-data'],
        maxContent: 3,
        priority: 'critical',
        description: 'Main slide title'
      },
      'subtitle': {
        accepts: ['supporting-text', 'secondary-title'],
        maxContent: 4,
        priority: 'high',
        description: 'Slide subtitle or tagline'
      },
      'presenter': {
        accepts: ['key-data', 'context-info'],
        maxContent: 3,
        priority: 'medium',
        description: 'Presenter information or attribution'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gap: '1.5rem',
        minHeight: '500px'
      },
      '@media (max-width: 600px)': {
        gap: '1rem',
        minHeight: '400px'
      }
    }
  },

  // Flexible timeline layout - events arranged chronologically with dates at bottom
  'flexible-timeline': {
    css: `
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: 1fr auto;
      gap: 1.5rem;
      min-height: 600px;
      position: relative;
    `,
    areas: [
      'event-1', 'event-2', 'event-3', 'event-4',
      'event-5', 'event-6', 'event-7', 'event-8',
      'date-1', 'date-2', 'date-3', 'date-4', 'date-5', 'date-6', 'date-7', 'date-8'
    ],
    semanticAreas: {
      'event-1': {
        accepts: ['primary-title', 'supporting-text', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'high',
        description: 'Timeline event or milestone'
      },
      'event-2': {
        accepts: ['primary-title', 'supporting-text', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'high',
        description: 'Timeline event or milestone'
      },
      'event-3': {
        accepts: ['primary-title', 'supporting-text', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'high',
        description: 'Timeline event or milestone'
      },
      'event-4': {
        accepts: ['primary-title', 'supporting-text', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'high',
        description: 'Timeline event or milestone'
      },
      'event-5': {
        accepts: ['primary-title', 'supporting-text', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Timeline event or milestone'
      },
      'event-6': {
        accepts: ['primary-title', 'supporting-text', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Timeline event or milestone'
      },
      'event-7': {
        accepts: ['primary-title', 'supporting-text', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Timeline event or milestone'
      },
      'event-8': {
        accepts: ['primary-title', 'supporting-text', 'criteria-list', 'key-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Timeline event or milestone'
      },
      'date-1': {
        accepts: ['key-data', 'context-info'],
        maxContent: 2,
        priority: 'critical',
        description: 'Date or time marker'
      },
      'date-2': {
        accepts: ['key-data', 'context-info'],
        maxContent: 2,
        priority: 'critical',
        description: 'Date or time marker'
      },
      'date-3': {
        accepts: ['key-data', 'context-info'],
        maxContent: 2,
        priority: 'critical',
        description: 'Date or time marker'
      },
      'date-4': {
        accepts: ['key-data', 'context-info'],
        maxContent: 2,
        priority: 'critical',
        description: 'Date or time marker'
      },
      'date-5': {
        accepts: ['key-data', 'context-info'],
        maxContent: 2,
        priority: 'critical',
        description: 'Date or time marker'
      },
      'date-6': {
        accepts: ['key-data', 'context-info'],
        maxContent: 2,
        priority: 'critical',
        description: 'Date or time marker'
      },
      'date-7': {
        accepts: ['key-data', 'context-info'],
        maxContent: 2,
        priority: 'critical',
        description: 'Date or time marker'
      },
      'date-8': {
        accepts: ['key-data', 'context-info'],
        maxContent: 2,
        priority: 'critical',
        description: 'Date or time marker'
      }
    },
    responsive: {
      '@media (max-width: 1200px)': {
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: '1fr auto',
        gap: '1rem'
      },
      '@media (max-width: 800px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: '1fr auto',
        gap: '0.75rem'
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(8, auto) auto',
        gap: '0.5rem'
      }
    }
  },

  // Flexible circular process layout - dynamic number of steps around central circle
  'flexible-circle': {
    css: `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 1rem;
      min-height: 600px;
      position: relative;
    `,
    areas: [
      'top-left', 'top-center', 'top-right',
      'middle-left', 'center', 'middle-right', 
      'bottom-left', 'bottom-center', 'bottom-right'
    ],
    semanticAreas: {
      'center': {
        accepts: ['primary-title', 'key-data', 'visual-aid'],
        maxContent: 2,
        priority: 'critical',
        description: 'Central circle for process title or core concept'
      },
      'top-left': {
        accepts: ['criteria-list', 'supporting-text', 'key-data'],
        maxContent: 5,
        priority: 'medium',
        description: 'Process step or content item'
      },
      'top-center': {
        accepts: ['criteria-list', 'supporting-text', 'key-data'],
        maxContent: 5,
        priority: 'medium',
        description: 'Process step or content item'
      },
      'top-right': {
        accepts: ['criteria-list', 'supporting-text', 'key-data'],
        maxContent: 5,
        priority: 'medium',
        description: 'Process step or content item'
      },
      'middle-right': {
        accepts: ['criteria-list', 'supporting-text', 'key-data'],
        maxContent: 5,
        priority: 'medium',
        description: 'Process step or content item'
      },
      'bottom-right': {
        accepts: ['criteria-list', 'supporting-text', 'key-data'],
        maxContent: 5,
        priority: 'medium',
        description: 'Process step or content item'
      },
      'bottom-center': {
        accepts: ['criteria-list', 'supporting-text', 'key-data'],
        maxContent: 5,
        priority: 'medium',
        description: 'Process step or content item'
      },
      'bottom-left': {
        accepts: ['criteria-list', 'supporting-text', 'key-data'],
        maxContent: 5,
        priority: 'medium',
        description: 'Process step or content item'
      },
      'middle-left': {
        accepts: ['supporting-data', 'context-info', 'criteria-list'],
        maxContent: 3,
        priority: 'low',
        description: 'Additional context or supporting information'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: '0.75rem'
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(8, 1fr)',
        gap: '0.5rem'
      }
    }
  },

  // Circular process layout - 7 steps around central circle (legacy)
  'circular-process': {
    css: `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 1rem;
      min-height: 600px;
      position: relative;
    `,
    areas: [
      'top-left', 'top-center', 'top-right',
      'middle-left', 'center', 'middle-right', 
      'bottom-left', 'bottom-center', 'bottom-right'
    ],
    semanticAreas: {
      'top-left': {
        accepts: ['criteria-list', 'supporting-text'],
        maxContent: 3,
        priority: 'medium',
        description: 'Step 1 of circular process'
      },
      'top-center': {
        accepts: ['criteria-list', 'supporting-text'],
        maxContent: 3,
        priority: 'medium',
        description: 'Step 2 of circular process'
      },
      'top-right': {
        accepts: ['criteria-list', 'supporting-text'],
        maxContent: 3,
        priority: 'medium',
        description: 'Step 3 of circular process'
      },
      'middle-right': {
        accepts: ['criteria-list', 'supporting-text'],
        maxContent: 3,
        priority: 'medium',
        description: 'Step 4 of circular process'
      },
      'bottom-right': {
        accepts: ['criteria-list', 'supporting-text'],
        maxContent: 3,
        priority: 'medium',
        description: 'Step 5 of circular process'
      },
      'bottom-center': {
        accepts: ['criteria-list', 'supporting-text'],
        maxContent: 3,
        priority: 'medium',
        description: 'Step 6 of circular process'
      },
      'bottom-left': {
        accepts: ['criteria-list', 'supporting-text'],
        maxContent: 3,
        priority: 'medium',
        description: 'Step 7 of circular process'
      },
      'center': {
        accepts: ['primary-title', 'key-data', 'visual-aid'],
        maxContent: 2,
        priority: 'critical',
        description: 'Central circle for process title or core concept'
      },
      'middle-left': {
        accepts: ['supporting-data', 'context-info'],
        maxContent: 2,
        priority: 'low',
        description: 'Additional context or supporting information'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: '0.75rem'
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(8, 1fr)',
        gap: '0.5rem'
      }
    }
  },
  // Hero section layout - perfect for magazine-style presentations
  'hero-layout': {
    css: `
      display: grid;
      grid-template-rows: auto 1fr auto;
      grid-template-columns: 1fr;
      gap: clamp(1.5rem, 4vw, 2.5rem);
      align-items: start;
    `,
    areas: ['header', 'main', 'footer'],
    semanticAreas: {
      'header': {
        accepts: ['primary-title', 'secondary-title'],
        maxContent: 2,
        priority: 'critical',
        description: 'Hero header for main titles and key messaging'
      },
      'main': {
        accepts: ['supporting-text', 'key-data', 'visual-aid'],
        maxContent: 8,
        priority: 'high',
        description: 'Main content area for narrative text and detailed information'
      },
      'footer': {
        accepts: ['criteria-list', 'context-info', 'supporting-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Footer area for supporting lists and additional context'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gap: '1rem'
      },
      '@media (max-width: 600px)': {
        gap: '0.75rem'
      }
    }
  },

  // Asymmetric layout - 2fr 1fr 1fr pattern
  'asymmetric-layout': {
    css: `
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: clamp(1.5rem, 4vw, 2.5rem);
      align-items: start;
    `,
    areas: ['main', 'sidebar', 'aside'],
    semanticAreas: {
      'main': {
        accepts: ['primary-title', 'supporting-text', 'key-data'],
        maxContent: 6,
        priority: 'critical',
        description: 'Main content area with dominant visual weight'
      },
      'sidebar': {
        accepts: ['secondary-title', 'criteria-list', 'visual-aid'],
        maxContent: 4,
        priority: 'high',
        description: 'Sidebar for supporting content and lists'
      },
      'aside': {
        accepts: ['context-info', 'supporting-data', 'visual-aid'],
        maxContent: 3,
        priority: 'medium',
        description: 'Aside area for supplementary information'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateAreas: '"main sidebar" "main aside"'
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr',
        gridTemplateAreas: '"main" "sidebar" "aside"'
      }
    }
  },

  // Magazine spread layout - complex editorial design
  'magazine-spread': {
    css: `
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      grid-template-rows: auto 1fr auto;
      gap: clamp(1.5rem, 4vw, 2.5rem);
      grid-template-areas:
        "headline sidebar"
        "main sidebar"
        "footer sidebar";
    `,
    areas: ['headline', 'main', 'sidebar', 'footer'],
    semanticAreas: {
      'headline': {
        accepts: ['primary-title', 'secondary-title'],
        maxContent: 2,
        priority: 'critical',
        description: 'Magazine headline area for compelling titles'
      },
      'main': {
        accepts: ['supporting-text', 'key-data'],
        maxContent: 8,
        priority: 'high',
        description: 'Main article content area'
      },
      'sidebar': {
        accepts: ['criteria-list', 'visual-aid', 'context-info'],
        maxContent: 6,
        priority: 'medium',
        description: 'Sidebar for pull quotes and supporting elements'
      },
      'footer': {
        accepts: ['supporting-data', 'context-info'],
        maxContent: 4,
        priority: 'low',
        description: 'Footer for bylines and additional context'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: '1fr',
        gridTemplateAreas: '"headline" "sidebar" "main" "footer"'
      }
    }
  },
  // Dual panel layout - replaces existing DualPanel component
  'dual-panel': {
    css: `
      display: grid;
      grid-template-columns: minmax(0, 0.48fr) minmax(0, 0.52fr);
      gap: clamp(1.5rem, 4vw, 3rem);
      align-items: flex-start;
    `,
    areas: ['left right'],
    semanticAreas: {
      'left': {
        accepts: ['primary-title', 'secondary-title', 'supporting-text', 'criteria-list', 'context-info'],
        maxContent: 5,
        priority: 'high',
        description: 'Primary content area for main text and criteria'
      },
      'right': {
        accepts: ['secondary-title', 'supporting-text', 'key-data', 'visual-aid', 'supporting-data'],
        maxContent: 4,
        priority: 'medium',
        description: 'Secondary content area for data and visuals'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: '1fr'
      }
    }
  },

  // Three panel layout
  'triple-panel': {
    css: `
      display: grid;
      grid-template-columns: repeat(3, minmax(280px, 1fr));
      gap: clamp(1rem, 3vw, 2rem);
      align-items: start;
    `,
    areas: ['left center right'],
    semanticAreas: {
      'left': {
        accepts: ['primary-title', 'criteria-list', 'context-info'],
        maxContent: 3,
        priority: 'high',
        description: 'Left panel for titles and criteria'
      },
      'center': {
        accepts: ['supporting-text', 'visual-aid', 'key-data'],
        maxContent: 4,
        priority: 'high',
        description: 'Center panel for main content'
      },
      'right': {
        accepts: ['supporting-data', 'visual-aid', 'reference'],
        maxContent: 3,
        priority: 'medium',
        description: 'Right panel for supporting information'
      }
    },
    responsive: {
      '@media (max-width: 900px)': {
        gridTemplateColumns: 'repeat(2, 1fr)'
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr'
      }
    }
  },

  // 2x2 matrix grid - replaces MatrixGrid with 2 columns
  'matrix-2x2': {
    css: `
      display: grid;
      grid-template-columns: repeat(2, minmax(260px, 1fr));
      gap: 1.25rem;
      margin-top: 1.5rem;
    `,
    areas: ['top-left top-right', 'bottom-left bottom-right'],
    semanticAreas: {
      'top-left': {
        accepts: ['criteria-list', 'key-data', 'visual-aid'],
        maxContent: 2,
        priority: 'high',
        description: 'Top-left matrix cell'
      },
      'top-right': {
        accepts: ['criteria-list', 'key-data', 'visual-aid'],
        maxContent: 2,
        priority: 'high',
        description: 'Top-right matrix cell'
      },
      'bottom-left': {
        accepts: ['criteria-list', 'key-data', 'visual-aid'],
        maxContent: 2,
        priority: 'medium',
        description: 'Bottom-left matrix cell'
      },
      'bottom-right': {
        accepts: ['criteria-list', 'key-data', 'visual-aid'],
        maxContent: 2,
        priority: 'medium',
        description: 'Bottom-right matrix cell'
      }
    },
    responsive: {
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr'
      }
    }
  },

  // 3x3 matrix grid - replaces MatrixGrid with 3 columns
  'matrix-3x3': {
    css: `
      display: grid;
      grid-template-columns: repeat(3, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-top: 1.5rem;
    `,
    areas: [
      'top-left top-center top-right',
      'middle-left middle-center middle-right',
      'bottom-left bottom-center bottom-right'
    ],
    responsive: {
      '@media (max-width: 900px)': {
        gridTemplateColumns: 'repeat(2, 1fr)'
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr'
      }
    }
  },

  // 4x4 matrix grid - replaces MatrixGrid with 4 columns
  'matrix-4x4': {
    css: `
      display: grid;
      grid-template-columns: repeat(4, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-top: 1.5rem;
    `,
    areas: [
      'col1-row1 col2-row1 col3-row1 col4-row1',
      'col1-row2 col2-row2 col3-row2 col4-row2',
      'col1-row3 col2-row3 col3-row3 col4-row3',
      'col1-row4 col2-row4 col3-row4 col4-row4'
    ],
    responsive: {
      '@media (max-width: 900px)': {
        gridTemplateColumns: 'repeat(3, 1fr)'
      },
      '@media (max-width: 600px)': {
        gridTemplateColumns: 'repeat(2, 1fr)'
      }
    }
  },

  // Template grid with sidebar
  'template-sidebar': {
    css: `
      display: grid;
      grid-template-columns: minmax(250px, 0.3fr) minmax(400px, 1fr);
      gap: clamp(1.5rem, 4vw, 3rem);
      align-items: start;
    `,
    areas: ['sidebar main'],
    semanticAreas: {
      'sidebar': {
        accepts: ['criteria-list', 'context-info', 'reference', 'supporting-data'],
        maxContent: 6,
        priority: 'medium',
        description: 'Sidebar for metadata and criteria'
      },
      'main': {
        accepts: ['primary-title', 'secondary-title', 'supporting-text', 'key-data', 'visual-aid'],
        maxContent: 8,
        priority: 'high',
        description: 'Main content area'
      }
    },
    responsive: {
      '@media (max-width: 800px)': {
        gridTemplateColumns: '1fr'
      }
    }
  },

  // Presentation grid - title with content below
  'presentation-grid': {
    css: `
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 2rem;
      min-height: 70vh;
    `,
    areas: ['title', 'content'],
    semanticAreas: {
      'title': {
        accepts: ['primary-title', 'secondary-title'],
        maxContent: 2,
        priority: 'critical',
        description: 'Title area for main headings'
      },
      'content': {
        accepts: ['supporting-text', 'key-data', 'visual-aid', 'criteria-list', 'supporting-data'],
        maxContent: 10,
        priority: 'high',
        description: 'Main content area below title'
      }
    }
  },

  // Checklist grid - organized criteria layout
  'checklist-grid': {
    css: `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    `,
    areas: [], // Flexible areas based on content
    semanticAreas: {
      'flexible': {
        accepts: ['criteria-list', 'supporting-text', 'key-data'],
        maxContent: 12,
        priority: 'medium',
        description: 'Flexible grid for checklist items'
      }
    },
    responsive: {
      '@media (max-width: 600px)': {
        gridTemplateColumns: '1fr'
      }
    }
  },

  // Scorecard layout - header with table content
  'scorecard-layout': {
    css: `
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 1rem;
    `,
    areas: ['header', 'content', 'footer'],
    semanticAreas: {
      'header': {
        accepts: ['primary-title', 'secondary-title', 'key-data'],
        maxContent: 3,
        priority: 'critical',
        description: 'Scorecard header with title and key metrics'
      },
      'content': {
        accepts: ['supporting-data', 'key-data', 'visual-aid'],
        maxContent: 8,
        priority: 'high',
        description: 'Main scorecard content area'
      },
      'footer': {
        accepts: ['context-info', 'reference', 'supporting-text'],
        maxContent: 3,
        priority: 'low',
        description: 'Footer for additional context'
      }
    }
  }
};

// Helper function to get template CSS with responsive breakpoints
export function getTemplateCSS(templateName, customStyles = {}) {
  const template = gridTemplates[templateName];
  if (!template) {
    console.warn(`Grid template '${templateName}' not found, falling back to dual-panel`);
    return getTemplateCSS('dual-panel', customStyles);
  }

  let css = template.css;
  
  // Apply custom styles overrides
  Object.entries(customStyles).forEach(([property, value]) => {
    css += `\n  ${property}: ${value};`;
  });

  // Add responsive styles
  if (template.responsive) {
    Object.entries(template.responsive).forEach(([breakpoint, styles]) => {
      css += `\n${breakpoint} {`;
      Object.entries(styles).forEach(([property, value]) => {
        css += `\n    ${property}: ${value};`;
      });
      css += `\n}`;
    });
  }

  return css;
}

// Helper function to validate template exists
export function isValidTemplate(templateName) {
  return Object.keys(gridTemplates).includes(templateName);
}

// Helper function to get all available templates
export function getAvailableTemplates() {
  return Object.keys(gridTemplates);
}

// Helper function to get semantic areas for a template
export function getTemplateSemanticAreas(templateName) {
  const template = gridTemplates[templateName];
  return template ? template.semanticAreas : null;
}

// Helper function to validate content can be placed in area
export function validateContentPlacement(templateName, areaName, contentType) {
  const template = gridTemplates[templateName];
  if (!template || !template.semanticAreas[areaName]) {
    return false;
  }
  
  return template.semanticAreas[areaName].accepts.includes(contentType);
}

// Helper function to get area capacity
export function getAreaCapacity(templateName, areaName) {
  const template = gridTemplates[templateName];
  if (!template || !template.semanticAreas[areaName]) {
    return 0;
  }
  
  return template.semanticAreas[areaName].maxContent;
}

// Helper function to get area priority
export function getAreaPriority(templateName, areaName) {
  const template = gridTemplates[templateName];
  if (!template || !template.semanticAreas[areaName]) {
    return 'low';
  }
  
  return template.semanticAreas[areaName].priority;
}

// Template mapping registry for cross-template migration
export const templateMappingRegistry = {
  'executive-summary': {
    'primary-title': { targetArea: 'header', priority: 1 },
    'secondary-title': { targetArea: 'header', priority: 2 },
    'supporting-text': { targetArea: 'main', priority: 1 },
    'key-data': { targetArea: 'aside', priority: 1 },
    'criteria-list': { targetArea: 'sidebar', priority: 1 },
    'context-info': { targetArea: 'footer', priority: 2 }
  },
  
  'criteria-matrix': {
    'primary-title': { targetArea: 'header', priority: 1 },
    'criteria-list': { targetArea: 'main', priority: 1 },
    'key-data': { targetArea: 'main', priority: 2 },
    'supporting-data': { targetArea: 'sidebar', priority: 1 },
    'visual-aid': { targetArea: 'aside', priority: 2 }
  },
  
  'dual-panel': {
    'primary-title': { targetArea: 'left', priority: 1 },
    'supporting-text': { targetArea: 'left', priority: 2 },
    'key-data': { targetArea: 'right', priority: 1 },
    'visual-aid': { targetArea: 'right', priority: 2 },
    'context-info': { targetArea: 'footer', priority: 1 }
  },
  
  'presentation-grid': {
    'primary-title': { targetArea: 'title', priority: 1 },
    'supporting-text': { targetArea: 'content', priority: 1 },
    'key-data': { targetArea: 'content', priority: 2 },
    'visual-aid': { targetArea: 'content', priority: 3 }
  }
};
