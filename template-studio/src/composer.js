import { initLLM } from './local-llm.js';
import { mapPptxToGrid } from './pptx-importer.js';
import { parseMDXFrontmatter } from './persistence/importer.js';

export async function initComposer() {
  const templateGallery = document.getElementById('templateGallery');
  const composerPreview = document.getElementById('composerPreview');
  const aiChat = document.getElementById('aiChat');
  const aiBrief = document.getElementById('aiBrief');
  const generateBtn = document.getElementById('generateBtn');
  const aiStatus = document.getElementById('aiStatus');
  const deckStrip = document.getElementById('deckStrip');
  const addToDeckBtn = document.getElementById('addToDeckBtn');
  const downloadDeckBtn = document.getElementById('downloadDeckBtn');
  const importPptxBtn = document.getElementById('importPptxBtn');
  const pptxFileInput = document.getElementById('pptxFileInput');

  // Track selection state
  let selectedTemplateIndex = -1;
  let selectedImportedIndex = -1;

  // Restore imported slides from sessionStorage if available
  const savedImport = sessionStorage.getItem('importedSlides');
  if (savedImport) {
    try {
      const parsed = JSON.parse(savedImport);
      importedSlides = parsed.slides;
      importedPresentationName = parsed.name;
    } catch (e) {
      console.warn('Failed to restore imported slides:', e);
    }
  }

  importPptxBtn.addEventListener('click', () => pptxFileInput.click());
  pptxFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        importPptxBtn.textContent = 'Importing...';
        const { parsePptx } = await import('./pptx-importer.js');
        const extractedSlides = await parsePptx(file);
        
        if (extractedSlides && extractedSlides.length > 0) {
            // Store all imported slides
            importedSlides = extractedSlides;
            importedPresentationName = file.name.replace('.pptx', '');
            
            // Save to sessionStorage for persistence
            sessionStorage.setItem('importedSlides', JSON.stringify({
              slides: importedSlides,
              name: importedPresentationName
            }));
            
            // Render gallery with imported slides
            renderGallery();
            
            // Auto-select first imported slide
            currentSlide = importedSlides[0];
            renderComposerPreview();
            
            alert(`Successfully imported ${extractedSlides.length} slides from PowerPoint!`);
        } else {
            alert('No shapes found in PPTX.');
        }
    } catch (err) {
        console.error(err);
        alert('Error parsing PPTX: ' + err.message);
    } finally {
        importPptxBtn.textContent = 'Import PPTX';
        e.target.value = ''; // Reset input
    }
  });

  let engine = null;
  let currentSlide = { regions: [] };
  let deck = [];
  let importedSlides = [];
  let importedPresentationName = null;

  const shouldUseApi = typeof window !== 'undefined' && /^localhost|^127\.0\.0\.1/.test(window.location.hostname);

  let templates = [];

  if (shouldUseApi) {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        templates = await res.json();
        console.log('Loaded templates from API:', templates.length);
      }
    } catch (err) {
      console.warn('Failed to load templates from local API', err);
    }
  }

  // REGRESSION FIX: Removed manifest fallback to ensure API is always used
  // The manifest was causing issues with outdated template data
  // Only use hardcoded templates if API completely fails
  if (templates.length === 0) {
    console.log('Using fallback hardcoded templates');
    templates = [
      {
        name: 'Title Slide',
        regions: [
          {name: 'Title', role: 'primary-title', x: 10, y: 15, w: 60, h: 8, llmHint: 'Main presentation title'},
          {name: 'Subtitle', role: 'secondary-title', x: 10, y: 25, w: 60, h: 4, llmHint: 'Subtitle or tagline'},
          {name: 'Presenter', role: 'supporting-text', x: 10, y: 35, w: 40, h: 6, llmHint: 'Presenter name and title'}
        ]
      },
      { 
        name: 'Comparison Layout', 
        regions: [
          {name: 'Title', role: 'primary-title', x: 2, y: 2, w: 76, h: 6, llmHint: 'Slide title comparing two subjects'}, 
          {name: 'Option A', role: 'supporting-text', x: 2, y: 10, w: 36, h: 28, llmHint: 'Details for the first option'}, 
          {name: 'Option B', role: 'supporting-text', x: 42, y: 10, w: 36, h: 28, llmHint: 'Details for the second option'}
        ] 
      },
      { 
        name: 'Dashboard Summary', 
        regions: [
          {name: 'Header', role: 'primary-title', x: 2, y: 2, w: 76, h: 6, llmHint: 'Summary dashboard title'}, 
          {name: 'Key Metrics', role: 'key-data', x: 2, y: 10, w: 20, h: 30, llmHint: 'Bullet points of high level metrics'}, 
          {name: 'Analysis', role: 'supporting-text', x: 25, y: 10, w: 53, h: 30, llmHint: 'In-depth analysis and findings'}
        ] 
      }
    ];
  }

  function parseCompactGrid(gridStr) {
    if (!gridStr || typeof gridStr !== 'string') {
      return null;
    }
    
    // Handle "x,y,widthxheight" format
    const match = gridStr.match(/^(\d+),(\d+),(\d+)x(\d+)$/);
    if (!match) {
      return null;
    }
    
    return {
      x: parseInt(match[1], 10),
      y: parseInt(match[2], 10),
      width: parseInt(match[3], 10),
      height: parseInt(match[4], 10)
    };
  }

  function renderThumbnail(thumbEl, template) {
    console.log('renderThumbnail called for:', template.name);
    if (!thumbEl || !template || !template.regions) {
      console.warn('renderThumbnail: missing data', { thumbEl: !!thumbEl, template: !!template, regions: template?.regions?.length });
      return;
    }
    
    console.log(`Template ${template.name} has ${template.regions.length} regions`);
    console.log('First region coords:', template.regions[0]);
    
    // Create a canvas for the thumbnail
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size (16:9 aspect ratio)
    const width = 160;
    const height = 90;
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid lines (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    const gridSize = 10;
    for (let i = 0; i <= gridSize; i++) {
      const x = (width / gridSize) * i;
      const y = (height / gridSize) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw regions
    template.regions.forEach(region => {
      // Parse grid coordinates
      let grid;
      if (region.grid) {
        if (typeof region.grid === 'string') {
          grid = parseCompactGrid(region.grid);
        } else {
          grid = region.grid;
        }
      } else {
        // Fallback to x,y,w,h properties
        grid = {
          x: region.x || 0,
          y: region.y || 0,
          width: region.w || 20,
          height: region.h || 8
        };
      }
      
      if (!grid) return;
      
      // Convert grid coordinates to pixel coordinates
      const x = (grid.x / 80) * width;
      const y = (grid.y / 45) * height;
      const w = (grid.width / 80) * width;
      const h = (grid.height / 45) * height;
      
      // Set color based on role
      const colors = {
        'primary-title': 'rgba(129, 240, 200, 0.3)',
        'secondary-title': 'rgba(246, 179, 108, 0.3)',
        'supporting-text': 'rgba(255, 255, 255, 0.1)',
        'key-data': 'rgba(255, 94, 214, 0.3)',
        'data-table': 'rgba(108, 179, 246, 0.3)',
        'section-title': 'rgba(160, 170, 190, 0.2)',
        'logo': 'rgba(255, 255, 255, 0.15)',
        'page-number': 'rgba(160, 170, 190, 0.15)',
        'footer': 'rgba(160, 170, 190, 0.15)'
      };
      
      ctx.fillStyle = colors[region.role] || 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x, y, w, h);
      
      // Draw border
      ctx.strokeStyle = colors[region.role] ? colors[region.role].replace('0.3', '0.6').replace('0.2', '0.4') : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    });
    
    // Set canvas as thumbnail background
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    thumbEl.innerHTML = '';
    thumbEl.appendChild(canvas);
    console.log(`Canvas added to thumbnail for ${template.name}`);
  }

  function renderGallery() {
    let galleryHTML = '';
    
    // Render imported slides section if available
    if (importedSlides.length > 0) {
      galleryHTML += `
        <div class="gallery-section">
          <div class="gallery-section-header">
            <h4>Imported Slides</h4>
            <span class="gallery-section-subtitle">${importedPresentationName}</span>
            <button id="clearImportBtn" class="clear-btn">Clear</button>
          </div>
          <div class="template-gallery imported">
            ${importedSlides.map((slide, i) => `
              <div class="template-card imported" data-type="imported" data-index="${i}">
                <div class="template-thumb"></div>
                <span>${slide.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Render default templates section
    galleryHTML += `
      <div class="gallery-section">
        <div class="gallery-section-header">
          <h4>Default Templates</h4>
        </div>
        <div class="template-gallery default">
          ${templates.map((t, i) => `
            <div class="template-card default" data-type="template" data-index="${i}">
              <div class="template-thumb"></div>
              <span>${t.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    templateGallery.innerHTML = galleryHTML;

    // Render thumbnails for imported slides
    templateGallery.querySelectorAll('.template-card.imported').forEach((card, i) => {
      const thumbEl = card.querySelector('.template-thumb');
      if (thumbEl && importedSlides[i]) {
        renderThumbnail(thumbEl, importedSlides[i]);
      }
    });

    // Render thumbnails for default templates
    templateGallery.querySelectorAll('.template-card.default').forEach((card, i) => {
      const thumbEl = card.querySelector('.template-thumb');
      if (thumbEl && templates[i]) {
        renderThumbnail(thumbEl, templates[i]);
      }
    });

    // Re-apply selection after rendering
    if (selectedImportedIndex >= 0) {
      const importedCards = templateGallery.querySelectorAll('.template-card.imported');
      if (importedCards[selectedImportedIndex]) {
        updateSelectedCard(importedCards[selectedImportedIndex]);
      }
    } else if (selectedTemplateIndex >= 0) {
      const defaultCards = templateGallery.querySelectorAll('.template-card.default');
      if (defaultCards[selectedTemplateIndex]) {
        updateSelectedCard(defaultCards[selectedTemplateIndex]);
      }
    }

    // Use event delegation for template clicks
    templateGallery.addEventListener('click', (e) => {
      const card = e.target.closest('.template-card');
      if (!card) return;
      
      if (card.classList.contains('imported')) {
        const index = parseInt(card.dataset.index, 10);
        selectTemplate(index, true);
        updateSelectedCard(card);
      } else if (card.classList.contains('default')) {
        const index = parseInt(card.dataset.index, 10);
        selectTemplate(index, false);
        updateSelectedCard(card);
      }
    });
    
    // Add clear import handler
    const clearImportBtn = document.getElementById('clearImportBtn');
    if (clearImportBtn) {
      clearImportBtn.addEventListener('click', () => {
        importedSlides = [];
        importedPresentationName = null;
        sessionStorage.removeItem('importedSlides');
        renderGallery();
      });
    }
    
    // Update current slide title
    updateCurrentSlideTitle();
  }

  function updateSelectedCard(selectedCard) {
    if (!selectedCard) {
      console.error('No card provided to updateSelectedCard');
      return;
    }
    // Remove selected class from all cards
    const allCards = templateGallery.querySelectorAll('.template-card');
    allCards.forEach(card => {
      card.classList.remove('selected');
    });
    // Add selected class to clicked card
    selectedCard.classList.add('selected');
  }

  function selectTemplate(index, isImported = false) {
    if (isImported) {
      selectedImportedIndex = index;
      selectedTemplateIndex = -1;
      currentSlide = JSON.parse(JSON.stringify(importedSlides[index]));
    } else {
      selectedTemplateIndex = index;
      selectedImportedIndex = -1;
      currentSlide = JSON.parse(JSON.stringify(templates[index]));
    }
    renderComposerPreview();
  }
  
  function updateCurrentSlideTitle() {
    const titleElement = document.getElementById('currentSlideTitle');
    if (titleElement && currentSlide) {
      titleElement.textContent = currentSlide.name || 'Untitled Slide';
    }
  }

  function renderComposerPreview() {
    if (!window.TemplateStudio) return;
    
    // Check if composer preview has valid dimensions
    if (!composerPreview || composerPreview.offsetWidth === 0 || composerPreview.offsetHeight === 0) {
      console.warn('Composer preview has invalid dimensions, skipping render');
      return;
    }

    // Clear previous content to ensure fresh rendering
    window.TemplateStudio.state.content = {};

    // Process regions to handle grid format
    const processedRegions = currentSlide.regions.map(r => {
      let grid;
      if (r.grid) {
        if (typeof r.grid === 'string') {
          grid = parseCompactGrid(r.grid);
        } else {
          grid = r.grid;
        }
      } else {
        // Fallback to x,y,w,h properties
        grid = {
          x: r.x || 0,
          y: r.y || 0,
          width: r.w || 20,
          height: r.h || 8
        };
      }
      
      const regionId = r.id || Math.random().toString(36).substr(2, 9);
      
      // Set default content based on region role
      if (!window.TemplateStudio.state.content[regionId]) {
        window.TemplateStudio.state.content[regionId] = getDefaultContent(r.role || r.name);
      }
      
      return {
        ...r,
        id: regionId,
        required: true,
        inputType: getInputType(r.role || r.name),
        fieldTypes: getFieldTypes(r.role || r.name),
        llmHint: '',
        // Ensure we have the correct coordinates for the renderer
        x: grid ? grid.x : 0,
        y: grid ? grid.y : 0,
        w: grid ? grid.width : 20,
        h: grid ? grid.height : 8
      };
    });

    // Use the existing production renderer
    window.TemplateStudio.state.regions = processedRegions;
    window.TemplateStudio.renderProductionSlide(composerPreview);
    updateCurrentSlideTitle();
  }

  function getDefaultContent(role) {
    const contentMap = {
      'primary-title': 'Transform Your Business',
      'secondary-title': 'Strategic initiatives for digital transformation',
      'section-title': 'Digital Transformation',
      'supporting-text': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
      'key-data': '87%',
      'data-table': '| Metric | Q1 | Q2 | Q3 |\n|--------|----|----|----|\n| Revenue | $1.2M | $1.5M | $1.8M |\n| Growth | 15% | 25% | 20% |',
      'context-info': 'Year-over-year growth comparison showing positive trend',
      'page-number': '1',
      'footer': 'Confidential & Proprietary',
      'logo': ''
    };
    
    return contentMap[role] || '';
  }

  function getInputType(role) {
    const inputMap = {
      'logo': 'image',
      'data-table': 'table',
      'page-number': 'text',
      'footer': 'text'
    };
    
    return inputMap[role] || 'text';
  }

  function getFieldTypes(role) {
    const fieldMap = {
      'primary-title': ['text'],
      'secondary-title': ['text'],
      'section-title': ['text'],
      'supporting-text': ['text'],
      'key-data': ['number', 'text'],
      'data-table': ['table'],
      'context-info': ['text'],
      'page-number': ['number'],
      'footer': ['text'],
      'logo': ['image']
    };
    
    return fieldMap[role] || ['text'];
  }

  function addMessage(text, isAssistant = false) {
    const msg = document.createElement('div');
    msg.className = `ai-message ${isAssistant ? 'assistant' : 'user'}`;
    msg.textContent = text;
    aiChat.appendChild(msg);
    aiChat.scrollTop = aiChat.scrollHeight;
  }

  generateBtn.addEventListener('click', async () => {
    const brief = aiBrief.value.trim();
    if (!brief) return;

    if (!engine) {
      engine = await initLLM((status) => {
        aiStatus.textContent = status;
      });
    }

    // Set loading state
    const originalBtnText = generateBtn.textContent;
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    aiChat.style.opacity = '0.7';

    addMessage(brief, false);
    aiBrief.value = '';

    // Build context from current slide
    const { buildMdxSource } = await import('./persistence/mdx.js');

    const mockState = {
      templateName: currentSlide.name,
      canvasWidth: 1920,
      canvasHeight: 1080,
      columns: 80,
      rows: 45,
      boxes: currentSlide.regions.map((r, i) => ({
        id: r.id || `region-${i}`,
        name: r.name,
        gridX: r.x,
        gridY: r.y,
        gridWidth: r.w,
        gridHeight: r.h,
        metadata: {
           role: r.role || 'supporting-text',
           llmHint: r.llmHint || ''
        }
      })),
      content: {}
    };

    const mdxContext = buildMdxSource(mockState).source;
    
    const systemPrompt = `You are a professional presentation assistant.
Given the following slide structure and a user brief, generate content for the slide.
Respond ONLY with valid JSON matching this exact schema. Do NOT include prose, code fences, or MDX.

Schema:
{
  "message": "Conversational confirmation of what you generated",
  "title": "Slide Title",
  "content": {
    "Region Name or ID": "Generated text for that region"
  }
}

Notes:
- Content keys must match the provided region names or IDs.
- All values must be strings.
- Do not wrap the JSON in markdown fences.

Current Slide Structure (MDX):
\`\`\`
${mdxContext}
\`\`\`

Example Output:
{
  "message": "Here is a refreshed narrative for your slide.",
  "title": "Grid Blueprint: Narrative Slide",
  "content": {
    "Title": "Re-aligning the organization around AI adoption",
    "Content": "Generated copy for the main narrative area."
  }
}`;

    let parsedOut = null;
    let attempts = 0;
    const maxAttempts = 3;
    let currentMessages = [{ role: 'user', content: brief }];

    while (attempts < maxAttempts) {
      attempts++;
      let response;
      try {
        console.log(`[Composer] === Generation Attempt ${attempts}/${maxAttempts} ===`);
        console.log(`[Composer] System Prompt:\n`, systemPrompt);
        console.log(`[Composer] User Messages:\n`, JSON.stringify(currentMessages, null, 2));

        response = await engine.chat.completions.create({
          messages: currentMessages,
          systemPrompt
        });
      } catch (createErr) {
        console.error("LLM Generation Error:", createErr);
        addMessage(`[Generation Error]: ${createErr.message}`, true);
        generateBtn.disabled = false;
        generateBtn.textContent = originalBtnText;
        aiChat.style.opacity = '1';
        return;
      }

      const rawContent = response.choices[0].message.content;
      console.log(`[Composer] LLM Raw Response:\n`, rawContent);

      try {
        const jsonStr = rawContent.replace(/```[a-z]*\n/g, '').replace(/```$/g, '').trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON block found');
        
        parsedOut = JSON.parse(match[0]);
        if (!parsedOut.content) throw new Error('Missing "content" object');
        
        // Success
        break;
      } catch (parseErr) {
        console.warn(`Attempt ${attempts} failed to parse JSON. Raw output:`, rawContent);

        // Fallback: try to parse MDX frontmatter if the model ignored instructions
        if (!parsedOut) {
          const mdxResult = parseMDXFrontmatter(rawContent);
          if (mdxResult.success && mdxResult.frontmatter?.content) {
            parsedOut = {
              message: mdxResult.frontmatter.title
                ? `Imported MDX for "${mdxResult.frontmatter.title}"`
                : 'Imported MDX response',
              title: mdxResult.frontmatter.title || 'Generated Slide',
              content: mdxResult.frontmatter.content
            };
            break;
          }
        }

        if (attempts >= maxAttempts) {
          addMessage(`[Parsing Error]: Could not extract valid JSON from AI response after ${maxAttempts} attempts.`, true);
          generateBtn.disabled = false;
          generateBtn.textContent = originalBtnText;
          aiChat.style.opacity = '1';
          return;
        } else {
          // Send a note back to the LLM to fix it
          addMessage(`[Format Retry ${attempts}/${maxAttempts}]: Output was invalid, asking AI to fix...`, true);
          currentMessages.push({ role: 'assistant', content: rawContent });
          currentMessages.push({ 
            role: 'user', 
            content: 'Your previous response was not valid JSON or was missing the required "content" object. Please provide ONLY a valid JSON object matching the requested structure. NO other text.'
          });
        }
      }
    }

    const generatedContent = parsedOut.content;
    const msg = parsedOut.message || `Generated content for "${parsedOut.title || 'Slide'}"`;
    addMessage(msg, true);

    // Update current slide regions with generated content
    currentSlide.regions.forEach(region => {
      if (generatedContent[region.name]) {
        region.content = generatedContent[region.name];
      } else if (generatedContent[region.id]) {
        region.content = generatedContent[region.id];
      }
    });

    // Also update global studio state content for proper rendering
    if (window.TemplateStudio && window.TemplateStudio.state) {
        currentSlide.regions.forEach((r, i) => {
            const id = r.id || `region-${i}`;
            window.TemplateStudio.state.content[id] = r.content;
        });
    }

    renderComposerPreview();
    
    // Restore button state
    generateBtn.disabled = false;
    generateBtn.textContent = originalBtnText;
    aiChat.style.opacity = '1';
  });

  addToDeckBtn.addEventListener('click', () => {
    deck.push(JSON.parse(JSON.stringify(currentSlide)));
    renderDeckStrip();
  });

  function renderDeckStrip() {
    deckStrip.innerHTML = deck.map((slide, i) => `
      <div class="deck-thumb">
        Slide ${i + 1}
      </div>
    `).join('');
  }

  downloadDeckBtn.addEventListener('click', async () => {
      if (deck.length === 0) {
          alert("Add some slides to the deck first!");
          return;
      }
      
      const deckName = prompt("Enter presentation name:", "my-presentation");
      if (!deckName) return;

      const { buildMdxSource } = await import('./persistence/mdx.js');
      
      const slidesPayload = deck.map((slide, i) => {
          const mockState = {
              templateName: slide.name,
              canvasWidth: 1920,
              canvasHeight: 1080,
              columns: 80,
              rows: 45,
              boxes: slide.regions.map((r, idx) => ({
                  id: r.id || `region-${idx}`,
                  name: r.name,
                  gridX: r.x,
                  gridY: r.y,
                  gridWidth: r.w,
                  gridHeight: r.h,
                  metadata: { role: r.role || 'supporting-text', llmHint: r.llmHint || '' }
              })),
              content: slide.regions.reduce((acc, r, idx) => {
                  acc[r.id || `region-${idx}`] = r.content || '';
                  return acc;
              }, {})
          };
          
          return {
              name: slide.name,
              mdxContent: buildMdxSource(mockState).source
          };
      });

      try {
          const res = await fetch('/api/save-deck', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: deckName, slides: slidesPayload })
          });
          if (res.ok) {
              alert(`Deck successfully saved to decks/${deckName}/ and templates/slide_sets/${deckName}.json`);
              deck = [];
              renderDeckStrip();
          } else {
              alert('Failed to save deck');
          }
      } catch (err) {
          console.error(err);
          alert('Error saving deck');
      }
  });

  renderGallery();
  
  // Auto-select first template if no current slide is set
  if (!currentSlide || !currentSlide.regions || currentSlide.regions.length === 0) {
    if (importedSlides.length > 0) {
      selectedImportedIndex = 0;
      currentSlide = JSON.parse(JSON.stringify(importedSlides[0]));
    } else if (templates.length > 0) {
      selectedTemplateIndex = 0;
      currentSlide = JSON.parse(JSON.stringify(templates[0]));
    }
  } else {
    // Set selection index based on currentSlide
    for (let i = 0; i < templates.length; i++) {
      if (templates[i].name === currentSlide.name) {
        selectedTemplateIndex = i;
        break;
      }
    }
  }
  
  // Apply initial selection after a short delay to ensure DOM is ready
  setTimeout(() => {
    const defaultCards = templateGallery.querySelectorAll('.template-card.default');
    const importedCards = templateGallery.querySelectorAll('.template-card.imported');
    
    if (selectedTemplateIndex >= 0 && defaultCards.length > selectedTemplateIndex) {
      const card = defaultCards[selectedTemplateIndex];
      updateSelectedCard(card);
    } else if (selectedImportedIndex >= 0 && importedCards.length > selectedImportedIndex) {
      const card = importedCards[selectedImportedIndex];
      updateSelectedCard(card);
    }
  }, 100);
}

window.initComposer = initComposer;
