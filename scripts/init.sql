-- ==========================================
-- PostGIS
-- ==========================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ==========================================
-- TELEMETRIA
-- ==========================================

CREATE TABLE IF NOT EXISTS camiones (

    id BIGSERIAL PRIMARY KEY,

    tenant TEXT NOT NULL,

    device_id TEXT NOT NULL,

    temperatura NUMERIC,
    humedad NUMERIC,
    signal_dbm NUMERIC,

    event_time TIMESTAMPTZ,

    geom GEOMETRY(Point, 4326),

    created_at TIMESTAMPTZ DEFAULT NOW()

);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_camiones_device
ON camiones(device_id);

CREATE INDEX IF NOT EXISTS idx_camiones_tenant
ON camiones(tenant);

CREATE INDEX IF NOT EXISTS idx_camiones_event_time
ON camiones(event_time DESC);

CREATE INDEX IF NOT EXISTS idx_camiones_geom
ON camiones
USING GIST (geom);

-- ==========================================
-- USERS
-- ==========================================

CREATE TABLE IF NOT EXISTS users (

    id BIGSERIAL PRIMARY KEY,

    username TEXT UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    tenant TEXT NOT NULL,

    role TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

-- ==========================================
-- DEVICES
-- ==========================================

CREATE TABLE IF NOT EXISTS devices (

    id BIGSERIAL PRIMARY KEY,

    tenant TEXT NOT NULL,

    device_id TEXT UNIQUE NOT NULL,

    alias TEXT,
    description TEXT,

    vehicle_plate TEXT,
    driver_name TEXT,
    group_name TEXT,

    active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

-- ==========================================
-- DEFAULT USERS
-- password: admin123
-- ==========================================

INSERT INTO users (
    username,
    password_hash,
    tenant,
    role
)
VALUES
(
    'adminA',
    '$2b$10$JFALwBwdbRGI.CDrDNjmYOcCs78h4bPvXV0gqOOa9WylNChhm8ks2',
    'A',
    'admin'
),
(
    'adminB',
    '$2b$10$JFALwBwdbRGI.CDrDNjmYOcCs78h4bPvXV0gqOOa9WylNChhm8ks2',
    'B',
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- ==========================================
-- DEFAULT DEVICES
-- ==========================================

INSERT INTO devices (
    tenant,
    device_id,
    alias,
    vehicle_plate,
    driver_name,
    group_name
)
VALUES
(
    'A',
    'WLINK_R130_001',
    'Camion Refrigerado 1',
    'AA111AA',
    'Carlos',
    'Frio Norte'
),
(
    'B',
    'WLINK_R130_002',
    'Camion Refrigerado 2',
    'BB222BB',
    'Miguel',
    'Frio Sur'
)
ON CONFLICT (device_id) DO NOTHING;
