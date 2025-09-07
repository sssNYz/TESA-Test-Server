# 🚁 Drone Detection System

A complete Next.js application with backend MQTT processing and frontend visualization for real-time drone detection data.

## 🚀 Features

### Backend
- **MQTT Consumer**: Subscribes to drone detection topics and validates payloads
- **MySQL Storage**: Efficient batch inserts with Prisma ORM
- **Real-time Streaming**: SSE endpoints for live data
- **REST APIs**: Latest detection and history queries
- **In-memory Ring Buffers**: Fast live data access per camera
- **Health Monitoring**: Performance metrics and status endpoints

### Frontend
- **Live Visualization**: Canvas-based real-time drone detection overlay
- **SSE Streaming**: Auto-reconnecting live data stream
- **Camera Switching**: Multi-camera support with dropdown selector
- **Status Monitoring**: Connection status, latency, and detection metrics
- **Event Logging**: Debug log of recent detection events
- **Responsive Design**: Modern UI with Tailwind CSS and shadcn/ui

## 📋 Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- MySQL database (via Docker Compose)

## 🛠️ Setup

### 1. Environment Configuration

Copy the example environment file and update with your settings:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# MQTT Configuration
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_TOPIC=drone/detections/#

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=TESA
DB_USER=user
DB_PASS=p@ssword

# Performance Configuration
STREAM_PUSH_INTERVAL_MS=150
RING_BUFFER_SECONDS=10
BATCH_FLUSH_MS=150
BATCH_MAX_ROWS=200

# Database URL for Prisma
DATABASE_URL="mysql://user:p@ssword@localhost:3306/TESA"
```

### 2. Start Infrastructure Services

Start the MQTT broker and MySQL database:

```bash
cd ../TESA
docker-compose up -d
```

This starts:
- **Mosquitto MQTT Broker**: `localhost:1883` (TCP), `localhost:9001` (WebSocket)
- **MySQL Database**: `localhost:3306`

### 3. Database Setup

Generate Prisma client and run migrations:

```bash
npm install
npx prisma generate
npx prisma db push
```

### 4. Start the Server

Run the Next.js development server:

```bash
npm run dev
```

The server will start on `http://localhost:3000` and automatically:
- Connect to the MQTT broker
- Initialize database connections
- Start batch processing
- Set up ring buffers

### 5. Access the Frontend

- **Main page**: `http://localhost:3000` (server status and health metrics)
- **Dashboard**: `http://localhost:3000/dashboard` (live drone detection visualization)

The dashboard provides real-time visualization of drone detections with:
- Canvas-based overlay rendering
- Live SSE streaming with auto-reconnect
- Camera switching capabilities
- Detection status and metrics
- Event logging for debugging

## 📡 API Endpoints

### Live Stream (SSE)
```
GET /api/stream?camera_id=cam-01
```
Real-time Server-Sent Events stream for live drone detection data.

### Latest Detection
```
GET /api/latest?camera_id=cam-01
```
Get the most recent detection for a specific camera.

### History Query
```
GET /api/history?camera_id=cam-01&from=1757183600000&to=1757183660000&limit=2000
```
Query historical detection data within a time range.

### Health Metrics
```
GET /api/health
```
Server health status and performance metrics.

## 🧪 Testing

### 1. Test MQTT Message Publishing

Use `mosquitto_pub` to send test messages:

```bash
# Install mosquitto client tools
brew install mosquitto  # macOS
# or
sudo apt-get install mosquitto-clients  # Ubuntu

# Send a test detection message
mosquitto_pub -h localhost -t "drone/detections/cam-01" -m '{
  "ts": 1757183625615,
  "detected": true,
  "count": 2,
  "objects": [
    {
      "confidence": 0.787,
      "center": [0.219, 0.322],
      "bbox": [0.171, 0.274, 0.096, 0.096],
      "area": 0.0092
    },
    {
      "confidence": 0.766,
      "center": [0.214, 0.657],
      "bbox": [0.142, 0.585, 0.144, 0.144],
      "area": 0.0207
    }
  ]
}'
```

### 2. Continuous Testing

Send messages at ~10 Hz to simulate real camera data:

