# Kafka Integration Module 

A Kafka producer module that reads data from PostgreSQL and publishes events to Kafka topics. This module streams database changes as events but does NOT write to the database.

## What This Module Does

This module **reads data** from PostgreSQL and **publishes events** to Kafka:
- ✅ Connects to Kafka broker and publishes events to topics
- ✅ Reads from the `livedb` table in PostgreSQL (shared with db-burst-writer)
- ✅ Polls database for new rows using offset tracking (`producer_offsets` table)
- ✅ Transforms database rows into Kafka events
- ✅ Streams data to Kafka for downstream consumers
- ✅ Continuous polling loop with configurable intervals
- ✅ Replay mode support for reprocessing data
- ✅ Graceful shutdown handling

## Integration with Database Burst Writer Module

### How It Connects to db-burst-writer

The Kafka module **reads from the same database** that the Database Burst Writer writes to:

1. **Data Flow**:
   ```
   db-burst-writer → PostgreSQL Database → kafka/producer → Kafka Topics
   ```

2. **Integration Pattern**:
   - Database Burst Writer module **writes** data to the `livedb` table
   - This Kafka module **reads** from the same `livedb` table
   - Database acts as the shared integration point between modules
   - Kafka producer tracks progress using `producer_offsets` table

3. **Shared Database Connection**:
   - Both modules connect to the same PostgreSQL database
   - Both use the same `livedb` table
   - Kafka producer polls the database for new rows (where `id > last_id`)
   - Offset tracking ensures no duplicate events

### Running Both Modules Together

To create a complete data pipeline:

1. **Start Kafka Server** (if running locally):
   ```bash
   cd kafka/server
   .\kafka-entry-point.bat
   ```
   - This automatically starts ZooKeeper, Kafka broker, and creates topics

2. **Start Database Burst Writer** (separate terminal):
   ```bash
   cd db-burst-writer
   npm start
   ```
   - This continuously inserts data into the `livedb` table (2 rows every 60 seconds)

3. **Start Kafka Producer** (this module, separate terminal):
   ```bash
   cd kafka/producer
   npm start
   ```
   - This reads from the `livedb` table and publishes events to Kafka
   - Polls database every 5 seconds (configurable via `POLL_INTERVAL_MS`)

## Module Structure

```
kafka/
├── producer/             # Kafka producer application
│   ├── src/
│   │   ├── index.js      # Producer entry point - main polling loop
│   │   ├── producer.js   # Kafka producer logic (KafkaJS client)
│   │   ├── db.js         # Database client (reads from PostgreSQL)
│   │   └── mapper.js     # Row-to-event mapper (transforms DB rows to Kafka events)
│   ├── package.json      # Dependencies for Kafka producer
│   └── .env              # Environment variables (create this)
│
├── server/               # Kafka server management scripts
│   ├── kafka-entry-point.bat  # Automated startup (ZooKeeper → Kafka → Topics)
│   ├── start-zookeeper.bat    # Starts ZooKeeper (required for Kafka)
│   ├── start-kafka-server.bat # Starts Kafka broker
│   └── create-topics.bat      # Creates Kafka topics
│
├── kafka-README.md      # This file
└── ../SOP.md            # Detailed Kafka operations guide
```

## Components

### Producer (`kafka/producer/`)

The Kafka producer application that:
- ✅ Connects to PostgreSQL database (reads from `livedb` table)
- ✅ Polls database for new rows using offset tracking
- ✅ Maps database rows to Kafka event format
- ✅ Publishes events to Kafka topics in batches
- ✅ Updates offset only after successful Kafka send
- ✅ Handles Kafka connection and error management
- ✅ Supports replay mode for reprocessing data

**Key Files:**
- `src/index.js` - Main orchestration (polling loop, batch processing, graceful shutdown)
- `src/producer.js` - Kafka client and event publishing logic (KafkaJS)
- `src/db.js` - Database read connection, offset management, row polling
- `src/mapper.js` - Transforms database rows into Kafka event format

### Server Scripts (`kafka/server/`)

