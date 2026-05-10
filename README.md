# IoT Fleet Platform

Plataforma SaaS IoT para tracking y telemetría vehicular.

---

# Stack Tecnológico

## Backend
- Node.js
- Express
- KafkaJS
- PostgreSQL/PostGIS
- VictoriaMetrics

## Frontend
- React
- Vite
- Leaflet
- TailwindCSS

## Infraestructura
- Docker
- Mosquitto MQTT
- Redpanda Kafka

---

# Features

- GPS Tracking
- Multi-tenant
- JWT Authentication
- Device Management
- Real-time Telemetry
- Historical Routes
- Metrics & Monitoring
- Kafka DLQ
- PostGIS Geospatial Queries

---

# Arquitectura

MQTT → Kafka → Backend → PostgreSQL/PostGIS → Frontend

---

# Levantar entorno

```bash
docker compose up -d
```

---

# Roadmap

- Realtime WebSockets
- Alerts Engine
- Geofencing
- OTA Firmware
- Mobile App
- Predictive Maintenance
- Kubernetes
- CI/CD
