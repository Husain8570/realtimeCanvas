class DrawingStateManager {
  constructor() {
    this.states = new Map();
  }

  getState(roomId) {
    if (!this.states.has(roomId)) {
      this.states.set(roomId, {
        drawingHistory: [],
        undoneActions: []
      });
    }
    return this.states.get(roomId);
  }

  addDrawing(roomId, drawingData) {
    const state = this.getState(roomId);
    state.drawingHistory.push(drawingData);
    state.undoneActions = [];
  }

  undo(roomId) {
    const state = this.getState(roomId);
    if (state.drawingHistory.length === 0) return false;

    const lastAction = state.drawingHistory.pop();
    state.undoneActions.push(lastAction);
    return true;
  }

  redo(roomId) {
    const state = this.getState(roomId);
    if (state.undoneActions.length === 0) return false;

    const action = state.undoneActions.pop();
    state.drawingHistory.push(action);
    return true;
  }

  clearState(roomId) {
    const state = this.getState(roomId);
    state.drawingHistory = [];
    state.undoneActions = [];
  }
}

module.exports = { DrawingStateManager };
