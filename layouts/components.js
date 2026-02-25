import React from 'react';
import { getTemplateCSS, isValidTemplate } from './grid-templates.js';

const GRID_AREA_SIGNATURE = '__gridAreaComponent__';


export const DualPanel = ({ children, className = '' }) =>
  React.createElement('div', { className: `dual-panel ${className}`.trim(), role: 'presentation' }, children);

export const PanelGrid = ({ columns = 2, gap = '2rem', className = '', children }) => {
  const clamped = Math.min(Math.max(columns, 1), 6);
  return React.createElement(
    'section',
    {
      className: `panel-grid ${className}`.trim(),
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${clamped}, minmax(0, 1fr))`,
        gap,
      },
    },
    children,
  );
};

export const TitleSlide = ({ title, subtitle, preparedFor, meta = [] }) =>
  React.createElement(
    'section',
    { className: 'title-slide' },
    React.createElement('h1', null, title),
    subtitle
      ? React.createElement(
          'div',
          { className: 'subtitle-block' },
          React.createElement('p', { className: 'subtitle' }, subtitle),
        )
      : null,
    preparedFor
      ? React.createElement('p', { className: 'prepared-for' }, preparedFor)
      : null,
    meta.length
      ? React.createElement(
          'div',
          { className: 'title-meta' },
          meta.map((item, index) => React.createElement('p', { key: index }, item)),
        )
      : null,
  );


export const Panel = ({ title, eyebrow, children }) =>
  React.createElement(
    'div',
    { className: 'panel' },
    eyebrow ? React.createElement('div', { className: 'eyebrow' }, eyebrow) : null,
    title ? React.createElement('h3', null, title) : null,
    children,
  );

export const MatrixGrid = ({ columns = 2, children }) => {
  const clamped = Math.min(Math.max(columns, 1), 4);
  return React.createElement('div', { className: `matrix-grid matrix-grid--cols-${clamped}` }, children);
};

export const MatrixCell = ({ label, result, tone = 'positive', children }) =>
  React.createElement(
    'div',
    { className: 'matrix-cell' },
    label ? React.createElement('p', { className: 'matrix-label' }, label) : null,
    result ? React.createElement('p', { className: `matrix-result ${tone}` }, result) : null,
    children ? React.createElement('p', { className: 'matrix-note' }, children) : null,
  );

export const TemplateCard = ({ eyebrow, status, title, children, className = '' }) =>
  React.createElement(
    'div',
    { className: `template-card ${className}`.trim() },
    (eyebrow || status)
      ? React.createElement(
          'div',
          { className: 'template-header' },
          eyebrow ? React.createElement('span', { className: 'eyebrow' }, eyebrow) : null,
          status ? React.createElement('span', { className: 'status-pill' }, status) : null,
        )
      : null,
    title ? React.createElement('h3', null, title) : null,
    children,
  );

export const TemplateGrid = ({ variant, className = '', children }) => {
  const variantClass = variant ? ` template-grid--${variant}` : '';
  return React.createElement(
    'div',
    { className: `template-grid${variantClass} ${className}`.trim() },
    children,
  );
};

export const TemplateSection = ({ title, span = false, children, ...rest }) =>
  React.createElement(
    'div',
    { className: `template-section${span ? ' span-2' : ''}`, ...rest },
    title ? React.createElement('h4', null, title) : null,
    children,
  );

export const Scorecard = ({ eyebrow, title, status, children, footer }) =>
  React.createElement(
    'div',
    { className: 'scorecard' },
    React.createElement(
      'div',
      { className: 'scorecard-header' },
      React.createElement(
        'div',
        null,
        eyebrow ? React.createElement('span', { className: 'eyebrow' }, eyebrow) : null,
        title ? React.createElement('h3', null, title) : null,
      ),
      status ? React.createElement('span', { className: 'status-pill' }, status) : null,
    ),
    children,
    footer ? React.createElement('div', { className: 'scorecard-foot' }, footer) : null,
  );

export const Checklist = ({ items, children, ...rest }) => {
  if (Array.isArray(items)) {
    return React.createElement(
      'ul',
      { className: 'checklist', ...rest },
      items.map((item, index) => React.createElement('li', { key: index }, item)),
    );
  }
  return React.createElement('ul', { className: 'checklist', ...rest }, children);
};

export const Timeline = ({ items = [], className = '' }) =>
  React.createElement(
    'ol',
    { className: `timeline ${className}`.trim() },
    items.map((item, index) =>
      React.createElement(
        'li',
        { key: index },
        React.createElement('div', { className: 'timeline-dot' }),
        React.createElement(
          'div',
          { className: 'timeline-content' },
          item.title ? React.createElement('h4', null, item.title) : null,
          item.subtitle ? React.createElement('span', { className: 'timeline-subtitle' }, item.subtitle) : null,
          item.description ? React.createElement('p', null, item.description) : null,
        ),
      ),
    ),
  );

export const CycleDiagram = ({ items = [], className = '' }) =>
  React.createElement(
    'div',
    { className: `cycle-diagram ${className}`.trim() },
    items.map((item, index) =>
      React.createElement(
        'div',
        { className: 'cycle-node', key: index },
        React.createElement('span', { className: 'eyebrow' }, item.step || `Step ${index + 1}`),
        React.createElement('h4', null, item.title || ''),
        item.description ? React.createElement('p', null, item.description) : null,
      ),
    ),
  );

export const QuadrantGrid = ({ quadrants = [], className = '' }) =>
  React.createElement(
    'div',
    { className: `quadrant-grid ${className}`.trim() },
    quadrants.map((quadrant, index) =>
      React.createElement(
        'div',
        { className: 'quadrant-cell', key: index },
        React.createElement('h4', null, quadrant.title || `Q${index + 1}`),
        React.createElement('p', null, quadrant.description || ''),
      ),
    ),
  );

export const PyramidChart = ({ levels = [], className = '' }) =>
  React.createElement(
    'div',
    { className: `pyramid-chart ${className}`.trim() },
    levels.map((level, index) =>
      React.createElement(
        'div',
        {
          className: 'pyramid-level',
          key: index,
          style: { '--level-index': index, '--levels-count': levels.length },
        },
        React.createElement('h4', null, level.title || `Level ${levels.length - index}`),
        level.description ? React.createElement('p', null, level.description) : null,
      ),
    ),
  );

// New Grid Designer Component - Integrates CSS Grid Designer templates
export const GridDesigner = ({ 
  template = 'dual-panel', 
  className = '', 
  style: customStyle = {}, 
  children,
  ...props 
}) => {
  // Validate template exists
  const templateName = isValidTemplate(template) ? template : 'dual-panel';
  
  // Generate CSS from template registry
  const gridCSS = getTemplateCSS(templateName, customStyle);
  
  // Parse only the grid-related CSS properties for React inline styles
  const gridStyles = {};
  const declarations = gridCSS.split(';').filter(decl => decl.trim());
  
  declarations.forEach(decl => {
    const [property, value] = decl.split(':').map(s => s.trim());
    if (property && value && property.includes('grid')) {
      const camelProp = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      gridStyles[camelProp] = value;
    }
  });
  
  const childArray = React.Children.toArray(children);
  const areaGroups = new Map();

  childArray.forEach((child) => {
    if (isGridAreaElement(child)) {
      const areaName = child.props?.area;
      if (!areaName) return;
      if (!areaGroups.has(areaName)) {
        areaGroups.set(areaName, []);
      }
      areaGroups.get(areaName).push(child);
    }
  });

  const processedChildren = [];
  const handledAreas = new Set();

  childArray.forEach((child) => {
    if (!isGridAreaElement(child)) {
      processedChildren.push(child);
      return;
    }

    const areaName = child.props?.area;
    const groupedChildren = areaGroups.get(areaName) || [];

    if (!areaName || groupedChildren.length <= 1) {
      processedChildren.push(child);
      return;
    }

    if (handledAreas.has(areaName)) {
      return;
    }

    handledAreas.add(areaName);

    processedChildren.push(
      React.createElement(
        'div',
        {
          key: `grid-stack-${areaName}`,
          className: `grid-area-stack grid-area-${areaName}`,
          style: { gridArea: areaName },
          'data-area': areaName,
        },
        groupedChildren.map((areaChild, index) =>
          React.cloneElement(areaChild, {
            key: areaChild.key ?? `stack-${areaName}-${index}`,
            __stacked: true,
          }),
        ),
      ),
    );
  });

  return React.createElement(
    'div',
    {
      className: `grid-designer grid-${templateName} ${className}`.trim(),
      style: {
        display: 'grid',
        ...gridStyles,
        ...customStyle
      },
      'data-template': templateName,
      ...props
    },
    processedChildren
  );
};

// Helper function to parse CSS string to style object (basic implementation)
function parseCSSToObject(cssString) {
  const styles = {};
  const declarations = cssString.split(';').filter(decl => decl.trim());
  
  declarations.forEach(decl => {
    const [property, value] = decl.split(':').map(s => s.trim());
    if (property && value) {
      // Convert CSS property to camelCase for React
      const camelProp = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      // Handle CSS-in-JS style properties
      if (camelProp.includes('grid-template') || camelProp.includes('grid-auto')) {
        styles[camelProp] = value;
      }
    }
  });
  
  return styles;
}

// Grid Region Component - For placing content in specific grid areas
export const GridRegion = ({ 
  area, 
  className = '', 
  children, 
  ...props 
}) => {
  return React.createElement(
    'div',
    {
      className: `grid-region ${className}`.trim(),
      style: { gridArea: area },
      'data-region': area,
      ...props
    },
    children
  );
};

// Enhanced Panel Component with Grid support
export const GridPanel = ({ 
  title, 
  eyebrow, 
  area, 
  className = '', 
  children,
  epamVariant = 'neutral',
  ...props 
}) =>
  React.createElement(
    'div', 
    { 
      className: `panel grid-panel epam-${epamVariant} ${className}`.trim(),
      style: area ? { gridArea: area } : {},
      'data-area': area,
      'data-epam-variant': epamVariant,
      ...props
    },
    eyebrow ? React.createElement('div', { className: 'eyebrow' }, eyebrow) : null,
    title ? React.createElement('h3', null, title) : null,
    children,
  );

// Grid Area Component - For semantic area positioning
export const GridArea = ({ 
  area, 
  className = '', 
  children, 
  contentType = 'supporting-text',
  importance = 'medium',
  __stacked = false,
  ...props 
}) => {
  const areaClass = `grid-area-${area}`;
  const contentTypeClass = `grid-${contentType.replace('-', '')}`;
  const importanceClass = `importance-${importance}`;
  const stackClass = __stacked ? 'grid-area-stacked-child' : '';
  const areaAttributes = __stacked
    ? {}
    : {
        style: { gridArea: area },
        'data-area': area,
      };

  return React.createElement(
    'div',
    {
      className: `${areaClass} ${contentTypeClass} ${importanceClass} grid-area-block ${stackClass} ${className}`.trim(),
      ...areaAttributes,
      'data-content-type': contentType,
      'data-importance': importance,
      ...props
    },
    children
  );
};

GridArea[GRID_AREA_SIGNATURE] = true;

function isGridAreaElement(node) {
  return React.isValidElement(node) && node.type && node.type[GRID_AREA_SIGNATURE];
}

// EPAM Grid Element - Styled content region with EPAM branding
export const EPAMGridElement = ({ 
  variant = 'neutral',
  contentType = 'supporting-text',
  className = '',
  children,
  ...props 
}) => {
  const variantClass = `epam-${variant}`;
  const contentTypeClass = `grid-${contentType.replace('-', '')}`;
  
  return React.createElement(
    'div',
    {
      className: `grid-region ${variantClass} ${contentTypeClass} ${className}`.trim(),
      'data-epam-variant': variant,
      'data-content-type': contentType,
      ...props
    },
    children
  );
};

// Content Renderer - Renders different content types with appropriate styling
export const ContentRenderer = ({ 
  type, 
  content, 
  className = '',
  ...props 
}) => {
  switch (type) {
    case 'primary-title':
    case 'secondary-title':
      return React.createElement(
        'h2', 
        { 
          className: `grid-title ${type === 'primary-title' ? 'grid-title' : 'grid-subtitle'} ${className}`.trim(),
          ...props 
        }, 
        content
      );
    
    case 'paragraph':
    case 'supporting-text':
      return React.createElement(
        'p', 
        { 
          className: `grid-paragraph ${className}`.trim(),
          ...props 
        }, 
        content
      );
    
    case 'table':
    case 'tabular':
      return React.createElement(
        'div', 
        { 
          className: `grid-table-container ${className}`.trim(),
          ...props 
        }, 
        content
      );
    
    case 'image':
    case 'visual-aid': {
      if (content && typeof content === 'object' && !Array.isArray(content)) {
        if (content.src) {
          return React.createElement(
            'img',
            {
              className: `grid-image ${className}`.trim(),
              src: content.src,
              alt: content.alt || content.title || '',
              ...props,
            },
          );
        }

        return React.createElement(
          'div',
          {
            className: `grid-visual ${className}`.trim(),
            'data-visual-type': content.type || 'custom',
            ...props,
          },
          content.title
            ? React.createElement('h3', { className: 'grid-visual-title' }, content.title)
            : null,
          content.data
            ? React.createElement('p', { className: 'grid-visual-data' }, content.data)
            : null,
          content.description
            ? React.createElement('p', { className: 'grid-visual-description' }, content.description)
            : null,
          content.children || null,
        );
      }

      return React.createElement(
        'img',
        {
          className: `grid-image ${className}`.trim(),
          src: content,
          alt: props.alt || '',
          ...props,
        },
      );
    }
    
    case 'criteria-list':
    case 'checklist':
      return React.createElement(
        'ul', 
        { 
          className: `checklist ${className}`.trim(),
          ...props 
        }, 
        Array.isArray(content) ? 
          content.map((item, index) => React.createElement('li', { key: index }, item)) :
          content
      );
    
    default:
      return React.createElement(
        'div', 
        { 
          className: `grid-content ${className}`.trim(),
          ...props 
        }, 
        content
      );
  }
};
