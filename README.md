# LiveDB - Live Data System Simulation

A demonstration project that simulates how a live data system works, from data ingestion to event streaming and real-time processing.

## Project Purpose

This is a **simulation/demo module** designed to demonstrate the architecture and flow of a live data system. It shows how data flows from database insertion through event streaming to real-time processing and visualization.

## System Architecture

The complete live data system consists of four main components:

```
┌─────────────────┐
│  Database       │  Continuous data insertion
│  (Neon Postgres)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Kafka          │  Event production and streaming
│  (Event Bus)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Flink          │  Real-time event processing
│  (Processing)   │  [To be implemented]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UI Dashboard   │  Live data visualization
│  (Frontend)     │  [To be implemented]
└─────────────────┘
```

## Current Implementation Status

### ✅ Implemented Modules

1. **Database Burst Writer** (`db-burst-writer/`)
   - ✅ Continuously inserts data into PostgreSQL database (2 rows every 60 seconds)
   - ✅ Reads seed data from CSV/JSON files
   - ✅ Cycles through seed data automatically
   - ✅ Simulates live data ingestion
   - ✅ Creates the data source for the system

2. **Kafka Producer** (`kafka/producer/`)
   - ✅ Reads data from PostgreSQL database
   - ✅ Polls database for new rows using offset tracking
   - ✅ Transforms database rows to Kafka events
   - ✅ Publishes events to Kafka topics
   - ✅ Continuous polling loop with configurable intervals
   - ✅ Replay mode support for reprocessing data

3. **Kafka Server** (`kafka/server/`)
   - ✅ Local Kafka infrastructure setup scripts
   - ✅ Automated startup script (ZooKeeper → Kafka → Topics)
   - ✅ ZooKeeper and Kafka broker management
   - ✅ Topic creation automation

### 🚧 Future Modules (Not Yet Implemented)

1. **Flink + Kafka Consumer**
   - Will consume events from Kafka topics
   - Process events in real-time
   - Transform and aggregate data streams

2. **UI Dashboard**
   - Visualize live data in real-time
   - Display processed results from Flink
   - Show system metrics and data flow

## Data Flow

1. **Data Ingestion**: Database Burst Writer continuously inserts data into PostgreSQL `livedb` table (2 rows every 60 seconds)
2. **Event Production**: Kafka Producer polls database for new rows and publishes events to Kafka `db_live_events` topic
3. **Event Processing**: Flink consumes events and processes them in real-time (future)
4. **Visualization**: UI Dashboard displays live data and processing results (future)

## Project Structure

```
livedb/
├── db-burst-writer/          # Data ingestion module
│   ├── src/
│   │   ├── index.js         # Main entry point
│   │   ├── db.js            # Database connection
│   │   └── insert.js        # Insert operations
│   ├── seed/
│   │   └── livedb_seed.csv  # Seed data file
│   ├── db_README.md         # Module documentation
│   └── package.json
│
├── kafka/                    # Event streaming module
│   ├── producer/
│   │   ├── src/
│   │   │   ├── index.js     # Producer entry point
│   │   │   ├── producer.js  # Kafka producer logic
│   │   │   ├── db.js        # Database client
│   │   │   └── mapper.js    # Row-to-event mapper
│   │   └── package.json
│   ├── server/
│   │   ├── kafka-entry-point.bat  # Automated startup
│   │   ├── start-zookeeper.bat
│   │   ├── start-kafka-server.bat
│   │   └── create-topics.bat
│   ├── kafka-README.md      # Module documentation
│   └── SOP.md               # Detailed Kafka operations guide
│
├── README.md                 # This file
└── SOP.md                   # Kafka Standard Operating Procedure
```

## Quick Start Guide

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database (local or cloud, e.g., Neon Postgres)
- Kafka installation (for local development)

### Setup Steps

1. **Set up Database Burst Writer:**
   ```bash
   cd db-burst-writer
   npm install
   # Create .env file with database credentials
   ```

2. **Set up Kafka Producer:**
   ```bash
   cd kafka/producer
   npm install
   # Create .env file with database and Kafka credentials
   ```

3. **Start Kafka Server** (if running locally):
   ```bash
   cd kafka/server
   .\kafka-entry-point.bat
   ```

4. **Run the Pipeline:**
   - Terminal 1: Start Database Burst Writer
     ```bash
     cd db-burst-writer
     npm start
     ```
   - Terminal 2: Start Kafka Producer
     ```bash
     cd kafka/producer
     npm start
     ```

## Use Cases

This simulation demonstrates:

- **Live Data Ingestion**: How continuous data insertion works
- **Event-Driven Architecture**: How database changes become events
- **Stream Processing**: How events flow through Kafka (Flink integration pending)
- **Real-Time Systems**: How data moves from source to visualization (UI pending)

## Documentation

- **Database Burst Writer**: See [`db-burst-writer/db_README.md`](./db-burst-writer/db_README.md)
- **Kafka Integration**: See [`kafka/kafka-README.md`](./kafka/kafka-README.md)
- **Kafka Operations Guide**: See [`SOP.md`](./SOP.md) for detailed Kafka troubleshooting and operations

## Database Schema

### `livedb` Table
```sql
CREATE TABLE "livedb" (
  "id" SERIAL PRIMARY KEY,
  "org" VARCHAR(255) NOT NULL,
  "amount" DECIMAL(10, 2) NOT NULL,
  "region" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `producer_offsets` Table
```sql
CREATE TABLE "producer_offsets" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "last_id" INTEGER NOT NULL DEFAULT 0,
  "last_created_at" TIMESTAMP NOT NULL DEFAULT '1970-01-01',
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Note

This project is part of a larger task to create a working simulation of a live data system. It demonstrates the foundational components (data ingestion and event production) with future components (Flink processing and UI dashboard) to be added.

---

**Task**: Create a working simulation which works in Live data from DB(neon)
