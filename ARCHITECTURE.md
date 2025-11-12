# Architecture Documentation

## Overview

This collaborative drawing application follows a client-server architecture using WebSockets for real-time bidirectional communication. The system enables multiple users to draw on a shared canvas simultaneously with synchronized state management.

## System Architecture

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│                 │◄──────────────────────────►│                 │
│  Client A       │                             │                 │
│  (Browser)      │         Socket.io           │   Node.js       │
└─────────────────┘                             │   Server        │
                                                 │                 │
┌─────────────────┐         WebSocket          │   - Express     │
│                 │◄──────────────────────────►│   - Socket.io   │
│  Client B       │                             │   - Room Mgr    │
│  (Browser)      │         Socket.io           │   - State Mgr   │
└─────────────────┘                             └─────────────────┘

┌─────────────────┐         WebSocket
│                 │◄──────────────────────────►
│  Client N       │
│  (Browser)      │         Socket.io
└─────────────────┘
```

## Component Architecture

### Client-Side Components

#### 1. CanvasManager (`canvas.js`)
**Responsibility**: Manages all canvas drawing operations and local state.

**Key Features**:
- Handles HTML5 Canvas context and rendering
- Implements all drawing tools (brush, eraser, shapes, text, images)
- Manages local drawing history for undo/redo
- Provides smooth drawing with optimized path rendering
- Handles canvas resizing and state preservation

**Key Methods**:
- `startDrawing()`: Initiates drawing operation
- `draw()`: Handles continuous drawing/shape preview
- `stopDrawing()`: Finalizes drawing and saves to history
- `drawRemoteAction()`: Renders actions from remote users
- `undo()`/`redo()`: Local history management
- `saveToHistory()`: Stores canvas state as data URL

**Drawing Optimization**:
- Uses `requestAnimationFrame` implicitly through event handlers
- Implements snapshot mechanism for shape tools to avoid redrawing
- Limits history to 50 actions to prevent memory bloat
- Uses `willReadFrequently: true` context option for better read performance

#### 2. WebSocketManager (`websocket.js`)
**Responsibility**: Manages WebSocket connection and real-time communication.

**Key Features**:
- Establishes Socket.io connection with server
- Handles room joining and user management
- Emits drawing actions to server
- Receives and processes remote drawing actions
- Manages remote cursor positions
- Throttles cursor updates to reduce network traffic

**Key Methods**:
- `connect()`: Establishes WebSocket connection
- `emitDrawAction()`: Sends drawing data to server
- `updateRemoteCursor()`: Updates other users' cursor positions
- `updateUsersList()`: Refreshes online users display

**Event Handlers**:
- `init-state`: Receives initial canvas state on join
- `draw`: Receives remote drawing actions
- `cursor-move`: Updates remote cursor positions
- `undo`/`redo`: Synchronizes history operations
- `user-joined`/`user-left`: Updates user presence

#### 3. Main Controller (`main.js`)
**Responsibility**: Coordinates UI interactions and component communication.

**Key Features**:
- Initializes application components
- Sets up event listeners for UI controls
- Manages tool selection and settings
- Implements keyboard shortcuts
- Coordinates between canvas and WebSocket managers

**UI Bindings**:
- Tool buttons → CanvasManager tool switching
- Color picker → CanvasManager color updates
- Drawing events → WebSocketManager emission
- Action buttons → Synchronized operations

### Server-Side Components

#### 1. Server (`server.js`)
**Responsibility**: Main application server and WebSocket hub.

**Key Features**:
- Express server for serving static files
- Socket.io server for WebSocket communication
- Routes events between connected clients
- Coordinates room and state managers

**Event Handlers**:
```javascript
'join-room'      → Add user to room, send initial state
'draw'           → Broadcast drawing action to room
'cursor-move'    → Broadcast cursor position to room
'undo'/'redo'    → Coordinate global undo/redo
'clear-canvas'   → Broadcast clear action
'disconnect'     → Clean up user from room
```

#### 2. RoomManager (`rooms.js`)
**Responsibility**: Manages user presence and room membership.

**Data Structure**:
```javascript
Map<roomId, Map<userId, User>>

User {
  id: string,           // Socket ID
  username: string,     // Display name
  color: string,        // User's cursor/identifier color
  cursor: {x, y}        // Current cursor position
}
```

**Key Methods**:
- `addUser()`: Adds user to room
- `removeUser()`: Removes user and cleans up empty rooms
- `getUsers()`: Returns all users in a room
- `getRoomByUserId()`: Finds room containing a user
- `updateUserCursor()`: Updates user's cursor position

#### 3. DrawingStateManager (`drawing-state.js`)
**Responsibility**: Manages drawing history and undo/redo state per room.

**Data Structure**:
```javascript
Map<roomId, State>

