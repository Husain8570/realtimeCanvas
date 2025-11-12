let canvasManager;
let wsManager;

document.addEventListener('DOMContentLoaded', () => {
  const joinForm = document.getElementById('join-form');
  const joinScreen = document.getElementById('join-screen');
  const appContainer = document.getElementById('app-container');
  const canvas = document.getElementById('canvas');

  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('username-input').value.trim();
    const room = document.getElementById('room-input').value.trim();

    if (!username || !room) {
      alert('Please enter both username and room name.');
      return;
    }

    // Hide join screen & show main app
    joinScreen.style.display = 'none';
    appContainer.style.display = 'flex';

    // Initialize Canvas and WebSocket
    canvasManager = new CanvasManager(canvas);
    wsManager = new WebSocketManager(canvasManager);
    wsManager.connect(room, username);

    // Initialize tools and UI handlers
    setupToolButtons();
    setupColorPicker();
    setupStrokeWidth();
    setupActionButtons();
    setupTextTool();
    setupImageTool();
    setupKeyboardShortcuts();
    setupDrawingSync();
  });
});

// ------------------------- Tools / UI Handlers -------------------------
function setupToolButtons() {
  const toolButtons = document.querySelectorAll('.tool-btn');

  toolButtons.forEach(button => {
    button.addEventListener('click', () => {
      toolButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const tool = button.getAttribute('data-tool');
      canvasManager.setTool(tool);

      if (tool === 'text') showTextModal();
      else if (tool === 'image') document.getElementById('image-input').click();
    });
  });
}

function setupColorPicker() {
  const colorPicker = document.getElementById('color-picker');
  const colorPresets = document.querySelectorAll('.color-preset');

  colorPicker.addEventListener('input', (e) => {
    canvasManager.setColor(e.target.value);
  });

  colorPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      const color = preset.getAttribute('data-color');
      colorPicker.value = color;
      canvasManager.setColor(color);
    });
  });
}

function setupStrokeWidth() {
  const strokeWidth = document.getElementById('stroke-width');
  const strokeWidthValue = document.getElementById('stroke-width-value');

  strokeWidth.addEventListener('input', (e) => {
    const width = e.target.value;
    strokeWidthValue.textContent = `${width}px`;
    canvasManager.setStrokeWidth(parseInt(width));
  });
}

function setupActionButtons() {
  document.getElementById('undo-btn').addEventListener('click', () => {
    canvasManager.undo();
    wsManager.emitUndo();
  });

  document.getElementById('redo-btn').addEventListener('click', () => {
    canvasManager.redo();
    wsManager.emitRedo();
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('Clear canvas for all users?')) {
      canvasManager.clear();
      wsManager.emitClear();
    }
  });
}

// ------------------------- Text Tool -------------------------
function setupTextTool() {
  const modal = document.getElementById('text-input-modal');
  const textInput = document.getElementById('text-input');
  const submitBtn = document.getElementById('text-submit');
  const cancelBtn = document.getElementById('text-cancel');

  let textX = 0, textY = 0;

  canvasManager.canvas.addEventListener('click', (e) => {
    if (canvasManager.currentTool === 'text') {
      const rect = canvasManager.canvas.getBoundingClientRect();
      textX = e.clientX - rect.left;
      textY = e.clientY - rect.top;
      modal.style.display = 'flex';
      textInput.focus();
    }
  });

  submitBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) return;

    canvasManager.drawText(text, textX, textY);

    wsManager.emitDrawAction({
      tool: 'text',
      startX: textX,
      startY: textY,
      color: canvasManager.currentColor,
      strokeWidth: canvasManager.strokeWidth,
      text
    });

    textInput.value = '';
    modal.style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    textInput.value = '';
    modal.style.display = 'none';
  });

  textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });
}

// ------------------------- Image Tool -------------------------
function setupImageTool() {
  const imageInput = document.getElementById('image-input');

  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const x = canvasManager.canvas.width / 2 - img.width / 2;
        const y = canvasManager.canvas.height / 2 - img.height / 2;

        canvasManager.drawImage(img, x, y);

        wsManager.emitDrawAction({
          tool: 'image',
          startX: x,
          startY: y,
          endX: img.width,
          endY: img.height,
          color: canvasManager.currentColor,
          strokeWidth: canvasManager.strokeWidth,
          imageData: event.target.result
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
  });
}

// ------------------------- Keyboard Shortcuts -------------------------
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { canvasManager.undo(); wsManager.emitUndo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'y') { canvasManager.redo(); wsManager.emitRedo(); }

    const map = { b:'brush', e:'eraser', l:'line', r:'rectangle', c:'circle', t:'text', i:'image' };
    if (map[e.key.toLowerCase()]) {
      document.querySelector(`[data-tool="${map[e.key.toLowerCase()]}"]`).click();
    }
  });
}

// ------------------------- Drawing Sync -------------------------
function setupDrawingSync() {
  const canvas = canvasManager.canvas;
  let isDrawing = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (canvasManager.currentTool === 'brush' || canvasManager.currentTool === 'eraser') {
      const action = { tool: canvasManager.currentTool, startX: lastX, startY: lastY, endX: currentX, endY: currentY, color: canvasManager.currentColor, strokeWidth: canvasManager.strokeWidth };
      wsManager.emitDrawAction(action);
      lastX = currentX; lastY = currentY;
    }
  });

  canvas.addEventListener('mouseup', () => { isDrawing = false; });
  canvas.addEventListener('mouseout', () => { isDrawing = false; });
}
