const { sendMetrics } = require("./metrics");
const { Kafka } = require("kafkajs");
const { Pool } = require("pg");
const axios = require("axios");

const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: "iot-group" });

const pg = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
});

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: "telemetria.bruta" });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const d = JSON.parse(message.value.toString());

        const lat = d.gps?.lat;
        const lon = d.gps?.lon;

        await pg.query(`
          INSERT INTO camiones (
            device_id, temperatura, humedad, signal_dbm, event_time, geom
          ) VALUES ($1,$2,$3,$4,$5,
            ST_SetSRID(ST_MakePoint($6,$7),4326)
          )
        `, [
          d.device_id,
          d.sensors?.temperature,
          d.sensors?.humidity,
          d.network?.signal_dbm,
          d.timestamp,
          lon,
          lat
        ]);

        // métricas
        await axios.post(process.env.VM_URL + "/api/v1/import/prometheus", `
temp{device="${d.device_id}"} ${d.sensors?.temperature}
signal{device="${d.device_id}"} ${d.network?.signal_dbm}
`);

        console.log("OK:", d.device_id);

      } catch (err) {
        console.error("ERROR:", err.message);
      }
    }
  });
}

run();
