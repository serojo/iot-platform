function normalizeMqttMessage(topic, payload) {

  const data = JSON.parse(payload);

  const parts = topic.split("/");

  const tenant = parts[1] || "default";

  return {

    tenant,

    device_id: data.device_id,

    timestamp:
      data.timestamp || new Date().toISOString(),

    gps: {

      lat: data.gps?.lat,

      lon: data.gps?.lon,

      speed_kmh:
        data.gps?.speed_kmh || 0

    },

    network: {

      signal_dbm:
        data.network?.signal_dbm || null

    },

    sensors: {

      temperature:
        data.sensors?.temperature || null,

      humidity:
        data.sensors?.humidity || null

    },

    raw_payload: data

  };

}

module.exports = {
  normalizeMqttMessage
};