State {
  drawingHistory: Array<DrawAction>,   // Stack of drawing actions
  undoneActions: Array<DrawAction>     // Stack for redo
}

DrawAction {
  tool: string,                        // Tool type
  startX, startY: number,              // Starting coordinates
  endX, endY: number,                  // Ending coordinates
  color: string,                       // Drawing color
  strokeWidth: number,                 // Line width
  text?: string,                       // Text content (if text tool)
  imageData?: string                   // Base64 image (if image tool)
}
```

**Key Methods**:
- `addDrawing()`: Adds action to history, clears redo stack
- `undo()`: Moves last action to redo stack
- `redo()`: Restores action from redo stack
- `clearState()`: Resets all state for a room

## Data Flow

### Drawing Action Flow

```
User draws on canvas
       ↓
CanvasManager.draw() → Local rendering
       ↓
main.js captures mouse events
       ↓
WebSocketManager.emitDrawAction()
       ↓
Socket.io client → Server
       ↓
Server.on('draw') → Validates user in room
       ↓
DrawingStateManager.addDrawing() → Stores in history
       ↓
socket.to(room).emit('draw') → Broadcast to others
       ↓
Other clients receive 'draw' event
       ↓
WebSocketManager.on('draw')
       ↓
CanvasManager.drawRemoteAction() → Render remotely
```

### Undo/Redo Flow

```
User clicks Undo
       ↓
CanvasManager.undo() → Local undo
       ↓
WebSocketManager.emitUndo()
       ↓
Server receives 'undo'
       ↓
DrawingStateManager.undo() → Update global history
       ↓
io.to(room).emit('undo') → Broadcast to ALL (including sender)
       ↓
All clients receive 'undo'
       ↓
CanvasManager.undo() → Everyone undoes
```

**Note**: Undo/redo broadcasts to ALL users including the initiator, ensuring perfect synchronization. The initiator undoes twice (once locally, once on broadcast) but this is corrected by the synchronized state.

## WebSocket Protocol

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{roomId, username, color}` | Join or create a room |
| `draw` | `DrawAction` | Send drawing action |
| `cursor-move` | `{x, y}` | Update cursor position |
| `undo` | none | Request global undo |
| `redo` | none | Request global redo |
| `clear-canvas` | none | Clear entire canvas |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `init-state` | `{drawingHistory, users}` | Initial room state on join |
| `draw` | `DrawAction` | Remote user drawing action |
| `cursor-move` | `{userId, x, y}` | Remote cursor update |
| `undo` | none | Perform undo operation |
| `redo` | none | Perform redo operation |
| `clear-canvas` | none | Clear canvas |
| `user-joined` | `{user, users}` | User joined notification |
| `user-left` | `{userId, users}` | User left notification |

## Undo/Redo Logic

### Design Philosophy
The undo/redo system is **global and synchronized** across all users. When any user performs an undo, all users see the same result.

### Implementation Details

#### Local History (Client)
Each client maintains a local history stack for UI responsiveness:
- Stores canvas state as data URLs
- Limited to 50 states
- Used for instant local feedback before server sync

#### Global History (Server)
Server maintains the authoritative history:
- Stores individual drawing actions
- Shared across all users in a room
- Undo removes from history, moves to redo stack
- New drawing clears redo stack

### Synchronization Flow

1. **User Action**: User clicks undo button
2. **Optimistic Update**: Local canvas immediately undoes
3. **Server Request**: Client emits 'undo' to server
4. **Server Processing**:
   - Validates user is in room
   - Modifies global history
   - Broadcasts 'undo' to ALL clients
5. **Global Sync**: All clients (including initiator) perform undo
6. **Convergence**: All canvases show identical state

### Edge Cases Handled

1. **Empty History**: Undo/redo ignored when no actions available
2. **Concurrent Operations**: Server processes sequentially; last action wins
3. **Mid-Drawing Undo**: Drawing in progress is not affected by undo
4. **New User Joins**: Receives full drawing history, cannot undo past their join point
5. **User Disconnects**: History preserved for remaining users

### Trade-offs

**Advantages**:
- Perfect synchronization across all users
- Simple mental model for users
- Consistent canvas state guaranteed

**Disadvantages**:
- One user can undo another user's work
- No per-user undo history
- Concurrent undos may be confusing

