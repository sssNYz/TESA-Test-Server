# Drone Detection Frontend

A Next.js frontend for visualizing real-time drone detection data with smooth canvas overlays and SSE streaming.

## Features

### 🎯 Core Components
- **LiveView**: Canvas-based visualization with bounding box overlays
- **StatusBar**: Connection status, detection count, confidence, and latency
- **CameraSelector**: Dropdown to switch between camera feeds
- **EventLog**: Debug log of recent detection events

### 🚀 Key Features
- **Real-time SSE streaming** with auto-reconnect
- **Canvas rendering** for smooth performance (5-10 FPS)
- **Bounding box smoothing** to reduce jitter
- **Connection status indicators** with retry attempts
- **Responsive design** with Tailwind CSS
- **TypeScript** for type safety

## Usage

### Starting the Frontend
```bash
npm run dev
```

Then visit:
- **Main page**: http://localhost:3000 (server status)
- **Dashboard**: http://localhost:3000/dashboard (live visualization)

### API Endpoints Used
- `GET /api/latest?camera_id=...` - Get initial frame
- `GET /api/stream?camera_id=...` - SSE stream for live updates
- `GET /api/history?camera_id=...&from=...&to=...` - Historical data

## Component Architecture

### LiveView Component
- Uses HTML5 Canvas for smooth rendering
- Implements frame rate limiting (8 FPS max)
- Smooths bounding box positions over 3 frames
- Shows "No detections" overlay after 2 seconds
- Displays detection count and confidence labels

### SSE Client
- Auto-reconnect with exponential backoff
- Handles connection drops gracefully
- Supports camera switching
- Provides connection status callbacks

### Data Flow
1. **Initial Load**: Fetch latest detection via `/api/latest`
2. **Live Stream**: Connect to SSE stream via `/api/stream`
3. **Canvas Updates**: Render bounding boxes on canvas overlay
4. **Event Logging**: Track recent events for debugging

## Performance Optimizations

- **Canvas Rendering**: Avoids heavy DOM updates
- **Frame Rate Limiting**: Caps rendering at 8 FPS
- **Bounding Box Smoothing**: Reduces visual jitter
- **Event Cleanup**: Proper cleanup of timers and SSE connections
- **Memory Management**: Limits event log to 50 entries

## Styling

Uses Tailwind CSS with shadcn/ui components:
- Clean, modern design
- Dark mode support
- Responsive layout
- Accessible color contrasts

## Testing

To test the complete system:

1. **Start Backend**: Ensure MQTT and MySQL are running
2. **Start Frontend**: `npm run dev`
3. **Open Dashboard**: Navigate to `/dashboard`
4. **Verify Features**:
   - Initial frame loads from `/api/latest`
   - Live updates via SSE stream
   - Camera switching works
   - Connection status indicators
   - Event logging

## Browser Support

- Modern browsers with Canvas support
- EventSource (SSE) support required
- TypeScript compilation to ES2017+
