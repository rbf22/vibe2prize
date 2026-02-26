import { state, pushHistory } from '../state.js';
import { deleteBox } from '../canvas/interactions.js';
import { slugify } from './controls.js';

export function renderRegionsTable() {
  const tbody = document.getElementById('regionsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  state.boxes.forEach((box, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" value="${box.name}" data-box-id="${box.id}" data-field="name" /></td>
      <td>(${box.gridX}, ${box.gridY})</td>
      <td>${box.gridWidth}×${box.gridHeight}</td>
      <td class="checkbox-cell">
        <input type="checkbox" ${box.metadata.required ? 'checked' : ''} 
               data-box-id="${box.id}" data-field="required" />
      </td>
      <td>
        <select data-box-id="${box.id}" data-field="inputType">
          <option value="text" ${box.metadata.inputType === 'text' ? 'selected' : ''}>Text</option>
          <option value="image" ${box.metadata.inputType === 'image' ? 'selected' : ''}>Image</option>
          <option value="any" ${box.metadata.inputType === 'any' ? 'selected' : ''}>Any</option>
        </select>
      </td>
      <td>
        <select data-box-id="${box.id}" data-field="fieldTypes">
          <option value="" ${!box.metadata.fieldTypes.length || box.metadata.fieldTypes[0] === '' ? 'selected' : ''}>None</option>
          <option value="primary-title" ${box.metadata.fieldTypes[0] === 'primary-title' ? 'selected' : ''}>Primary Title</option>
          <option value="secondary-title" ${box.metadata.fieldTypes[0] === 'secondary-title' ? 'selected' : ''}>Secondary Title</option>
          <option value="section-title" ${box.metadata.fieldTypes[0] === 'section-title' ? 'selected' : ''}>Section Title</option>
          <option value="supporting-content" ${box.metadata.fieldTypes[0] === 'supporting-content' ? 'selected' : ''}>Supporting Content</option>
          <option value="footer" ${box.metadata.fieldTypes[0] === 'footer' ? 'selected' : ''}>Footer</option>
          <option value="page-number" ${box.metadata.fieldTypes[0] === 'page-number' ? 'selected' : ''}>Page Number</option>
          <option value="key-data" ${box.metadata.fieldTypes[0] === 'key-data' ? 'selected' : ''}>Key Data</option>
          <option value="visual-aid" ${box.metadata.fieldTypes[0] === 'visual-aid' ? 'selected' : ''}>Visual Aid</option>
          <option value="quote" ${box.metadata.fieldTypes[0] === 'quote' ? 'selected' : ''}>Quote</option>
          <option value="list" ${box.metadata.fieldTypes[0] === 'list' ? 'selected' : ''}>List</option>
          <option value="chart" ${box.metadata.fieldTypes[0] === 'chart' ? 'selected' : ''}>Chart</option>
          <option value="image" ${box.metadata.fieldTypes[0] === 'image' ? 'selected' : ''}>Image</option>
          <option value="video" ${box.metadata.fieldTypes[0] === 'video' ? 'selected' : ''}>Video</option>
          <option value="logo" ${box.metadata.fieldTypes[0] === 'logo' ? 'selected' : ''}>Logo</option>
          <option value="cta-button" ${box.metadata.fieldTypes[0] === 'cta-button' ? 'selected' : ''}>CTA Button</option>
        </select>
      </td>
      <td>
        <textarea data-box-id="${box.id}" data-field="llmHint" placeholder="LLM hint...">${box.metadata.llmHint}</textarea>
      </td>
      <td>
        <button type="button" class="delete-btn" data-box-id="${box.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Add form event listeners for table inputs
  tbody.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('change', (e) => {
      const boxId = e.target.dataset.boxId;
      const field = e.target.dataset.field;
      const box = state.boxes.find(b => b.id === boxId);
      
      if (!box) return;
      
      if (field === 'name') {
        const normalized = slugify(e.target.value, box.name || 'region');
        box.name = normalized;
        e.target.value = normalized;
      } else if (field === 'required') {
        box.metadata.required = e.target.checked;
      } else if (field === 'inputType') {
        box.metadata.inputType = e.target.value;
      } else if (field === 'fieldTypes') {
        const selectedValue = e.target.value;
        box.metadata.fieldTypes = selectedValue ? [selectedValue] : [];
      } else if (field === 'llmHint') {
        box.metadata.llmHint = e.target.value;
      }
      
      state.metadata[boxId] = box.metadata;
      // Trigger re-renders
      const event = new CustomEvent('regionsTableChanged', { detail: { boxId, field, value: e.target.value } });
      document.dispatchEvent(event);
    });
  });
  
  // Add delete button handlers
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const boxId = e.target.dataset.boxId;
      pushHistory();
      deleteBox(boxId);
      renderRegionsTable();
      // Trigger re-renders
      const event = new CustomEvent('regionDeleted', { detail: { boxId } });
      document.dispatchEvent(event);
    });
  });
}

export function addNewRegion() {
  // Find empty space for new region
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.columns; x++) {
      const testBox = {
        gridX: x,
        gridY: y,
        gridWidth: 10,
        gridHeight: 5
      };
      
      if (!hasOverlap(testBox)) {
        const newBox = createBoxFromGrid(x, y, 10, 5);
        if (newBox) {
          pushHistory();
          state.boxes.push(newBox);
          state.metadata[newBox.id] = newBox.metadata;
          renderRegionsTable();
          // Trigger re-renders
          const event = new CustomEvent('regionAdded', { detail: { box: newBox } });
          document.dispatchEvent(event);
          return newBox;
        }
      }
    }
  }
  
  alert('No empty space available for new region');
  return null;
}

export function clearAllRegions() {
  if (confirm('Are you sure you want to clear all regions?')) {
    pushHistory();
    state.boxes = [];
    state.metadata = {};
    state.selectedBoxId = null;
    renderRegionsTable();
    // Trigger re-renders
    const event = new CustomEvent('allRegionsCleared');
    document.dispatchEvent(event);
  }
}

// Import needed functions
import { createBoxFromGrid, hasOverlap } from '../canvas/interactions.js';
