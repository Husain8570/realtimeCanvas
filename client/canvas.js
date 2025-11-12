class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.isDrawing = false;
    this.currentTool = 'brush';
    this.currentColor = '#ffffff';
    this.strokeWidth = 3;
    this.startX = 0;
    this.startY = 0;
    this.snapshotData = null;
    this.history = [];
    this.redoStack = [];
    this.maxHistory = 50;

    this.setupCanvas();
    this.setupEventListeners();
  }

  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.redrawHistory();
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseout', () => this.stopDrawing());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const mouseEvent = new MouseEvent('mouseup', {});
      this.canvas.dispatchEvent(mouseEvent);
    });
  }

  getCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  startDrawing(e) {
    this.isDrawing = true;
    const coords = this.getCoordinates(e);
    this.startX = coords.x;
    this.startY = coords.y;

    if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
      this.ctx.beginPath();
      this.ctx.moveTo(coords.x, coords.y);
    } else {
      this.snapshotData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  draw(e) {
    if (!this.isDrawing) return;

    const coords = this.getCoordinates(e);

    if (this.currentTool === 'brush') {
      this.drawBrush(coords.x, coords.y);
    } else if (this.currentTool === 'eraser') {
      this.drawEraser(coords.x, coords.y);
    } else if (this.currentTool === 'line') {
      this.drawLine(coords.x, coords.y);
    } else if (this.currentTool === 'rectangle') {
      this.drawRectangle(coords.x, coords.y);
    } else if (this.currentTool === 'circle') {
      this.drawCircle(coords.x, coords.y);
    }
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    this.saveToHistory();
  }

  drawBrush(x, y) {
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalCompositeOperation = 'source-over';

    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  drawEraser(x, y) {
    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalCompositeOperation = 'source-over';

    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  drawLine(x, y) {
    if (this.snapshotData) {
      this.ctx.putImageData(this.snapshotData, 0, 0);
    }

    this.ctx.beginPath();
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.globalCompositeOperation = 'source-over';

    this.ctx.moveTo(this.startX, this.startY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  drawRectangle(x, y) {
    if (this.snapshotData) {
      this.ctx.putImageData(this.snapshotData, 0, 0);
    }

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.globalCompositeOperation = 'source-over';

    const width = x - this.startX;
    const height = y - this.startY;
    this.ctx.strokeRect(this.startX, this.startY, width, height);
  }

  drawCircle(x, y) {
    if (this.snapshotData) {
      this.ctx.putImageData(this.snapshotData, 0, 0);
    }

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.globalCompositeOperation = 'source-over';

    const radius = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
    this.ctx.beginPath();
    this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  drawText(text, x, y) {
    this.ctx.font = `${this.strokeWidth * 8}px sans-serif`;
    this.ctx.fillStyle = this.currentColor;
    this.ctx.fillText(text, x, y);
    this.saveToHistory();
  }

  drawImage(img, x, y) {
    const maxWidth = 300;
    const maxHeight = 300;
    let width = img.width;
    let height = img.height;

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;
    }

    this.ctx.drawImage(img, x, y, width, height);
    this.saveToHistory();
  }

  saveToHistory() {
    const imageData = this.canvas.toDataURL();
    this.history.push(imageData);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.redoStack = [];
  }

  redrawHistory() {
    if (this.history.length > 0) {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0);
      };
      img.src = this.history[this.history.length - 1];
    }
  }

  undo() {
    if (this.history.length > 0) {
      const current = this.history.pop();
      this.redoStack.push(current);

      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.history.length > 0) {
        const img = new Image();
        img.onload = () => {
          this.ctx.drawImage(img, 0, 0);
        };
        img.src = this.history[this.history.length - 1];
      }
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const action = this.redoStack.pop();
      this.history.push(action);

      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0);
      };
      img.src = action;
    }
  }

  clear() {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.history = [];
    this.redoStack = [];
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setColor(color) {
    this.currentColor = color;
  }

  setStrokeWidth(width) {
    this.strokeWidth = width;
  }

  drawRemoteAction(action) {
    const { tool, startX, startY, endX, endY, color, strokeWidth, text, imageData } = action;

    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalCompositeOperation = 'source-over';

    if (tool === 'brush') {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    } else if (tool === 'eraser') {
      this.ctx.strokeStyle = '#1a1a1a';
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    } else if (tool === 'line') {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    } else if (tool === 'rectangle') {
      const width = endX - startX;
      const height = endY - startY;
      this.ctx.strokeRect(startX, startY, width, height);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      this.ctx.beginPath();
      this.ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    } else if (tool === 'text') {
      this.ctx.font = `${strokeWidth * 8}px sans-serif`;
      this.ctx.fillText(text, startX, startY);
    } else if (tool === 'image' && imageData) {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, startX, startY, endX, endY);
      };
      img.src = imageData;
    }

    this.saveToHistory();
  }

  getCanvasState() {
    return this.canvas.toDataURL();
  }
}