Batch scripts for managing local Kafka infrastructure:
- `kafka-entry-point.bat` - **Recommended**: Automated startup script that starts ZooKeeper, Kafka, and creates topics in correct order
- `start-zookeeper.bat` - Starts ZooKeeper (required dependency for Kafka)
- `start-kafka-server.bat` - Starts Kafka broker on localhost:9092
- `create-topics.bat` - Creates `db_live_events` topic with 1 partition

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database (same database used by db-burst-writer)
- Kafka installation (for local development) - typically at `C:\Users\anmol\kafkatest`
- ZooKeeper (included with Kafka installation)
- Database tables:
  - `livedb` table (created by db-burst-writer)
  - `producer_offsets` table (for tracking processed rows)

## Setup

### 1. Install Dependencies

```bash
cd kafka/producer
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in `kafka/producer/`:

```env
# Database Connection (same as db-burst-writer)
DATABASE_URL=postgresql://user:password@host:port/database

# Alternative: Individual database settings
# DB_HOST=your-database-host
# DB_PORT=5432
# DB_NAME=your_database_name
# DB_USER=your_username
# DB_PASSWORD=your_password
# DB_SSL=true

# Kafka Configuration
KAFKA_BROKER=localhost:9092
KAFKA_TOPIC=db_live_events
KAFKA_CLIENT_ID=kafka-producer

