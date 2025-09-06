# TESA Project - MQTT + MySQL Setup

This project sets up MQTT broker and MySQL database for Pi5 to backend server communication.

## What's Included

### MQTT Broker (Eclipse Mosquitto)
- **Port 1883**: Standard MQTT for Pi5 communication
- **Port 9001**: WebSocket for web applications
- **Anonymous access**: Enabled for easy testing
- **Persistence**: Messages saved when broker restarts

### MySQL Database
- **Database**: TESA
- **Users**:
  - `root` / `p@ssword` (admin access)
  - `user` / `p@ssword` (regular access)
- **Port**: 3306

## How to Start

1. Make sure Docker Desktop is running
2. Open terminal in this folder
3. Run: `docker-compose up -d`

## How to Stop

Run: `docker-compose down`

## Connection Details

### MQTT
- **Host**: localhost
- **Port**: 1883 (MQTT) or 9001 (WebSocket)
- **No authentication needed** (for testing)

### MySQL
- **Host**: localhost
- **Port**: 3306
- **Database**: TESA
- **Users**: 
  - root / p@ssword
  - user / p@ssword

## Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs mqtt
docker-compose logs mysql

# Restart services
docker-compose restart
```

## Next Steps for Pi5 Communication

1. **Pi5 (Publisher)**: Send sensor data to MQTT topics
2. **Backend Server (Subscriber)**: Listen to MQTT topics and save to MySQL
3. **Topics**: You can create topics like:
   - `pi5/sensors/temperature`
   - `pi5/sensors/humidity`
   - `pi5/status`

## File Structure

```
TESA/
├── docker-compose.yml
├── mqtt/
│   ├── config/
│   │   └── mosquitto.conf
│   ├── data/
│   └── log/
├── mysql/
│   └── init/
│       └── 01-init.sql
└── README.md
```
