const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { RoomManager } = require('./rooms');
const { DrawingStateManager } = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

const roomManager = new RoomManager();
const drawingStateManager = new DrawingStateManager();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', ({ roomId, username, color }) => {
    socket.join(roomId);

    const user = {
      id: socket.id,
      username: username || `User${Math.floor(Math.random() * 1000)}`,
      color: color || `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      cursor: { x: 0, y: 0 }
    };

    roomManager.addUser(roomId, user);

    // Send current state to the newly joined user
    const currentState = drawingStateManager.getState(roomId);
    socket.emit('init-state', {
      drawingHistory: currentState.drawingHistory,
      users: roomManager.getUsers(roomId)
    });

    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      user,
      users: roomManager.getUsers(roomId)
    });

    console.log(`${user.username} joined room ${roomId}`);
  });

  // Drawing event
  socket.on('draw', (data) => {
    const room = roomManager.getRoomByUserId(socket.id);
    if (!room) return;

    drawingStateManager.addDrawing(room, data);
    socket.to(room).emit('draw', data);
  });

  // Clear canvas
  socket.on('clear-canvas', () => {
    const room = roomManager.getRoomByUserId(socket.id);
    if (!room) return;

    drawingStateManager.clearState(room);
    io.to(room).emit('clear-canvas');
  });

  // Cursor move
  socket.on('cursor-move', (data) => {
    const room = roomManager.getRoomByUserId(socket.id);
    if (!room) return;

    roomManager.updateUserCursor(room, socket.id, data);
    socket.to(room).emit('cursor-move', {
      userId: socket.id,
      x: data.x,
      y: data.y
    });
  });

  // Undo
  socket.on('undo', () => {
    const room = roomManager.getRoomByUserId(socket.id);
    if (!room) return;

    const success = drawingStateManager.undo(room);
    if (success) io.to(room).emit('undo');
  });

  // Redo
  socket.on('redo', () => {
    const room = roomManager.getRoomByUserId(socket.id);
    if (!room) return;

    const success = drawingStateManager.redo(room);
    if (success) io.to(room).emit('redo');
  });

  // Disconnect
  socket.on('disconnect', () => {
    const room = roomManager.getRoomByUserId(socket.id);
    if (room) {
      const user = roomManager.removeUser(room, socket.id);
      socket.to(room).emit('user-left', {
        userId: socket.id,
        users: roomManager.getUsers(room)
      });
      console.log(`${user?.username || 'User'} left room ${room}`);
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
