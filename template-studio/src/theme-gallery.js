// Theme Gallery Renderer
export function renderThemeGallery(galleryElement, themes, selectedTheme, onThemeSelect) {
  if (!galleryElement) return;
  
  galleryElement.innerHTML = '';
  
  themes.forEach(theme => {
    const card = document.createElement('div');
    card.className = `theme-card ${theme.id === selectedTheme ? 'selected' : ''}`;
    
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    preview.style.background = theme.previewBackground || 'var(--surface)';
    preview.textContent = theme.name || 'Theme';
    
    const name = document.createElement('div');
    name.className = 'theme-name';
    name.textContent = theme.name || 'Unnamed Theme';
    
    const description = document.createElement('div');
    description.className = 'theme-description';
    description.textContent = theme.description || '';
    
    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(description);
    
    card.addEventListener('click', () => {
      if (onThemeSelect) onThemeSelect(theme);
    });
    
    galleryElement.appendChild(card);
  });
}

// Default themes - NO SUBTYPES
export const defaultThemes = [
  {
    id: 'accenture',
    name: 'Accenture',
    description: 'Corporate professional theme',
    previewBackground: 'linear-gradient(135deg, #00a1e0 0%, #003a6f 100%)'
  },
  {
    id: 'default',
    name: 'Default',
    description: 'Clean, minimal theme',
    previewBackground: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 'arc',
    name: 'Arc Theme',
    description: 'Modern dark theme',
    previewBackground: 'linear-gradient(135deg, #1a1a1a 0%, #3a3a3a 100%)'
  }
];