```bash
# Create a test script
cat > test_mqtt.sh << 'EOF'
#!/bin/bash
while true; do
  mosquitto_pub -h localhost -t "drone/detections/cam-01" -m "{
    \"ts\": $(date +%s)000,
    \"detected\": $((RANDOM % 2)),
    \"count\": $((RANDOM % 5)),
    \"objects\": []
  }"
  sleep 0.1  # 10 Hz
done
EOF

chmod +x test_mqtt.sh
./test_mqtt.sh
```

### 3. Test API Endpoints

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test latest detection
curl "http://localhost:3000/api/latest?camera_id=cam-01"

# Test history query
curl "http://localhost:3000/api/history?camera_id=cam-01&from=1757183600000&to=1757183660000&limit=100"

# Test SSE stream (in browser or with curl)
curl -N "http://localhost:3000/api/stream?camera_id=cam-01"
```

### 4. Verify Database

Check that data is being stored:

```bash
# Connect to MySQL
mysql -h localhost -P 3306 -u user -p TESA

# Check detections table
SELECT COUNT(*) FROM detections_raw;
SELECT * FROM detections_raw ORDER BY ts DESC LIMIT 5;
```

## 📊 Monitoring

### Health Dashboard
Visit `http://localhost:3000` to see the real-time health dashboard showing:
- Server status
- MQTT message counts (accepted/rejected)
- Queue sizes
- Ring buffer status

### Logs
Monitor server logs for:
- MQTT connection status
- Batch insert performance
- Validation errors
- SSE client connections

## 🔧 Configuration

### Performance Tuning

Adjust these environment variables for your needs:

- `STREAM_PUSH_INTERVAL_MS`: SSE push frequency (default: 150ms)
- `RING_BUFFER_SECONDS`: Memory buffer duration (default: 10s)
- `BATCH_FLUSH_MS`: Database batch interval (default: 150ms)
- `BATCH_MAX_ROWS`: Max rows per batch (default: 200)

### MQTT Topics

The server subscribes to `drone/detections/#` and supports:
- `drone/detections/cam-01` → camera_id: "cam-01"
- `drone/detections/cam-02` → camera_id: "cam-02"
- `drone/detections/` → camera_id: "cam-00" (default)

## 🚨 Troubleshooting

### Common Issues

1. **MQTT Connection Failed**
   - Check if Mosquitto is running: `docker ps`
   - Verify MQTT_HOST and MQTT_PORT in .env

2. **Database Connection Failed**
   - Check if MySQL is running: `docker ps`
   - Verify DATABASE_URL in .env
   - Run `npx prisma db push` to create tables

3. **No Data in Database**
   - Check MQTT message format matches the expected schema
   - Monitor server logs for validation errors
   - Verify topic subscription

4. **SSE Not Working**
   - Check browser developer tools for connection errors
   - Verify camera_id parameter
   - Check if data is flowing through ring buffers

### Logs

Enable detailed logging by setting:
```env
NODE_ENV=development
```

## 🔒 Production Considerations

### Security
- Enable MQTT authentication
- Use TLS for MQTT connections
- Implement API rate limiting
- Secure database credentials

### Performance
- Use connection pooling
- Implement database indexing
- Monitor memory usage
- Set up log rotation

### Reliability
- Implement MQTT QoS 1 for guaranteed delivery
- Add database retry logic
- Set up health checks
- Implement graceful shutdown

## 📝 Data Schema

### MQTT Payload Format
```json
{
  "ts": 1757183625615,
  "detected": true,
  "count": 2,
  "objects": [
    {
      "confidence": 0.787,
      "center": [0.219, 0.322],
      "bbox": [0.171, 0.274, 0.096, 0.096],
      "area": 0.0092
    }
  ]
}
```

### Database Tables

**detections_raw**: Main detection records
- `id`: Auto-increment primary key
- `camera_id`: Camera identifier
- `ts`: Event timestamp (ms)
- `recv_ts`: Server receive time (ms)
- `count`: Number of detected objects
- `payload`: Original JSON payload
- `msg_key`: Optional message key for idempotency

**detection_objects**: Individual object details (optional)
- `id`: Auto-increment primary key
- `camera_id`: Camera identifier
- `ts`: Event timestamp (ms)
- `object_idx`: Object index in the detection
- `confidence`: Detection confidence (0-1)
- `center_x`, `center_y`: Normalized center coordinates
- `bbox_x`, `bbox_y`, `bbox_w`, `bbox_h`: Bounding box
- `area`: Object area

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.