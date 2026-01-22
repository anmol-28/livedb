import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';

dotenv.config();

let kafka = null;
let producer = null;
let isConnected = false;

/**
 * Initializes and connects the Kafka producer.
 * Safe to call multiple times - will not reconnect if already connected.
 */
export async function initProducer() {
  if (isConnected && producer) {
    return;
  }

  const broker = process.env.KAFKA_BROKER;
  const clientId = process.env.KAFKA_CLIENT_ID;
  const topic = process.env.KAFKA_TOPIC;

  if (!broker || !clientId || !topic) {
    throw new Error('Missing required Kafka environment variables: KAFKA_BROKER, KAFKA_CLIENT_ID, KAFKA_TOPIC');
  }

  if (!kafka) {
    kafka = new Kafka({
      clientId: clientId,
      brokers: [broker],
    });
  }

  if (!producer) {
    producer = kafka.producer();
  }

  if (!isConnected) {
    await producer.connect();
    isConnected = true;
  }
}

/**
 * Sends events to Kafka topic.
 * @param {Array<{key: string, value: object}>} events - Array of events to send
 * @throws {Error} If sending fails
 */
export async function sendEvents(events) {
  if (!producer || !isConnected) {
    throw new Error('Producer not initialized. Call initProducer() first.');
  }

  const topic = process.env.KAFKA_TOPIC;
  if (!topic) {
    throw new Error('KAFKA_TOPIC environment variable is not set');
  }

  if (!Array.isArray(events) || events.length === 0) {
    return;
  }

  const messages = events.map(event => ({
    key: event.key,
    value: JSON.stringify(event.value),
  }));

  try {
    await producer.send({
      topic: topic,
      messages: messages,
    });
  } catch (error) {
    console.error('Fatal error sending events to Kafka:', error.message);
    throw error;
  }
}

/**
 * Gracefully shuts down the Kafka producer.
 * Safe to call during shutdown, even if not connected.
 */
export async function shutdownProducer() {
  if (producer && isConnected) {
    try {
      await producer.disconnect();
    } catch (error) {
      console.error('Fatal error disconnecting producer:', error.message);
      throw error;
    } finally {
      isConnected = false;
    }
  }
}
