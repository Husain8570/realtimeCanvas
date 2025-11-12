class WebSocketManager {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;
    this.socket = null;
    this.roomId = 'default';
    this.username = '';
    this.userColor = '';
    this.remoteCursors = new Map();
  }

  connect(roomId, username) {
    this.roomId = roomId || 'default';
    this.username = username || `User${Math.floor(Math.random() * 1000)}`;
    this.userColor = this.generateColor();

    // Update header immediately
    document.getElementById('username').textContent = this.username;
    document.getElementById('room-id').textContent = this.roomId;

    this.socket = io('http://localhost:3000');

    this.socket.emit('join-room', {
      roomId: this.roomId,
      username: this.username,
      color: this.userColor
    });

    this.setupSocketListeners();
    this.setupCursorTracking();
  }

  generateColor() { return `hsl(${Math.floor(Math.random()*360)},70%,60%)`; }

  setupSocketListeners() {
    this.socket.on('init-state', (data) => {
      data.drawingHistory.forEach(action => this.canvasManager.drawRemoteAction(action));
      this.updateUsersList(data.users);
    });

    this.socket.on('user-joined', (data) => this.updateUsersList(data.users));
    this.socket.on('user-left', (data) => { this.removeCursor(data.userId); this.updateUsersList(data.users); });
    this.socket.on('draw', (data) => this.canvasManager.drawRemoteAction(data));
    this.socket.on('undo', () => this.canvasManager.undo());
    this.socket.on('redo', () => this.canvasManager.redo());
    this.socket.on('clear-canvas', () => this.canvasManager.clear());
  }

  setupCursorTracking() {
    const canvas = this.canvasManager.canvas;
    let throttleTimer = null;

    canvas.addEventListener('mousemove', (e) => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        this.socket.emit('cursor-move', { x: e.clientX - rect.left, y: e.clientY - rect.top });
        throttleTimer = null;
      }, 50);
    });
  }

  emitDrawAction(action) { this.socket.emit('draw', action); }
  emitUndo() { this.socket.emit('undo'); }
  emitRedo() { this.socket.emit('redo'); }
  emitClear() { this.socket.emit('clear-canvas'); }

  updateUsersList(users) {
    const list = document.getElementById('users-list');
    const count = document.getElementById('user-count');
    list.innerHTML = ''; count.textContent = users.length;

    users.forEach(u => {
      const div = document.createElement('div');
      div.className = 'user-item';
      div.innerHTML = `<div class="user-color" style="background:${u.color};"></div><div class="user-name">${u.username}${u.id===this.socket.id?' (You)':''}</div>`;
      list.appendChild(div);
    });
  }

  updateRemoteCursor(data) {
    const { userId, x, y } = data;
    let cursor = this.remoteCursors.get(userId);
    if (!cursor) {
      cursor = this.createCursor(userId);
      this.remoteCursors.set(userId, cursor);
    }
    cursor.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  createCursor(userId) {
    const cursorElement = document.createElement('div');
    cursorElement.className = 'user-cursor';
    cursorElement.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"/></svg><div class="user-cursor-label">User</div>`;
    this.canvasManager.canvas.parentElement.appendChild(cursorElement);
    return { element: cursorElement, userId };
  }

  removeCursor(userId) {
    const cursor = this.remoteCursors.get(userId);
    if (cursor) { cursor.element.remove(); this.remoteCursors.delete(userId); }
  }
}
