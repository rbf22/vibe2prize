import { state } from '../state.js';

export function renderSnippet() {
  const { templateName, columns, rows, columnSize, rowSize, gap } = state;
  const areas = boxesToAreaMatrix();
  const templateAreas = areas.map((row) => `"${row.join(' ')}"`).join(' ');
  
  const snippet = {
    templateName,
    grid: {
      columns,
      rows,
      columnSize,
      rowSize,
      gap
    },
    areas: areas.flat().filter(cell => cell !== '.'),
    templateAreas
  };

  const snippetOutput = document.getElementById('snippetOutput');
  if (snippetOutput) {
    snippetOutput.value = JSON.stringify(snippet, null, 2);
  }
}

function boxesToAreaMatrix() {
  const matrix = Array.from({ length: state.rows }, () => Array(state.columns).fill('.'));
  
  state.boxes.forEach(box => {
    for (let r = box.gridY; r < Math.min(box.gridY + box.gridHeight, state.rows); r++) {
      for (let c = box.gridX; c < Math.min(box.gridX + box.gridWidth, state.columns); c++) {
        matrix[r][c] = box.name;
      }
    }
  });
  
  return matrix;
}
