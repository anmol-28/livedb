import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';

dotenv.config();

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();

export async function sendTestEvent() {
  await producer.connect();

  const event = {
    id: 1,
    payload: {
      service: 'TEST',
      cost: 0,
    },
    meta: {
      source: 'kafka-producer',
      created_at: 'test-event',
    },
  };

  await producer.send({
    topic: process.env.KAFKA_TOPIC,
    messages: [
      {
        value: JSON.stringify(event),
      },
    ],
  });

  console.log('Event sent successfully to Kafka');
  await producer.disconnect();
}
