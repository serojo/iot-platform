import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

import {
  useEffect,
  useState
} from "react";

import axios from "axios";

import L from "leaflet";

import {
  FaTruck,
  FaSignal,
  FaThermometerHalf,
  FaSignOutAlt,
  FaSearch,
  FaWifi
} from "react-icons/fa";

const API_URL =
  import.meta.env.VITE_API_URL;

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

  //
  // STATE
  //
  const [devices, setDevices] =
    useState({});

  const [events, setEvents] =
    useState([]);

  const [selectedDevice, setSelectedDevice] =
    useState(null);

  //
  // TOTALS
  //
  const totalVehicles =
    Object.keys(devices).length;

  const onlineVehicles =
    Object.values(devices).filter(
      (d) => d.online === true
    ).length;

  //
  // FILTER EVENTS
  //
  const filteredEvents =
    selectedDevice

      ? events.filter(
          (e) =>
            e.device_id === selectedDevice
        )

      : events;

  //
  // LOAD DEVICES
  //
  useEffect(() => {

    loadDevices();

  }, []);

  async function loadDevices() {

    try {

      const response = await axios.get(

        `${API_URL}/devices/latest`,

        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }

      );

      const map = {};

      response.data.forEach((d) => {

        map[d.device_id] = {

          ...d,

          online: true

        };

      });

      setDevices(map);

    } catch (err) {

      console.error(err);

    }

  }

  //
  // SOCKET EVENTS
  //
  useEffect(() => {

    if (!socket) return;

    //
    // DEVICE UPDATE
    //
    socket.on(
      "device_update",
      (data) => {

        setDevices((prev) => ({

          ...prev,

          [data.device_id]: {

            ...prev[data.device_id],

            ...data,

            online: true

          }

        }));

      }
    );

    //
    // DEVICE EVENT
    //
    socket.on(
      "device_event",
      (event) => {

        console.log(
          "EVENT:",
          event
        );

        setEvents((prev) => {

          const updated = [

            event,

            ...prev

          ];

          return updated.slice(0, 200);

        });

      }
    );

    //
    // CLEANUP
    //
    return () => {

      socket.off("device_update");

      socket.off("device_event");

    };

  }, [socket]);

  //
  // LAST SEEN
  //
  function getLastSeen(ts) {

    if (!ts) {
      return "unknown";
    }

    const diff = Math.floor(

      (
        Date.now() -
        new Date(ts)
      ) / 1000

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
          borderRight:
            "1px solid #374151"
        }}
      >

        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
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

        {/* ACTIVE */}
        <div
          style={{
            marginBottom: "15px",
            fontSize: "14px",
            opacity: 0.7
          }}
        >

          Active Vehicles:
          {" "}
          {totalVehicles}

        </div>

        {/* SEARCH */}
        <div
          style={{
            marginTop: "15px",
            marginBottom: "20px",
            position: "relative"
          }}
        >

          <FaSearch
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              color: "#9ca3af"
            }}
          />

          <input

            placeholder=
              "Buscar vehículo..."

            style={{

              width: "100%",

              padding:
                "10px 10px 10px 36px",

              borderRadius: "10px",

              border: "none",

              background: "#111827",

              color: "white"

            }}
          />

        </div>

        {/* DEVICES */}
        {

          Object.values(devices).map((d) => (

            <div

              key={d.device_id}

              onClick={() =>
                setSelectedDevice(
                  d.device_id
                )
              }

              style={{

                background:

                  selectedDevice ===
                  d.device_id

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
                  justifyContent:
                    "space-between",
                  marginBottom: "10px"
                }}
              >

                <div>
                  <FaTruck />
                  {" "}
                  {d.device_id}
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
                  <FaThermometerHalf />
                  {" "}
                  Temp:
                  {" "}
                  {d.temperatura}°C
                </div>

                <div>
                  <FaSignal />
                  {" "}
                  Signal:
                  {" "}
                  {d.signal_dbm} dBm
                </div>

                <div>
                  Last Seen:
                  {" "}
                  {getLastSeen(
                    d.timestamp
                  )}
                </div>

              </div>

            </div>

          ))

        }

      </div>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column"
        }}
      >

        {/* TOPBAR */}
        <div
          className="topbar"
          style={{
            display: "flex",
            gap: "20px",
            padding: "15px",
            background: "#0f172a",
            borderBottom:
              "1px solid #1e293b"
          }}
        >

          <div
            className="stat-card"
            style={{
              background: "#1e293b",
              padding: "15px",
              borderRadius: "12px",
              minWidth: "160px"
            }}
          >

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >

              <FaTruck />

              <div>

                <h4
                  style={{
                    margin: 0
                  }}
                >
                  Total Vehículos
                </h4>

                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold"
                  }}
                >
                  {totalVehicles}
                </span>

              </div>

            </div>

          </div>

          <div
            className="stat-card"
            style={{
              background: "#1e293b",
              padding: "15px",
              borderRadius: "12px",
              minWidth: "160px"
            }}
          >

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >

              <FaWifi />

              <div>

                <h4
                  style={{
                    margin: 0
                  }}
                >
                  Online
                </h4>

                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold"
                  }}
                >
                  {onlineVehicles}
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* MAP */}
        <div
          style={{
            flex: 1
          }}
        >

          <MapContainer

            center={[-34.6, -58.38]}

            zoom={10}

            style={{
              height: "100%",
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

                  position={[
                    d.lat,
                    d.lon
                  ]}

                  icon={truckIcon}

                >

                  <Popup>

                    <div>

                      <h3>
                        {d.device_id}
                      </h3>

                      <hr />

                      <p>
                        🌡 Temp:
                        {" "}
                        {d.temperatura}°C
                      </p>

                      <p>
                        📶 Signal:
                        {" "}
                        {d.signal_dbm} dBm
                      </p>

                      <p>
                        💧 Humidity:
                        {" "}
                        {d.humedad}%
                      </p>

                      <p>
                        🕒
                        {" "}
                        {d.timestamp}
                      </p>

                    </div>

                  </Popup>

                </Marker>

              ))

            }

          </MapContainer>

        </div>

        {/* EVENTS */}
        <div
          style={{
            height: "30vh",
            background: "#0f172a",
            borderTop:
              "1px solid #1e293b",
            overflowY: "auto",
            padding: "12px",
            fontFamily: "monospace"
          }}
        >

          <div
            style={{
              marginBottom: "10px",
              fontWeight: "bold",
              color: "#22c55e"
            }}
          >

            REALTIME EVENTS

            {
              selectedDevice &&
              ` — ${selectedDevice}`
            }

          </div>

          {

            filteredEvents.map(
              (e, idx) => (

                <div

                  key={idx}

                  style={{

                    padding: "8px",

                    marginBottom: "6px",

                    borderRadius: "8px",

                    background:

                      e.type === "power"

                        ? "#1e3a8a"

                        : "#14532d",

                    fontSize: "13px"

                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between"
                    }}
                  >

                    <span>
                      [
                      {e.type.toUpperCase()}
                      ]
                    </span>

                    <span
                      style={{
                        opacity: 0.7
                      }}
                    >
                      {e.timestamp}
                    </span>

                  </div>

                  <div
                    style={{
                      marginTop: "4px"
                    }}
                  >
                    {e.message}
                  </div>

                </div>

              )
            )

          }

        </div>

      </div>

    </div>

  );

}
