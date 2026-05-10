# IoT Realtime Platform

Plataforma SaaS IoT multi-tenant para tracking, telemetría y monitoreo en tiempo real.

La plataforma permite ingestión de datos MQTT, streaming con Kafka, almacenamiento geoespacial con PostGIS y visualización realtime mediante WebSockets y React.

---

# Features

## Core Features

- MQTT Telemetry Ingestion
- Kafka Streaming Pipeline
- Multi-tenant Architecture
- JWT Authentication
- Real-time WebSockets
- Live GPS Tracking
- Historical Routes
- Device Management
- Geospatial Queries with PostGIS
- Metrics & Monitoring
- Kafka Dead Letter Queue (DLQ)

---

# Arquitectura

```text
Devices
   ↓
MQTT Broker (Mosquitto)
   ↓
Redpanda / Kafka
   ↓
Node.js Backend
   ↓
PostgreSQL + PostGIS
   ↓
Socket.IO Realtime
   ↓
React Frontend
