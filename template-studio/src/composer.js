import { initLLM } from './local-llm.js';
import { mapPptxToGrid } from './pptx-importer.js';

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

  importPptxBtn.addEventListener('click', () => pptxFileInput.click());
  pptxFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        importPptxBtn.textContent = 'Importing...';
        const { parsePptx } = await import('./pptx-importer.js');
        const extractedSlides = await parsePptx(file);
        
        if (extractedSlides && extractedSlides.length > 0) {
            // Just load the first slide as an example for now
            currentSlide = extractedSlides[0];
            renderComposerPreview();
            alert(`Successfully extracted layout from PowerPoint!`);
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

  let templates = [];
  try {
    const res = await fetch('/api/templates');
    if (res.ok) {
      templates = await res.json();
    }
  } catch (err) {
    console.warn('Failed to load templates from local API', err);
  }

  if (templates.length === 0) {
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

  function renderGallery() {
    templateGallery.innerHTML = templates.map((t, i) => `
      <div class="template-card" data-index="${i}">
        <div class="template-thumb"></div>
        <span>${t.name}</span>
      </div>
    `).join('');

    templateGallery.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const index = card.dataset.index;
        currentSlide = JSON.parse(JSON.stringify(templates[index]));
        renderComposerPreview();
      });
    });
  }

  function renderComposerPreview() {
    if (!window.TemplateStudio) return;

    // Use the existing production renderer
    window.TemplateStudio.state.regions = currentSlide.regions.map(r => ({
      ...r,
      id: r.id || Math.random().toString(36).substr(2, 9),
      required: true,
      inputType: 'text',
      fieldTypes: ['text'],
      llmHint: ''
    }));

    window.TemplateStudio.renderProductionSlide(composerPreview);
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
    const { parseMDXFrontmatter } = await import('./persistence/importer.js');

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
Given the following MDX slide structure and a user brief, generate content for the slide.
Return ONLY an MDX file structure with frontmatter and a body.
The frontmatter MUST include a "content" object mapping the region "area" names to the generated text.

Current Slide Structure (MDX):
\`\`\`mdx
${mdxContext}
\`\`\`

Example Output:
---
title: "Generated Slide Title"
content:
  "Title": "The Generated Title"
  "Left": "Generated bullet points for left column"
---
<GridDesigner template="...">
  ...
</GridDesigner>`;

    let response;
    try {
      response = await engine.chat.completions.create({
        messages: [{ role: 'user', content: brief }],
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
    const parsed = parseMDXFrontmatter(rawContent);

    if (!parsed.success || !parsed.frontmatter?.content) {
      console.warn('Failed to parse LLM MDX output. Raw output:', rawContent);
      addMessage(`[Parsing Error]: Could not extract content from AI response.`, true);
      generateBtn.disabled = false;
      generateBtn.textContent = originalBtnText;
      aiChat.style.opacity = '1';
      return;
    }

    const generatedContent = parsed.frontmatter.content;
    addMessage(`Generated content for "${parsed.frontmatter.title || 'Slide'}"`, true);

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
}

window.initComposer = initComposer;
