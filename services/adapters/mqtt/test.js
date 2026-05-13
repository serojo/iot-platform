const {
  normalizeMqttMessage
} = require("./normalize");

const topic =
  "clientes/A/camiones/TRUCK001";

const payload = JSON.stringify({

  device_id: "TRUCK001",

  timestamp:
    new Date().toISOString(),

  gps: {
    lat: -34.6,
    lon: -58.4,
    speed_kmh: 80
  },

  network: {
    signal_dbm: -70
  },

  sensors: {
    temperature: 5,
    humidity: 40
  }

});

const result =
  normalizeMqttMessage(
    topic,
    payload
  );

console.log(
  JSON.stringify(result, null, 2)
);
