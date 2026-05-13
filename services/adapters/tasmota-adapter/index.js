process.env.KAFKAJS_NO_PARTITIONER_WARNING = "1";

const mqtt = require("mqtt");
const { Kafka } = require("kafkajs");

//
// MQTT
//
console.log(
  "Connecting MQTT:",
  process.env.MQTT_URL
);

const mqttClient = mqtt.connect(
  process.env.MQTT_URL
);

mqttClient.on("connect", () => {

  console.log("MQTT CONNECTED");

  mqttClient.subscribe("tele/+/STATE");

});

mqttClient.on("error", (err) => {

  console.error(
    "MQTT ERROR:",
    err.message
  );

});

mqttClient.on("offline", () => {

  console.log("MQTT OFFLINE");

});

mqttClient.on("reconnect", () => {

  console.log("MQTT RECONNECT");

});




//
// KAFKA
//
const kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER]
});

const producer = kafka.producer();

async function start() {

  await producer.connect();

  console.log(
    "Tasmota Adapter Started"
  );

  //
  // MQTT CONNECT
  //
  mqttClient.on("connect", () => {

    console.log(
      "MQTT connected"
    );

    mqttClient.subscribe(
      "tele/+/#"
    );

    mqttClient.subscribe(
      "stat/+/#"
    );



  });

  //
  // MQTT ERROR
  //
  mqttClient.on("error", (err) => {

    console.error(
      "MQTT ERROR:",
      err.message
    );

  });

  //
  // MQTT OFFLINE
  //
  mqttClient.on("offline", () => {

    console.log(
      "MQTT OFFLINE"
    );

  });

  //
  // MQTT RECONNECT
  //
  mqttClient.on("reconnect", () => {

    console.log(
      "MQTT RECONNECT"
    );

  });

  //
  // RECEIVE MQTT
  //
  mqttClient.on(
    "message",
    async (topic, payload) => {

      console.log(
        "MQTT MESSAGE:",
        topic,
        payload.toString()
      );


      try {

        const raw =
          JSON.parse(
            payload.toString()
          );

        //
        // TOPIC
        // tele/device/SENSOR
        //
        const parts =
          topic.split("/");

        const deviceId =
          parts[1];

        //
        // TEMPERATURE/HUMIDITY
        //
        let temperature = null;
        let humidity = null;

        //
        // SI7021
        //
        if (raw.SI7021) {

          temperature =
            raw.SI7021.Temperature;

          humidity =
            raw.SI7021.Humidity;

        }

        //
        // AM2301
        //
        if (raw.AM2301) {

          temperature =
            raw.AM2301.Temperature;

          humidity =
            raw.AM2301.Humidity;

        }

        //
        // DHT11 / DHT22
        //
        if (raw.DHT11) {

          temperature =
            raw.DHT11.Temperature;

          humidity =
            raw.DHT11.Humidity;

        }

        //
        // NORMALIZED
        //
        const normalized = {

          tenant: "A",

          device_id: deviceId,

          timestamp:
            raw.Time ||
            new Date().toISOString(),

	  device_type: "switch",

	  state: {

	    power:
	      raw.POWER || null
	  },

	  network: {

	    signal_dbm:
	      raw.Wifi?.Signal ||
	      raw.Wifi?.RSSI

  	},


	  metadata: {

	    source: "tasmota",

	    vendor: "sonoff",

	    model:
	      raw.Module || "generic"

	  },

	  raw_payload: raw

	};



        //
        // SEND TO KAFKA
        //
        await producer.send({

          topic:
            "telemetry.normalized",

          messages: [
            {
              value:
                JSON.stringify(
                  normalized
                )
            }
          ]

        });

        console.log(
          "NORMALIZED:",
          JSON.stringify(
            normalized,
            null,
            2
          )
        );

      } catch (err) {

        console.error(
          "ERROR:",
          err.message
        );

      }

    }
  );

}

start();
