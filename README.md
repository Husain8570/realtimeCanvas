# Real-Time Collaborative Drawing App

A multi-user collaborative drawing application with real-time synchronization, built with vanilla JavaScript, HTML5 Canvas, and Socket.io.

## Features

- **Drawing Tools**: Brush, eraser, line, rectangle, circle, text, and image insertion
- **Customization**: Color picker with presets, adjustable stroke width (1-50px)
- **Real-Time Collaboration**: Multiple users can draw simultaneously on the same canvas
- **User Awareness**: See other users' cursors in real-time and view the online users list
- **Global Undo/Redo**: Synchronized undo/redo functionality across all connected users
- **Dark Theme UI**: Professional dark interface optimized for extended use
- **Smooth Rendering**: Optimized canvas operations for smooth drawing experience
- **Keyboard Shortcuts**: Quick access to tools and actions

## Tech Stack

### Frontend
- Vanilla JavaScript (ES6+)
- HTML5 Canvas API
- CSS3 (Dark Theme)
- Socket.io Client

### Backend
- Node.js
- Express
- Socket.io Server

## Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server/server.js
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Using Custom Rooms

You can create or join specific rooms by adding query parameters:

```
http://localhost:3000?room=myroom&username=John
```

- `room`: Room ID (default: "default")
- `username`: Your display name (default: random "UserXXX")

## Usage

### Drawing Tools

- **Brush (B)**: Freehand drawing with selected color
- **Eraser (E)**: Erase parts of the drawing
- **Line (L)**: Draw straight lines
- **Rectangle (R)**: Draw rectangles
- **Circle (C)**: Draw circles
- **Text (T)**: Add text to the canvas
- **Image (I)**: Upload and place images

### Controls

- **Color Picker**: Click to select any color, or use preset colors
- **Stroke Width**: Adjust brush/shape thickness (1-50px)
- **Undo (Ctrl+Z)**: Undo the last action globally
- **Redo (Ctrl+Y)**: Redo the last undone action
- **Clear**: Clear the entire canvas (prompts for confirmation)

### Keyboard Shortcuts

- `B` - Switch to Brush tool
- `E` - Switch to Eraser tool
- `L` - Switch to Line tool
- `R` - Switch to Rectangle tool
- `C` - Switch to Circle tool
- `T` - Switch to Text tool
- `I` - Switch to Image tool
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo

## Project Structure

```
project/
├── client/
│   ├── index.html          # Main HTML structure
│   ├── style.css           # Dark theme styling
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client communication
│   └── main.js             # Main application logic
├── server/
│   ├── server.js           # Express + Socket.io server
│   ├── rooms.js            # Room management
│   └── drawing-state.js    # Drawing state management
├── package.json
└── README.md
```

## Known Issues

1. **Canvas Synchronization Lag**: On slow networks, there may be a slight delay in synchronizing drawing actions between users. This is due to network latency and is expected behavior.

2. **Image Loading**: Large images are automatically scaled down to 300x300px to maintain performance. Original aspect ratios are preserved.

3. **History Limitations**: Canvas history is limited to 50 actions to prevent memory issues. Older actions beyond this limit cannot be undone.

4. **Browser Compatibility**: Best performance on modern browsers (Chrome, Firefox, Safari, Edge). Canvas rendering may vary slightly across browsers.

5. **Mobile Support**: Touch events are supported but the experience is optimized for desktop use with mouse input.

6. **Room Persistence**: Drawing state is stored in server memory and will be lost when the server restarts. For production use, consider implementing database persistence.

7. **Concurrent Undo/Redo**: When multiple users undo/redo simultaneously, the order of operations follows the server's processing sequence, which may occasionally produce unexpected results.

8. **Text Tool**: Text is rendered at position where clicked, not where modal appears. Font size scales with stroke width (width × 8).

## Performance Tips

- Keep stroke width reasonable (1-20px) for smooth drawing
- Avoid uploading very large images
- Use keyboard shortcuts for faster tool switching
- Clear canvas periodically for better performance with complex drawings

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License
