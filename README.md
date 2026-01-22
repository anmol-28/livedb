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
   - Continuously inserts data into PostgreSQL database
   - Simulates live data ingestion
   - Creates the data source for the system

2. **Kafka Producer** (`kafka/producer/`)
   - Reads data from the database
   - Produces events to Kafka topics
   - Enables event streaming for downstream processing

3. **Kafka Server** (`kafka/server/`)
   - Local Kafka infrastructure setup scripts
   - ZooKeeper and Kafka broker management

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

1. **Data Ingestion**: Database Burst Writer continuously inserts data into PostgreSQL
2. **Event Production**: Kafka Producer reads from database and publishes events to Kafka
3. **Event Processing**: Flink consumes events and processes them in real-time (future)
4. **Visualization**: UI Dashboard displays live data and processing results (future)

## Project Structure

```
livedb/
├── db-burst-writer/     # Data ingestion module
│   └── README.md        # Module documentation
│
└── kafka/               # Event streaming module
    ├── producer/        # Kafka producer
    ├── server/          # Kafka infrastructure scripts
    └── README.md        # Module documentation
```

## Use Cases

This simulation demonstrates:

- **Live Data Ingestion**: How continuous data insertion works
- **Event-Driven Architecture**: How database changes become events
- **Stream Processing**: How events flow through Kafka (Flink integration pending)
- **Real-Time Systems**: How data moves from source to visualization (UI pending)

## Getting Started

This is a **demo/simulation project** for learning and demonstration purposes. Each module has its own documentation:

- **Database Burst Writer**: See [`db-burst-writer/README.md`](./db-burst-writer/README.md)
- **Kafka Integration**: See [`kafka/README.md`](./kafka/README.md)

## Note

This project is part of a larger task to create a working simulation of a live data system. It demonstrates the foundational components (data ingestion and event production) with future components (Flink processing and UI dashboard) to be added.

---

**Task**: Create a working simulation which works in Live data from DB(neon)
