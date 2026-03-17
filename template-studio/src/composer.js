import { initLLM } from './local-llm.js';
import { mapPptxToGrid } from './pptx-importer.js';

export function initComposer() {
  const templateGallery = document.getElementById('templateGallery');
  const composerPreview = document.getElementById('composerPreview');
  const aiChat = document.getElementById('aiChat');
  const aiBrief = document.getElementById('aiBrief');
  const generateBtn = document.getElementById('generateBtn');
  const aiStatus = document.getElementById('aiStatus');
  const deckStrip = document.getElementById('deckStrip');
  const addToDeckBtn = document.getElementById('addToDeckBtn');
  const downloadDeckBtn = document.getElementById('downloadDeckBtn');

  let engine = null;
  let currentSlide = { regions: [] };
  let deck = [];

  // MOCK TEMPLATES
  const templates = [
    { name: 'Comparison Layout', regions: [{name: 'Title', x: 2, y: 2, w: 76, h: 5, role: 'header'}, {name: 'Left', x: 2, y: 10, w: 37, h: 30, role: 'content'}, {name: 'Right', x: 41, y: 10, w: 37, h: 30, role: 'content'}] },
    { name: 'Split Screen', regions: [{name: 'Visual', x: 0, y: 0, w: 40, h: 45, role: 'content'}, {name: 'Text', x: 45, y: 10, w: 30, h: 25, role: 'content'}] },
    { name: 'Card Grid', regions: [{name: 'Card 1', x: 5, y: 5, w: 20, h: 15}, {name: 'Card 2', x: 30, y: 5, w: 20, h: 15}, {name: 'Card 3', x: 55, y: 5, w: 20, h: 15}] }
  ];

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

    addMessage(brief, false);
    aiBrief.value = '';

    const response = await engine.chat.completions.create({
      messages: [{ role: 'user', content: brief }]
    });

    const content = JSON.parse(response.choices[0].message.content);
    addMessage(`Generated content for "${content.title}"`, true);

    // Update current slide regions with generated content
    if (currentSlide.regions.length > 0) {
      currentSlide.regions[0].content = content.title;
      if (currentSlide.regions.length > 1) {
        currentSlide.regions[1].content = content.points.join('\n');
      }
    }

    renderComposerPreview();
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
      // Use the existing PPTX exporter (needs enhancement for multi-slide)
      const { exportToPptx } = await import('./persistence/pptx.js');
      exportToPptx({
          templateName: "Full Deck",
          regions: deck.flatMap(s => s.regions) // Simplified for now
      });
  });

  renderGallery();
}

window.initComposer = initComposer;
