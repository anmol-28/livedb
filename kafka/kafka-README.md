# Kafka Integration Module 

A Kafka producer module that reads data from PostgreSQL and publishes events to Kafka topics. This module streams database changes as events but does NOT write to the database.

## What This Module Does

This module **reads data** from PostgreSQL and **publishes events** to Kafka:
- Connects to Kafka broker and publishes events to topics
- Reads from the `livedb` table in PostgreSQL (shared with db-burst-writer)
- Transforms database rows into Kafka events
- Streams data to Kafka for downstream consumers

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

3. **Shared Database Connection**:
   - Both modules connect to the same PostgreSQL database
   - Both use the same `livedb` table
   - Kafka producer polls the database for new/changed rows

### Running Both Modules Together

To create a complete data pipeline:

1. **Start Database Burst Writer** (separate terminal):
   ```bash
   cd db-burst-writer
   npm start
   ```
   - This continuously inserts data into the `livedb` table

2. **Start Kafka Producer** (this module):
   ```bash
   cd kafka/producer
   npm start
   ```
   - This reads from the `livedb` table and publishes events to Kafka

3. **Start Kafka Server** (if running locally):
   - Start ZooKeeper: `kafka/server/start-zookeeper.bat`
   - Start Kafka: `kafka/server/start-kafka.bat`
   - Create topics: `kafka/server/create-topics.bat`

## Module Structure

```
kafka/
├── producer/             # Kafka producer application
│   ├── src/
│   │   ├── index.js      # Producer entry point
│   │   ├── producer.js   # Kafka producer logic
│   │   ├── db.js         # Database client (for reading from PostgreSQL)
│   │   └── mapper.js     # Row-to-event mapper (transforms DB rows to Kafka events)
│   ├── package.json      # Dependencies for Kafka producer
│   └── README.md         # Producer documentation
│
└── server/               # Kafka server management scripts
    ├── start-zookeeper.bat  # Starts ZooKeeper (required for Kafka)
    ├── start-kafka.bat      # Starts Kafka broker
    └── create-topics.bat     # Creates Kafka topics
```

## Components

### Producer (`kafka/producer/`)

The Kafka producer application that:
- Connects to PostgreSQL database (reads from `livedb` table)
- Polls database for new/changed rows
- Maps database rows to Kafka event format
- Publishes events to Kafka topics
- Handles Kafka connection and error management

**Key Files:**
- `src/producer.js` - Kafka client and event publishing logic
- `src/db.js` - Database read connection (connects to same DB as db-burst-writer)
- `src/mapper.js` - Transforms database rows into Kafka event format
- `src/index.js` - Main orchestration (polling, mapping, producing)

### Server Scripts (`kafka/server/`)

Batch scripts for managing local Kafka infrastructure:
- `start-zookeeper.bat` - Starts ZooKeeper (required dependency for Kafka)
- `start-kafka.bat` - Starts Kafka broker on localhost:9092
- `create-topics.bat` - Creates `db_live_events` topic

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database (same database used by db-burst-writer)
- Kafka broker (local or remote)
- ZooKeeper (if running Kafka locally)

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
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=true

# Kafka Configuration
KAFKA_BROKER=localhost:9092
KAFKA_TOPIC=db_live_events
KAFKA_CLIENT_ID=kafka-producer
```

**Important:** The database credentials should match those used by the db-burst-writer module since both read/write from the same database.

### 3. Start Kafka Server (if running locally)

1. Start ZooKeeper (in separate terminal):
   ```bash
   cd kafka/server
   ./start-zookeeper.bat
   ```

2. Start Kafka Broker (in separate terminal):
   ```bash
   cd kafka/server
   ./start-kafka.bat
   ```

3. Create Topic (after Kafka is running):
   ```bash
   cd kafka/server
   ./create-topics.bat
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
3. Poll database for new rows
4. Map rows to events
5. Publish events to Kafka topic

## Event Format

Events published to Kafka follow this structure:

```json
{
  "id": 1,
  "payload": {
    "service": "TEST",
    "cost": 0
  },
  "meta": {
    "source": "kafka-producer",
    "created_at": "test-event"
  }
}
```

## Dependencies

- **kafkajs**: ^2.2.4 - Kafka client library for Node.js
- **dotenv**: ^16.4.5 - Environment variable management
- **pg**: ^8.11.3 - PostgreSQL client (for reading from database)

## Current Implementation Status

- ✅ Kafka producer connectivity verified
- ✅ Event publishing to Kafka topics working
- ✅ Server management scripts functional
- ⏳ Database polling logic (to be implemented)
- ⏳ Row-to-event mapping logic (to be implemented)
- ⏳ Continuous streaming (to be implemented)

#Flink + kafka consumer yet to implement