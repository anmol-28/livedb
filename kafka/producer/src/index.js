import dotenv from 'dotenv';
dotenv.config();

import { initProducer, sendEvents, shutdownProducer } from './producer.js';
import { getOffset, pollNewRows, updateOffset, closeDb } from './db.js';
import { mapRowToEvent } from './mapper.js';

const BATCH_SIZE = 10;
const REPLAY_MODE = process.env.REPLAY_MODE === 'true';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);

let isShuttingDown = false;

/**
 * Sleep function for polling interval
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown() {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  
  console.log('\n🛑 Shutting down gracefully...');
  
  try {
    await shutdownProducer();
    await closeDb();
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

/**
 * Process a single polling cycle
 */
async function processPollCycle() {
  try {
    let lastId;

    // Replay mode: ignore offsets, start from beginning
    if (REPLAY_MODE) {
      lastId = 0;
    } else {
      // Normal mode: read current DB offset
      const offset = await getOffset();
      lastId = offset.last_id;
    }

    // Poll DB for new rows
    const rows = await pollNewRows(lastId, BATCH_SIZE);

    // If no new rows, log and continue
    if (rows.length === 0) {
      console.log(`📊 Poll cycle: No new rows found (last_id: ${lastId})`);
      return;
    }

    console.log(`📊 Poll cycle: Found ${rows.length} new row(s)`);

    // Map rows to Kafka events
    const mode = REPLAY_MODE ? 'replay' : 'normal';
    const events = rows.map(row => mapRowToEvent(row, mode));

    // Send events to Kafka
    await sendEvents(events);
    console.log(`✅ Sent ${events.length} event(s) to Kafka`);

    // Update offset using last row of batch (only in normal mode)
    if (!REPLAY_MODE) {
      const lastRow = rows[rows.length - 1];
      await updateOffset(lastRow.id, lastRow.created_at);
      console.log(`📝 Updated offset to id: ${lastRow.id}`);
    }
  } catch (error) {
    console.error('❌ Error in poll cycle:', error.message);
    // Continue to next iteration even if there's an error
  }
}

/**
 * Main streaming service loop
 */
async function main() {
  try {
    console.log('🚀 Starting Kafka Producer Streaming Service...');
    console.log(`📋 Configuration:`);
    console.log(`   - Batch size: ${BATCH_SIZE}`);
    console.log(`   - Poll interval: ${POLL_INTERVAL_MS}ms`);
    console.log(`   - Replay mode: ${REPLAY_MODE ? 'enabled' : 'disabled'}`);
    console.log('');

    // Initialize Kafka producer (once at startup)
    await initProducer();
    console.log('✅ Kafka producer initialized');

    // Register signal handlers for graceful shutdown
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    // Main streaming loop
    console.log('🔄 Starting polling loop...\n');
    
    while (!isShuttingDown) {
      await processPollCycle();
      
      // Wait for next poll cycle (unless shutting down)
      if (!isShuttingDown) {
        await sleep(POLL_INTERVAL_MS);
      }
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    await gracefulShutdown();
  }
}

main();
