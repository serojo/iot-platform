const { Kafka } = require("kafkajs");
const { Pool } = require("pg");
const axios = require("axios");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: "iot-group" });
const producer = kafka.producer();

const pg = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
});

const JWT_SECRET = "super_secret_key_change_me";

async function run() {
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: "telemetria.bruta" });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const d = JSON.parse(message.value.toString());


	// extraer tenant desde MQTT topic
	const mqttTopicHeader = message.headers?.mqtt_topic;

	let tenant = "default";

	if (mqttTopicHeader) {
	  const topic = mqttTopicHeader.toString();

	  // clientes/A/camiones/WLINK_R130_001
	  const parts = topic.split("/");

	  if (parts.length >= 2) {
	    tenant = parts[1];
 	  }
	 }



        if (!d.device_id) {
          throw new Error("device_id missing");
        }

        if (!d.timestamp) {
          throw new Error("timestamp missing");
        }

	if (d.gps?.lat == null || d.gps?.lon == null) {
          throw new Error("gps missing");
        }

	const deviceId = d.device_id;

        const lat = d.gps?.lat;
        const lon = d.gps?.lon;

        const start = Date.now();

        await pg.query(`
         INSERT INTO camiones (
 	 tenant,
 	 device_id,
 	 temperatura,
  	 humedad,
 	 signal_dbm,
 	 event_time,
  	 geom
	 )

         VALUES ($1,$2,$3,$4,$5,$6,
 	 ST_SetSRID(ST_MakePoint($7,$8),4326)
	 )


        `, [
	  tenant,
          deviceId,
          d.sensors?.temperature ?? null,
          d.sensors?.humidity ?? null,
          d.network?.signal_dbm ?? null,
          d.timestamp,
          lon,
          lat
        ]);

        const latency = Date.now() - start;

        const deviceTime = new Date(d.timestamp).getTime();
        const e2eLatency = Date.now() - deviceTime;

        const payload =
`iot_messages_total{device_id="${deviceId}"} 1
iot_insert_latency_ms{device_id="${deviceId}"} ${latency}
iot_e2e_latency_ms{device_id="${deviceId}"} ${e2eLatency}
temp{device_id="${deviceId}"} ${d.sensors?.temperature ?? 0}
signal{device_id="${deviceId}"} ${d.network?.signal_dbm ?? 0}
`;

        await axios.post(
          process.env.VM_URL + "/api/v1/import/prometheus",
          payload,
          {
            headers: { "Content-Type": "text/plain" },
            timeout: 2000
          }
        );

	console.log(
	  "OK:",
	  tenant,
	  deviceId,
	  "latency:",
	  latency,
	  "ms"
	);

      } catch (err) {

        console.error("ERROR:", err.message);

        try {

          await producer.send({
            topic: "telemetria.error",
            messages: [
              {
                value: JSON.stringify({
                  error: err.message,
                  raw_payload: message.value.toString(),
                  timestamp: new Date().toISOString()
                })
               }
              ]
            });

          } catch (kafkaErr) {

            console.error("DLQ ERROR:", kafkaErr.message);

          }
      }
    }
  });
}


app.use(express.json());

app.post("/login", async (req, res) => {

  try {

    const { username, password } = req.body;

    const result = await pg.query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "invalid credentials"
      });
    }

    const user = result.rows[0];

    const valid = bcrypt.compareSync(
      password,
      user.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        error: "invalid credentials"
      });
    }

    const token = jwt.sign(
      {
        user_id: user.id,
        username: user.username,
        tenant: user.tenant,
        role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: "24h"
      }
    );

    res.json({
      token,
      tenant: user.tenant,
      role: user.role
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});


function authMiddleware(req, res, next) {

  try {

    // leer header Authorization
    const authHeader = req.headers.authorization;

    // validar existencia
    if (!authHeader) {

      return res.status(401).json({
        error: "token missing"
      });

    }

    // formato:
    // Bearer eyJhbGci...
    const token = authHeader.split(" ")[1];

    // validar JWT
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    // guardar usuario en request
    req.user = decoded;

    next();

  } catch (err) {

    return res.status(401).json({
      error: "invalid token"
    });

  }

}










app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "iot-backend",
    timestamp: new Date().toISOString()
  });
});




app.get("/devices/latest", async (req, res) => {

  try {

    const tenant = req.query.tenant;

    let query = `

      SELECT DISTINCT ON (c.device_id)

        c.tenant,
        c.device_id,

        d.alias,
        d.description,
        d.vehicle_plate,
        d.driver_name,
        d.group_name,
        d.active,

        c.event_time,
        c.temperatura,
        c.humedad,
        c.signal_dbm,

        ST_Y(c.geom) as lat,
        ST_X(c.geom) as lon

      FROM camiones c

      LEFT JOIN devices d
      ON c.device_id = d.device_id

    `;

    const params = [];

    if (tenant) {

      query += `
        WHERE c.tenant = $1
      `;

      params.push(tenant);

    }

    query += `
      ORDER BY c.device_id, c.event_time DESC
    `;

    const result = await pg.query(query, params);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

});



app.get("/devices/:id/history", async (req, res) => {

  try {

    const result = await pg.query(`
      SELECT
        event_time,
        ST_Y(geom) as lat,
        ST_X(geom) as lon,
        temperatura,
        humedad,
        signal_dbm
      FROM camiones
      WHERE device_id = $1
      ORDER BY event_time ASC
      LIMIT 1000
    `, [req.params.id]);

    res.json(result.rows);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});


app.listen(3000, () => {
  console.log("API listening on port 3000");
});


run();
