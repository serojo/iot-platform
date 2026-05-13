process.env.KAFKAJS_NO_PARTITIONER_WARNING = "1";

const { Kafka } = require("kafkajs");

const {
  normalizeMqttMessage
} = require("./normalize");

const kafka = new Kafka({
  brokers: ["redpanda:9092"]
});

const consumer = kafka.consumer({
  groupId: "mqtt-normalizer-group"
});

const producer = kafka.producer();

async function run() {

  await consumer.connect();

  await producer.connect();

  await consumer.subscribe({
    topic: "telemetria.bruta"
  });

  console.log(
    "MQTT Adapter listening..."
  );

  await consumer.run({

    eachMessage: async ({
      message
    }) => {

      try {

        const topic =
          message.headers?.mqtt_topic
            ?.toString() || "";

        const payload =
          message.value.toString();

        const normalized =
          normalizeMqttMessage(
            topic,
            payload
          );

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
          normalized.device_id
        );

      } catch (err) {

        console.error(
          "NORMALIZER ERROR:",
          err.message
        );

      }

    }

  });

}

run();
