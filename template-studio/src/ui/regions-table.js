import { state, pushHistory } from '../state.js';
import { deleteBox } from '../canvas/interactions.js';
import { slugify } from './controls.js';
import { ROLE_OPTIONS, applyRoleMetadataToBox } from './semantic-presets.js';

const ROLE_SET = new Set(ROLE_OPTIONS);

function formatRoleLabel(roleKey) {
  if (!roleKey) return 'None';
  return roleKey
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildFieldTypeOptions(currentValue) {
  const normalizedValue = currentValue || '';
  const options = [
    `<option value="" ${normalizedValue ? '' : 'selected'}>None</option>`
  ];

  ROLE_OPTIONS.forEach((roleKey) => {
    const selected = roleKey === normalizedValue ? 'selected' : '';
    options.push(
      `<option value="${roleKey}" ${selected}>${formatRoleLabel(roleKey)}</option>`
    );
  });

  if (normalizedValue && !ROLE_SET.has(normalizedValue)) {
    options.push(
      `<option value="${normalizedValue}" selected>${formatRoleLabel(normalizedValue)} (Custom)</option>`
    );
  }

  return options.join('');
}

export function renderRegionsTable() {
  const tbody = document.getElementById('regionsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  state.boxes.forEach((box, index) => {
    if (!box.metadata) {
      box.metadata = {
        required: false,
        inputType: 'any',
        fieldTypes: [],
        llmHint: ''
      };
    }

    if (!Array.isArray(box.metadata.fieldTypes)) {
      box.metadata.fieldTypes = box.metadata.fieldTypes
        ? [String(box.metadata.fieldTypes)]
        : [];
    }

    if (!box.metadata.inputType) {
      box.metadata.inputType = 'any';
    }

    if (typeof box.metadata.llmHint !== 'string') {
      box.metadata.llmHint = box.metadata.llmHint ?? '';
    }

    if (typeof box.metadata.required !== 'boolean') {
      box.metadata.required = Boolean(box.metadata.required);
    }

    const currentFieldType = box.metadata.fieldTypes[0] || '';
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
          ${buildFieldTypeOptions(currentFieldType)}
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
      let shouldRefreshTable = false;
      
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
        if (!selectedValue) {
          box.metadata.fieldTypes = [];
        } else {
          const applied = applyRoleMetadataToBox(box, selectedValue, { preserveName: true });
          if (!applied) {
            box.metadata.fieldTypes = [selectedValue];
          }
        }
        shouldRefreshTable = true;
      } else if (field === 'llmHint') {
        box.metadata.llmHint = e.target.value;
      }
      
      state.metadata[boxId] = box.metadata;
      if (shouldRefreshTable) {
        renderRegionsTable();
      }
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
