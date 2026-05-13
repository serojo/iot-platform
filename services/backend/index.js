process.env.KAFKAJS_NO_PARTITIONER_WARNING = "1";

const { Kafka } = require("kafkajs");
const { Pool } = require("pg");
const axios = require("axios");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

//
// KAFKA
//
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER]
});

const consumer = kafka.consumer({
  groupId: "iot-group"
});

const producer = kafka.producer();

//
// POSTGRES
//
const pg = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
});

//
// JWT
//
const JWT_SECRET =
  process.env.JWT_SECRET || "super_secret_key_change_me";

//
// HTTP SERVER
//
const server = http.createServer(app);

//
// SOCKET.IO
//
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

//
// SOCKET AUTH
//
io.use((socket, next) => {

  try {

    const token =
      socket.handshake.auth.token;

    if (!token) {
      return next(new Error("missing token"));
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    socket.user = decoded;

    next();

  } catch (err) {

    next(new Error("invalid token"));

  }

});

//
// SOCKET CONNECTION
//
io.on("connection", (socket) => {

  console.log(
    "Frontend connected:",
    socket.user.username,
    socket.user.tenant
  );

  socket.on("disconnect", () => {

    console.log(
      "Frontend disconnected:",
      socket.user.username
    );

  });

});

//
// JWT AUTH MIDDLEWARE
//
function authMiddleware(req, res, next) {

  try {

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({
        error: "token missing"
      });

    }

    const token =
      authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (err) {

    return res.status(401).json({
      error: "invalid token"
    });

  }

}

//
// KAFKA CONSUMER
//
async function run() {

  await consumer.connect();

  await producer.connect();

  await consumer.subscribe({
    topic: "telemetry.normalized"
  });

  await consumer.run({

    eachMessage: async ({ message }) => {

      try {

        const d = JSON.parse(
          message.value.toString()
        );






        const tenant = d.tenant;



        //
        // VALIDACIONES
        //
        if (!d.device_id) {
          throw new Error("device_id missing");
        }

        if (!d.timestamp) {
          throw new Error("timestamp missing");
        }


	if (d.gps.lat < -90 || d.gps.lat > 90) {
	  throw new Error(`Invalid latitude: ${d.gps.lat}`);
	}

	if (d.gps.lon < -180 || d.gps.lon > 180) {
	  throw new Error(`Invalid longitude: ${d.gps.lon}`);
	}




        const deviceId = d.device_id;

        const lat = d.gps.lat;
        const lon = d.gps.lon;

        //
        // INSERT POSTGRESQL
        //
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

          VALUES (

            $1,
            $2,
            $3,
            $4,
            $5,
            $6,

            ST_SetSRID(
              ST_MakePoint($7,$8),
              4326
            )

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

        //
        // LATENCY
        //
        const latency =
          Date.now() - start;

        const deviceTime =
          new Date(d.timestamp).getTime();

        const e2eLatency =
          Date.now() - deviceTime;

        //
        // VICTORIAMETRICS
        //
        const payload =

`iot_messages_total{device_id="${deviceId}"} 1
iot_insert_latency_ms{device_id="${deviceId}"} ${latency}
iot_e2e_latency_ms{device_id="${deviceId}"} ${e2eLatency}
temp{device_id="${deviceId}"} ${d.sensors?.temperature ?? 0}
signal{device_id="${deviceId}"} ${d.network?.signal_dbm ?? 0}
`;

        await axios.post(

          process.env.VM_URL +
          "/api/v1/import/prometheus",

          payload,

          {
            headers: {
              "Content-Type": "text/plain"
            },
            timeout: 2000
          }

        );

        //
        // REALTIME SOCKET.IO
        //
        io.sockets.sockets.forEach((socket) => {

          if (
            socket.user?.tenant === tenant
          ) {

            socket.emit("device_update", {

              tenant,
              device_id: deviceId,
              lat,
              lon,

              temperatura:
                d.sensors?.temperature,

              humedad:
                d.sensors?.humidity,

              signal_dbm:
                d.network?.signal_dbm,

              timestamp:
                d.timestamp

            });

          }

        });

        console.log(
          "OK:",
          tenant,
          deviceId,
          "latency:",
          latency,
          "ms"
        );

      } catch (err) {

        console.error(
          "ERROR:",
          err.message
        );

        //
        // DLQ KAFKA
        //
        try {

          await producer.send({

            topic: "telemetria.error",

            messages: [

              {
                value: JSON.stringify({

                  error: err.message,

                  raw_payload:
                    message.value.toString(),

                  timestamp:
                    new Date().toISOString()

                })
              }

            ]

          });

        } catch (kafkaErr) {

          console.error(
            "DLQ ERROR:",
            kafkaErr.message
          );

        }

      }

    }

  });

}

//
// LOGIN
//
app.post("/login", async (req, res) => {

  try {

    const {
      username,
      password
    } = req.body;

    const result = await pg.query(
      `
      SELECT *
      FROM users
      WHERE username = $1
      `,
      [username]
    );

    if (result.rows.length === 0) {

      return res.status(401).json({
        error: "invalid credentials"
      });

    }

    const user = result.rows[0];

    const valid =
      bcrypt.compareSync(
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

//
// HEALTH
//
app.get("/health", (req, res) => {

  res.json({
    status: "ok",
    service: "iot-backend",
    timestamp: new Date().toISOString()
  });

});

//
// DEVICES LATEST
//
app.get(
  "/devices/latest",
  authMiddleware,
  async (req, res) => {

    try {

      const tenant =
        req.user.tenant;

      const query = `

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

        WHERE c.tenant = $1

        ORDER BY
          c.device_id,
          c.event_time DESC

      `;

      const result =
        await pg.query(query, [tenant]);

      res.json(result.rows);

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: err.message
      });

    }

  }
);

//
// DEVICE HISTORY
//
app.get(
  "/devices/:id/history",
  authMiddleware,
  async (req, res) => {

    try {

      const result = await pg.query(`

        SELECT

          c.event_time,

          ST_Y(c.geom) as lat,
          ST_X(c.geom) as lon,

          c.temperatura,
          c.humedad,
          c.signal_dbm

        FROM camiones c

        WHERE

          c.device_id = $1
          AND c.tenant = $2

        ORDER BY c.event_time ASC

        LIMIT 1000

      `, [

        req.params.id,
        req.user.tenant

      ]);

      res.json(result.rows);

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }

  }
);

//
// START SERVER
//
server.listen(3000, () => {
  console.log("API listening on port 3000");
});

//
// START KAFKA
//
run();
