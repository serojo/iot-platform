const axios = require("axios");

const VM_URL = process.env.VM_URL || "http://victoriametrics:8428";

async function sendMetrics(deviceId, latency) {
  try {
    // ⚠️ IMPORTANTE: tiene que ser texto + salto de línea
    const payload =
`iot_messages_total{device_id="${deviceId}"} 1
iot_insert_latency_ms{device_id="${deviceId}"} ${latency}
`;

    await axios.post(
      `${VM_URL}/api/v1/import/prometheus`,
      payload,
      {
        headers: { "Content-Type": "text/plain" },
        timeout: 2000
      }
    );

  } catch (err) {
    console.error("❌ Error enviando métricas:", err.message);
  }
}

module.exports = { sendMetrics };