# Optional: Producer Settings
POLL_INTERVAL_MS=5000          # Poll database every 5 seconds (default: 5000)
REPLAY_MODE=false              # Set to 'true' to reprocess all rows from beginning
```

**Important:** 
- The database credentials should match those used by the db-burst-writer module
- `KAFKA_BROKER` must match the Kafka broker address (usually `localhost:9092` for local)
- `KAFKA_TOPIC` must match the topic created by `create-topics.bat` (`db_live_events`)

### 3. Create Database Tables

Ensure these tables exist in your PostgreSQL database:

**`livedb` table** (created by db-burst-writer):
```sql
CREATE TABLE "livedb" (
  "id" SERIAL PRIMARY KEY,
  "org" VARCHAR(255) NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "region" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`producer_offsets` table** (for tracking processed rows):
```sql
CREATE TABLE "producer_offsets" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "last_id" INTEGER NOT NULL DEFAULT 0,
  "last_created_at" TIMESTAMP NOT NULL DEFAULT '1970-01-01',
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial offset record
INSERT INTO "producer_offsets" (id, last_id, last_created_at) 
VALUES (1, 0, '1970-01-01');
```

### 4. Start Kafka Server (if running locally)

**Recommended: Use automated startup script:**
```bash
cd kafka/server
.\kafka-entry-point.bat
```

This script automatically:
1. Starts ZooKeeper in a new terminal
2. Waits 15 seconds for ZooKeeper to initialize
3. Starts Kafka broker in a new terminal
4. Waits 10 seconds for Kafka to initialize
5. Creates topics in a new terminal

**Manual startup (if needed):**
1. Start ZooKeeper (in separate terminal):
   ```bash
   cd kafka/server
   .\start-zookeeper.bat
   ```

2. Start Kafka Broker (in separate terminal, after ZooKeeper is running):
   ```bash
   cd kafka/server
   .\start-kafka-server.bat
   ```

3. Create Topic (after Kafka is running):
   ```bash
   cd kafka/server
   .\create-topics.bat
   ```

## Usage

### Starting the Producer

```bash
cd kafka/producer
npm start
```

The producer will:
1. Connect to PostgreSQL database
2. Connect to Kafka broker
3. Start continuous polling loop (every 5 seconds by default)
4. Poll database for new rows (where `id > last_id`)
5. Map rows to events
6. Publish events to Kafka topic in batches (batch size: 10)
7. Update offset after successful send

### Example Output

```
🚀 Starting Kafka Producer Streaming Service...
📋 Configuration:
   - Batch size: 10
   - Poll interval: 5000ms
   - Replay mode: disabled

✅ Kafka producer initialized
🔄 Starting polling loop...

📊 Poll cycle: Found 2 new row(s)
✅ Sent 2 event(s) to Kafka
📝 Updated offset to id: 42
📊 Poll cycle: No new rows found (last_id: 42)
```

### Stopping the Producer

Press `Ctrl+C` to gracefully shutdown. The producer will:
- Finish current poll cycle
- Disconnect from Kafka broker
- Close database connection
- Exit cleanly

## Event Format

Events published to Kafka follow this structure:

```json
{
  "id": 42,
  "payload": {
    "org": "Acme Corp",
    "amount": 1500.50,
    "region": "North"
  },
  "meta": {
    "source": "livedb",
    "created_at": "2026-01-23T10:30:45.123Z",
    "mode": "normal"
  }
}
```

**Event Structure:**
- `id`: Database row ID (used as Kafka message key)
- `payload`: Business data (org, amount, region)
- `meta`: Metadata (source, timestamp, mode)
- `mode`: Either "normal" or "replay" (based on `REPLAY_MODE` setting)

## Configuration Options

### Poll Interval

Control how often the producer polls the database:
```env
POLL_INTERVAL_MS=5000  # Poll every 5 seconds (default)
```

### Batch Size

Edit `src/index.js` to change batch size:
```javascript
const BATCH_SIZE = 10; // Process up to 10 rows per poll cycle
```

### Replay Mode

Enable replay mode to reprocess all rows from the beginning:
```env
REPLAY_MODE=true  # Reprocess all rows, ignore offsets
```

**Note:** In replay mode, offsets are not updated, so you can reprocess data without affecting normal operation.

## How It Works

1. **Initialization**:
   - Loads environment variables from `.env`
   - Connects to PostgreSQL database using connection pool
   - Initializes Kafka producer (KafkaJS client)
   - Connects to Kafka broker

2. **Polling Loop** (runs continuously):
   - Reads current offset from `producer_offsets` table
   - Queries `livedb` table for rows where `id > last_id`
   - Limits results to batch size (10 rows)
   - Maps each row to Kafka event format
   - Sends events to Kafka topic
   - Updates offset only after successful send
   - Waits for poll interval before next cycle

3. **Offset Tracking**:
   - Stores last processed `id` and `created_at` in `producer_offsets` table
   - Ensures no duplicate events are sent
   - Only updates after successful Kafka send
   - Supports replay mode to ignore offsets

4. **Error Handling**:
   - Catches and logs errors during poll cycles
   - Continues to next poll cycle even if errors occur
   - Maintains database and Kafka connections throughout
   - Graceful shutdown on SIGINT/SIGTERM

## Dependencies

- **kafkajs** (^2.2.4): Kafka client library for Node.js
- **dotenv** (^16.4.5): Environment variable management
- **pg** (^8.11.3): PostgreSQL client (for reading from database)

## Troubleshooting

### Kafka Connection Issues

- Verify Kafka broker is running: Check terminal where Kafka is running
- Verify `KAFKA_BROKER` matches Kafka broker address
- Check ZooKeeper is running (Kafka requires ZooKeeper)
- See [`../SOP.md`](../SOP.md) for detailed Kafka troubleshooting

### Database Connection Issues

- Verify `.env` file has correct `DATABASE_URL` or database credentials
- Ensure `producer_offsets` table exists and has a row with `id = 1`
- Check database is accessible from your network

### No Events Being Sent

- Check if there are new rows in database: `SELECT * FROM livedb WHERE id > (SELECT last_id FROM producer_offsets WHERE id = 1);`
- Verify producer is polling: Check console output for poll cycle messages
- Check Kafka topic exists: `kafka-topics.bat --bootstrap-server localhost:9092 --list`
- See [`../SOP.md`](../SOP.md) Section 9: Kafka Debug Checklist

### Offset Issues

- Reset offset to reprocess from beginning:
  ```sql
  UPDATE producer_offsets SET last_id = 0, last_created_at = '1970-01-01' WHERE id = 1;
  ```
- Use replay mode: Set `REPLAY_MODE=true` in `.env`

## Related Documentation

- **Main Project README**: [`../README.md`](../README.md)
- **Database Burst Writer**: [`../db-burst-writer/db_README.md`](../db-burst-writer/db_README.md)
- **Kafka Operations Guide**: [`../SOP.md`](../SOP.md) - Comprehensive guide for Kafka setup, troubleshooting, and operations

## Future Enhancements

- 🚧 Flink + Kafka Consumer: Real-time event processing
- 🚧 UI Dashboard: Live data visualization