**Alternative Considered**: Per-user undo (rejected due to complexity and state divergence issues)

## State Management

### Client State
- Canvas bitmap (HTML5 Canvas)
- Local history stack (for undo/redo)
- Current tool settings (color, width, tool type)
- Remote cursors map
- User list

### Server State
- Room membership (RoomManager)
- Drawing history per room (DrawingStateManager)
- User metadata (username, color, cursor position)

### State Persistence
**Current**: In-memory only (lost on server restart)

**Production Considerations**:
- Add database persistence (PostgreSQL, MongoDB)
- Store drawing history periodically
- Implement room expiration policies
- Consider canvas snapshots for large histories

## Performance Optimizations

### Client-Side
1. **Throttling**: Cursor positions throttled to 20fps (50ms intervals)
2. **Batch Drawing**: Brush strokes sent per-point, rendered smoothly
3. **Canvas Snapshots**: Shape tools use snapshots to avoid full redraws
4. **Limited History**: 50-action limit prevents memory issues
5. **Image Scaling**: Automatic resize of large images to 300x300px

### Server-Side
1. **Room Isolation**: Events only broadcast within rooms
2. **Efficient Data Structures**: Maps for O(1) user lookups
3. **No Database Queries**: Pure in-memory operations
4. **Minimal Processing**: Server acts as message relay

### Network
1. **Binary Protocol**: Socket.io uses binary WebSocket when available
2. **Compression**: Socket.io includes built-in compression
3. **Selective Broadcast**: `socket.to(room)` excludes sender

## Security Considerations

### Current Implementation
- No authentication (users can set any username)
- No authorization (any user can perform any action)
- No input validation
- No rate limiting

### Production Requirements
1. **Authentication**: Add user login system
2. **Room Access Control**: Private rooms with passwords/invites
3. **Input Validation**: Sanitize all client inputs
4. **Rate Limiting**: Prevent spam/DoS attacks
5. **Content Moderation**: Filter inappropriate content
6. **Data Encryption**: HTTPS/WSS in production

## Scalability Considerations

### Current Limitations
- Single server instance
- In-memory state (no persistence)
- No horizontal scaling

### Scaling Strategy
1. **Load Balancing**:
   - Use Socket.io Redis adapter
   - Sticky sessions for WebSocket connections

2. **Database Layer**:
   - PostgreSQL for user data and room metadata
   - Redis for real-time state and caching
   - S3/CDN for image storage

3. **Microservices**:
   - Separate drawing service
   - User management service
   - Room management service

4. **Regional Deployment**:
   - Deploy servers in multiple regions
   - Route users to nearest server
   - Consider eventual consistency

## Future Enhancements

1. **Layers**: Multiple drawing layers with blending modes
2. **Permissions**: Room owners, read-only users, drawing permissions
3. **Export**: Save canvas as PNG/SVG/PDF
4. **Chat**: Text chat alongside drawing
5. **Version History**: Timeline view with branching
6. **Collaborative Cursors**: Show what tool others are using
7. **Drawing Playback**: Replay entire drawing history
8. **Mobile App**: Native iOS/Android apps
9. **AI Features**: Auto-complete, style transfer, smart selection
10. **Voice/Video**: Integrated communication

## Testing Strategy

### Unit Tests
- CanvasManager drawing operations
- RoomManager user management
- DrawingStateManager undo/redo logic

### Integration Tests
- WebSocket event flow
- Multi-user synchronization
- Room isolation

### E2E Tests
- Full user journey (join, draw, collaborate)
- Concurrent user scenarios
- Network failure recovery

### Performance Tests
- Load testing with multiple concurrent users
- Canvas rendering performance
- Memory leak detection

## Development Guidelines

### Code Organization
- Separate concerns: drawing, networking, UI
- Single responsibility per class
- Minimal coupling between components

### Naming Conventions
- Classes: PascalCase (e.g., `CanvasManager`)
- Methods: camelCase (e.g., `drawRemoteAction`)
- Events: kebab-case (e.g., `user-joined`)
- Files: kebab-case (e.g., `drawing-state.js`)

### Error Handling
- Graceful degradation on network failures
- User-friendly error messages
- Console logging for debugging
- No silent failures

## Deployment

### Development
```bash
npm install
node server/server.js
```

### Production
1. Set `NODE_ENV=production`
2. Use process manager (PM2, systemd)
3. Configure reverse proxy (nginx)
4. Enable HTTPS/WSS
5. Set up monitoring and logging
6. Configure CORS appropriately
7. Implement rate limiting
