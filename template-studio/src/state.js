const DEFAULT_STATE = {
  templateName: 'cssgrid-template',
  canvasWidth: 1920,
  canvasHeight: 1080,
  rows: 45,
  columns: 80,
  columnSize: '1fr',
  rowSize: '1fr',
  gap: '0.5rem',
  areas: [],
  referenceBackground: null,
  currentPreset: null,
  boxes: [],
  selectedBoxId: null,
  isDrawing: false,
  dragStart: null,
  metadata: {},
  guideSettings: {
    center: true,
    halves: false,
    thirds: false,
    quarters: false,
    sixths: false,
    eighths: false,
    margin: true
  },
  exclusions: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  }
};

const history = {
  undoStack: [],
  redoStack: [],
  historyLimit: 50,
  interactionHistoryCaptured: false
};

export const state = structuredClone ? structuredClone(DEFAULT_STATE) : JSON.parse(JSON.stringify(DEFAULT_STATE));

export function resetState() {
  const next = structuredClone ? structuredClone(DEFAULT_STATE) : JSON.parse(JSON.stringify(DEFAULT_STATE));
  Object.assign(state, next);
  history.undoStack = [];
  history.redoStack = [];
  history.interactionHistoryCaptured = false;
}

export function cloneBoxes(boxes) {
  return boxes.map((box) => ({
    ...box,
    metadata: { ...box.metadata }
  }));
}

function snapshotState() {
  return {
    boxes: cloneBoxes(state.boxes),
    metadata: Object.fromEntries(
      Object.entries(state.metadata).map(([id, metadata]) => [id, { ...metadata }])
    ),
    selectedBoxId: state.selectedBoxId || null
  };
}

export function pushHistory() {
  const snapshot = snapshotState();
  history.undoStack.push(snapshot);
  if (history.undoStack.length > history.historyLimit) {
    history.undoStack.shift();
  }
  history.redoStack = [];
}

export function captureHistoryForInteraction() {
  if (!history.interactionHistoryCaptured) {
    pushHistory();
    history.interactionHistoryCaptured = true;
  }
}

export function resetInteractionHistory() {
  history.interactionHistoryCaptured = false;
}

export function restoreSnapshot(snapshot) {
  state.boxes = cloneBoxes(snapshot.boxes);
  state.metadata = {};
  state.boxes.forEach((box) => {
    state.metadata[box.id] = box.metadata;
  });
  state.selectedBoxId = snapshot.selectedBoxId || null;
}

export function handleUndo() {
  if (!history.undoStack.length) return null;
  history.redoStack.push(snapshotState());
  const snapshot = history.undoStack.pop();
  restoreSnapshot(snapshot);
  return snapshot;
}

export function handleRedo() {
  if (!history.redoStack.length) return null;
  history.undoStack.push(snapshotState());
  const snapshot = history.redoStack.pop();
  restoreSnapshot(snapshot);
  return snapshot;
}

export function getHistory() {
  return history;
}
