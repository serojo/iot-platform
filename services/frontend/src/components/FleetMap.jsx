import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import { useEffect, useState } from "react";

import axios from "axios";

import L from "leaflet";

import {
  FaTruck,
  FaSignal,
  FaThermometerHalf,
  FaSignOutAlt
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const truckIcon = new L.Icon({
  iconUrl:
    "https://cdn-icons-png.flaticon.com/512/744/744465.png",

  iconSize: [32, 32],

  iconAnchor: [16, 32]
});

export default function FleetMap({
  token,
  onLogout,
  socket
}) {

  const [devices, setDevices] = useState({});

  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {

    loadDevices();

  }, []);  

async function loadDevices() {

    try {

      const response = await axios.get(
        `${API_URL}/devices/latest`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const map = {};

      response.data.forEach((d) => {
        map[d.device_id] = d;
      });

      setDevices(map);

    } catch (err) {

      console.error(err);

    }

  }

  useEffect(() => {

    if (!socket) return;

    socket.on("device_update", (data) => {

      setDevices((prev) => ({
        ...prev,
        [data.device_id]: {
          ...prev[data.device_id],
          ...data
        }
      }));

    });

    return () => {
      socket.off("device_update");
    };

  }, [socket]);

  function getLastSeen(ts) {

    if (!ts) return "unknown";

    const diff = Math.floor(
      (Date.now() - new Date(ts)) / 1000
    );

    if (diff < 60) {
      return `${diff}s ago`;
    }

    if (diff < 3600) {
      return `${Math.floor(diff / 60)}m ago`;
    }

    return `${Math.floor(diff / 3600)}h ago`;

  }

  return (

    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#111827",
        color: "white"
      }}
    >

      {/* SIDEBAR */}
      <div
        style={{
          width: "340px",
          background: "#1f2937",
          padding: "20px",
          overflowY: "auto",
          borderRight: "1px solid #374151"
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
          }}
        >

          <h2>
            Fleet Control
          </h2>

          <button
            onClick={onLogout}
            style={{
              background: "#dc2626",
              border: "none",
              color: "white",
              padding: "8px 12px",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            <FaSignOutAlt />
          </button>

        </div>

        <div
          style={{
            marginBottom: "15px",
            fontSize: "14px",
            opacity: 0.7
          }}
        >
          Active Vehicles: {Object.keys(devices).length}
        </div>

        {
          Object.values(devices).map((d) => (

            <div
              key={d.device_id}
              onClick={() => setSelectedDevice(d.device_id)}
              style={{
                background:
                  selectedDevice === d.device_id
                    ? "#2563eb"
                    : "#374151",

                padding: "15px",
                borderRadius: "12px",
                marginBottom: "12px",
                cursor: "pointer"
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px"
                }}
              >

                <div>
                  <FaTruck /> {d.device_id}
                </div>

                <div
                  style={{
                    color: "#22c55e",
                    fontSize: "12px"
                  }}
                >
                  ONLINE
                </div>

              </div>

              <div
                style={{
                  fontSize: "13px",
                  opacity: 0.8
                }}
              >

                <div>
                  <FaThermometerHalf /> Temp: {d.temperatura}°C
                </div>

                <div>
                  <FaSignal /> Signal: {d.signal_dbm} dBm
                </div>

                <div>
                  Last Seen: {getLastSeen(d.timestamp)}
                </div>

              </div>

            </div>
          ))
        }

      </div>

      {/* MAP */}
      <div style={{ flex: 1 }}>

        <MapContainer
          center={[-34.6, -58.38]}
          zoom={7}
          style={{
            height: "100vh",
            width: "100%"
          }}
        >

          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {
            Object.values(devices).map((d) => (

              <Marker
                key={d.device_id}
                position={[d.lat, d.lon]}
                icon={truckIcon}
              >

                <Popup>

                  <div>

                    <h3>{d.device_id}</h3>

                    <hr />

                    <p>
                      🌡 Temp: {d.temperatura}°C
                    </p>

                    <p>
                      📶 Signal: {d.signal_dbm} dBm
                    </p>

                    <p>
                      💧 Humidity: {d.humedad}%
                    </p>

                    <p>
                      🕒 {d.timestamp}
                    </p>

                  </div>

                </Popup>

              </Marker>

            ))
          }

        </MapContainer>

      </div>

    </div>

  );

}
