# Accenture Slide Templates Collection

## Overview

This collection contains 10 professionally designed Accenture slide templates using the CSS Grid Designer system. Each template follows book/magazine style layouts with narrative text blocks and is optimized for different presentation contexts.

## Template Categories

### 🏢 **Executive & Strategic**
- **`accenture-executive-summary.mdx`** - Executive overview with key metrics
- **`accenture-strategic-roadmap.mdx`** - Strategic vision and planning timeline

### 📰 **Magazine & Feature**
- **`accenture-magazine-feature.mdx`** - Magazine-style feature story layout
- **`accenture-research-findings.mdx`** - Research insights presentation

### 📊 **Case Studies & Results**
- **`accenture-case-study.mdx`** - 2x2 matrix case study format
- **`accenture-client-testimonial.mdx`** - Client success story with quotes
- **`accenture-metrics-dashboard.mdx`** - Performance metrics dashboard

### 🔧 **Technical & Process**
- **`accenture-technical-insights.mdx`** - Technical deep-dive with sidebar
- **`accenture-process-workflow.mdx`** - Three-panel process explanation

### 🚀 **Innovation Showcase**
- **`accenture-innovation-showcase.mdx`** - 3x3 grid technology showcase

## Key Features

### ✅ **Book/Magazine Style Elements**
- **Narrative Text Blocks**: Each template includes substantial narrative content (150-200+ words)
- **Professional Typography**: Accenture brand fonts and hierarchy
- **Balanced Layouts**: Magazine-style content distribution
- **Visual Storytelling**: Strategic use of data and lists alongside narrative

### 🎨 **Design Consistency**
- **Accenture Branding**: Consistent color schemes and logo placement
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Semantic Structure**: Proper content classification for AI optimization
- **Accessibility**: WCAG compliant color contrasts and structure

### 🤖 **AI-Optimized**
- **Semantic Classification**: Content properly tagged for AI placement
- **Template Flexibility**: Easy migration between layouts
- **Content Analysis**: Optimized for automated content analysis
- **Performance Metrics**: Built-in confidence scoring

## Template Usage

### **Quick Start**
```bash
# Copy a template into the repo templates collection
cp templates/mdx/accenture-executive-summary.mdx templates/mdx/my-new-slide.mdx

# Edit the content while maintaining the structure
# Build and test
npm run build:slides
```

### **Template Structure**
Each template follows this consistent structure:

```yaml
---
title: "Slide Title"
maxWords: 300
phase: "category"
layout:
  type: "grid-designer"
  template: "layout-name"
components: ["GridDesigner", "GridArea", "ContentRenderer"]
regions:
  - id: "content-area"
    role: "semantic-role"
    area: "grid-area"
    maxWords: word-count
assets:
  logo: "path/to/logo.svg"
tags: ["relevant", "tags"]
---
```

### **Content Guidelines**

#### **Narrative Text Requirements**
- **Minimum**: 150 words of narrative content
- **Style**: Professional, engaging, magazine-quality writing
- **Structure**: Clear paragraphs with logical flow
- **Tone**: Accenture brand voice - professional, innovative, confident

#### **Content Types**
- **`primary-title`**: Main heading (critical importance)
- **`supporting-text`**: Narrative content (important)
- **`key-data`**: Metrics and results (important)
- **`criteria-list`**: Bullet points (supporting)

#### **Layout Templates**
- **`presentation-grid`**: Title with content below
- **`dual-panel`**: Two-column magazine layout
- **`matrix-2x2`**: 2x2 grid for case studies
- **`matrix-3x3`**: 3x3 grid for showcases
- **`template-sidebar`**: Main content with sidebar
- **`triple-panel`**: Three-column layout
- **`scorecard-layout`**: Header, content, footer

## Template Customization

### **Modifying Content**
1. **Keep semantic structure** - Maintain content types and importance levels
2. **Respect word limits** - Stay within maxWords constraints
3. **Update metadata** - Modify title, tags, and phase as needed
4. **Test responsiveness** - Check layout at different screen sizes

### **Changing Templates**
```bash
# Test template migration
node builder/content-analyzer.js --file templates/mdx/my-slide.mdx --migrate-from dual-panel --migrate-to presentation-grid
```

### **Brand Customization**
- **Colors**: Modify Accenture color variants in style.css
- **Typography**: Update font families in the design system
- **Logo**: Update logo paths in frontmatter
- **Spacing**: Adjust grid gaps and padding

## Content Analysis

### **Template Performance**
```bash
# Analyze all templates
node builder/content-analyzer.js --directory templates/mdx --verbose

# Get template recommendations
node builder/content-analyzer.js --directory templates/mdx --template dual-panel
```

### **Quality Metrics**
- **Narrative Quality**: All templates include substantial narrative content
- **Semantic Accuracy**: Content properly classified for AI optimization
- **Layout Efficiency**: Optimized for readability and visual hierarchy
- **Brand Consistency**: Accenture design system compliance

## Best Practices

### **Content Creation**
1. **Start with narrative** - Write engaging story first
2. **Add supporting data** - Include metrics and evidence
3. **Use semantic structure** - Proper content classification
4. **Test readability** - Ensure clear visual hierarchy

### **Template Selection**
- **Executive Summaries**: Use `presentation-grid` or `dual-panel`
- **Case Studies**: Use `matrix-2x2` for balanced storytelling
- **Technical Content**: Use `template-sidebar` for detailed explanations
- **Innovation Showcases**: Use `matrix-3x3` for multiple technologies

### **Performance Optimization**
- **Word Count**: Respect maxWords limits for optimal layout
- **Image Optimization**: Use appropriately sized assets
- **Loading Speed**: Test build performance regularly
- **Mobile Testing**: Verify responsive behavior

## File Structure

```
templates/
├── mdx/
│   ├── accenture-executive-summary.mdx
│   ├── accenture-magazine-feature.mdx
│   ├── ...
│   └── README-templates.md
└── slide_sets/
    └── accenture-complete-slides.json
```

## Integration with Main System

### **Adding to Main Presentation**
```bash
# Copy template and register in slide set
cp templates/mdx/accenture-executive-summary.mdx templates/mdx/

# Update slide order in templates/slide_sets/*.json
# Rebuild presentation
npm run build:slides
```

### **Content Analysis Integration**
```bash
# Analyze template performance
node builder/content-analyzer.js --directory templates/mdx --template dual-panel

# Test template compatibility
node test-grid-system.js
```

## Support and Maintenance

### **Regular Updates**
- **Content Refresh**: Update narrative content quarterly
- **Brand Alignment**: Ensure Accenture brand compliance
- **Performance Testing**: Validate build and rendering performance
- **Template Testing**: Verify all templates work with system updates

### **Quality Assurance**
- **Content Review**: Professional editing for narrative quality
- **Design Review**: Visual consistency and brand alignment
- **Technical Review**: Code quality and system compatibility
- **User Testing**: Feedback from actual presentation use

## Future Enhancements

### **Planned Additions**
- **Industry-Specific Templates**: Healthcare, finance, retail variants
- **Interactive Elements**: Embedded charts and interactive components
- **Multi-language Support**: International template variations
- **Advanced Animations**: Subtle transitions and micro-interactions

### **Technology Integration**
- **AI Content Generation**: Template-specific AI writing assistance
- **Dynamic Data Integration**: Real-time metrics and data feeds
- **Collaborative Editing**: Multi-user template customization
- **Version Control**: Template versioning and rollback capabilities

This template collection provides a comprehensive foundation for creating professional, engaging presentations that maintain Accenture's high standards while leveraging the power of the CSS Grid Designer system.
