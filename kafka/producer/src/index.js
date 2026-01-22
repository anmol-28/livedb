import dotenv from 'dotenv';
dotenv.config();

import { initProducer, sendEvents, shutdownProducer } from './producer.js';
import { getOffset, pollNewRows, updateOffset, closeDb } from './db.js';
import { mapRowToEvent } from './mapper.js';

const BATCH_SIZE = 10;

async function main() {
  try {
    // Initialize Kafka producer
    await initProducer();

    // Read current DB offset
    const offset = await getOffset();
    const lastId = offset.last_id;

    // Poll DB for new rows
    const rows = await pollNewRows(lastId, BATCH_SIZE);

    // If no new rows, exit cleanly
    if (rows.length === 0) {
      await shutdownProducer();
      await closeDb();
      process.exit(0);
    }

    // Map rows to Kafka events
    const events = rows.map(row => mapRowToEvent(row));

    // Send events to Kafka
    await sendEvents(events);

    // Update offset using last row of batch
    const lastRow = rows[rows.length - 1];
    await updateOffset(lastRow.id, lastRow.created_at);

    // Graceful shutdown
    await shutdownProducer();
    await closeDb();

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
