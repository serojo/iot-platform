import { useEffect, useState } from "react";
import axios from "axios";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";


// Fix iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export default function FleetMap({
  token,
  socket,
  onLogout
}) {

  const [devices, setDevices] = useState({});

async function loadDevices() {

  try {

    const response = await axios.get(
      "http://192.168.10.15:3000/devices/latest",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const devicesMap = {};

    response.data.forEach((d) => {

      devicesMap[d.device_id] = d;

    });

    setDevices(devicesMap);

  } catch (err) {

    console.error(err);

  }

}
useEffect(() => {

  loadDevices();

socket.on("device_update", (device) => {

  setDevices((prev) => ({

    ...prev,

    [device.device_id]: device

  }));

});

  return () => {
    socket.off("device_update");
  };

}, []);


  return (

    <div>

      <div className="topbar">

        <h2>Fleet Dashboard</h2>

        <button onClick={onLogout}>
          Logout
        </button>

      </div>

      <MapContainer
        center={[-34.6, -58.38]}
        zoom={7}
        style={{
          height: "90vh",
          width: "100%"
        }}
      >

        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {Object.values(devices).map((d) => (

          <Marker
            key={d.device_id}
            position={[d.lat, d.lon]}
          >

            <Popup>

              <b>{d.alias || d.device_id}</b>
	      <br />
	      Chofer: {d.driver_name}

	      <br />
	      Patente: {d.vehicle_plate}

	      <br />
	      Grupo: {d.group_name}

              <br />

              Tenant: {d.tenant}

              <br />

              Temp: {d.temperatura}

              <br />

              Hum: {d.humedad}

              <br />

              Signal: {d.signal_dbm}

            </Popup>

          </Marker>

        ))}

      </MapContainer>

    </div>

  );

}
