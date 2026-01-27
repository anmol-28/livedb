# Database Burst Writer

A Node.js application that continuously writes data to a PostgreSQL database in timed bursts. This module serves as the data source for the Kafka integration module.

## What This Module Does

This module **writes data** to a PostgreSQL database (`livedb` table) in controlled bursts:
- ✅ Inserts 2 rows every 60 seconds in a continuous loop
- ✅ Reads seed data from CSV or JSON files
- ✅ Cycles through seed data automatically
- ✅ Simulates live data streams for testing and development
- ✅ Tracks insertion progress and displays countdown timers
- ✅ Graceful shutdown handling

## Integration with Kafka Module

### How It Connects to Kafka

The Database Burst Writer module **does NOT directly interact with Kafka**. Instead, it serves as the **data source** for the Kafka producer:

1. **Data Flow**:
   ```
   db-burst-writer → PostgreSQL Database → kafka/producer → Kafka Topics
   ```

2. **Integration Pattern**:
   - This module **writes** data to the `livedb` table in PostgreSQL
   - The Kafka producer module **reads** from the same `livedb` table
   - Kafka producer polls the database and publishes new rows as events to Kafka topics
   - Both modules use the same database connection credentials

3. **Shared Database**:
   - Both modules connect to the same PostgreSQL database
   - The `livedb` table is the integration point between modules
   - Database acts as the intermediary storage layer
   - Kafka producer tracks progress using `producer_offsets` table

### Running Both Modules Together

To create a complete data pipeline:

1. **Start Database Burst Writer** (this module):
   ```bash
   cd db-burst-writer
   npm start
   ```
   - This will continuously insert data into the `livedb` table
   - Inserts 2 rows every 60 seconds

2. **Start Kafka Producer** (separate terminal):
   ```bash
   cd ../kafka/producer
   npm start
   ```
   - This will read from the `livedb` table and publish events to Kafka
   - Polls database every 5 seconds (configurable) for new rows

3. **Start Kafka Server** (if running locally):
   ```bash
   cd ../kafka/server
   .\kafka-entry-point.bat
   ```
   - Starts ZooKeeper, Kafka broker, and creates topics automatically

## Features

- **Burst Writing**: Inserts 2 rows every 60 seconds in a continuous loop
- **Seed Data Support**: Reads from CSV or JSON files in the `seed/` folder
- **PostgreSQL Integration**: Connects to PostgreSQL databases (including Neon Postgres)
- **Automatic Cycling**: Loops through seed data continuously, restarting from the beginning when finished
- **Graceful Shutdown**: Handles SIGINT (Ctrl+C) to close database connections cleanly
- **Progress Tracking**: Shows insertion progress and countdown timers
- **Error Resilience**: Continues operation even if individual insert operations fail

## Project Structure

```
db-burst-writer/
├── src/
│   ├── index.js          # Main entry point - orchestrates burst writing
│   ├── db.js             # Database connection and configuration
│   └── insert.js         # Insert operations and seed data loading
├── seed/
│   ├── livedb_seed.csv   # Seed data file (CSV or JSON format)
│   └── README.md         # Seed data format documentation
├── package.json          # Node.js dependencies and scripts
└── db_README.md          # This file
```

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database (local or cloud, e.g., Neon Postgres)
- A database table named `livedb` with the following schema:
  ```sql
  CREATE TABLE "livedb" (
    "id" SERIAL PRIMARY KEY,
    "org" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "region" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   Create a `.env` file in the `db-burst-writer` directory with your database credentials:
   ```env
   DB_HOST=your-database-host
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_SSL=true
   ```
   
   **Note:** For Neon Postgres or other cloud databases, set `DB_SSL=true`. For local databases, you can set `DB_SSL=false`.

3. **Prepare seed data:**
   - Place your data file (CSV or JSON) in the `seed/` folder
   - See `seed/README.md` for supported formats
   - The application will automatically detect and load the first `.csv` or `.json` file found
   - Default seed file: `seed/livedb_seed.csv`

4. **Ensure database table exists:**
   Make sure your PostgreSQL database has the `livedb` table created with the schema shown above.

## Usage

### Starting the Burst Writer

```bash
npm start
```

The application will:
1. Connect to your PostgreSQL database
2. Load seed data from the `seed/` folder
3. Start inserting 2 rows every 60 seconds
4. Display progress and countdown timers

### Example Output

```
Connected to PostgreSQL database
Loaded 50 rows from livedb_seed.csv
Starting burst writer...
starting burst
Row 1 inserted: Acme Corp, $1500.50, North
Row 2 inserted: TechStart Inc, $2300.75, South
Insert operations completed - 2 rows inserted (Progress: 2/50)
burst complete
⏳ Waiting 60s until next burst...
```

### Stopping the Application

Press `Ctrl+C` to gracefully shutdown. The application will:
- Close the database connection
- Exit cleanly

## How It Works

1. **Initialization**: 
   - Loads environment variables from `.env`
   - Establishes connection to PostgreSQL database using `pg` Pool
   - Loads seed data from CSV/JSON file in `seed/` folder
   - Parses CSV (supports with/without header, with/without ID column)
   - Parses JSON (array of objects)

2. **Burst Cycle** (repeats every 60 seconds):
   - Inserts 2 rows from the seed data
   - Tracks current position in seed data array using `currentIndex`
   - Cycles back to the beginning when all rows are processed (using modulo)
   - Displays progress and countdown timer
   - Handles errors gracefully and continues to next cycle

3. **Error Handling**:
   - Catches and logs errors during insert operations
   - Continues to next burst cycle even if errors occur
   - Maintains database connection throughout
   - Graceful shutdown on SIGINT

## Seed Data Format

The application supports two file formats:

### CSV Format

**Without ID (recommended):**
```csv
org,amount,region
Acme Corp,1500.50,North
TechStart Inc,2300.75,South
```

**With ID (ID column is ignored, database auto-increments):**
```csv
id,org,amount,region
1,Acme Corp,1500.50,North
2,TechStart Inc,2300.75,South
```

**With Header:**
- First line is treated as header and skipped
- Supports both 3-column (org,amount,region) and 4-column (id,org,amount,region) formats

**Without Header:**
- All lines are treated as data
- Must have exactly 3 or 4 columns

### JSON Format

```json
[
  {"id": null, "org": "Acme Corp", "amount": 1500.50, "region": "North"},
  {"id": null, "org": "TechStart Inc", "amount": 2300.75, "region": "South"}
]
```

**Notes:**
- The script automatically finds the first `.csv` or `.json` file in the `seed/` folder
- If `id` is `null` or not provided, the database will auto-increment
- The script cycles through all rows continuously using modulo arithmetic
- Empty rows in CSV are filtered out

## Configuration

### Changing Burst Frequency

Edit `src/index.js` and modify the countdown duration:
```javascript
await countdown(60); // Change 60 to your desired seconds
```

### Changing Rows Per Burst

Edit `src/insert.js` and modify the `rowsPerBurst` variable:
```javascript
const rowsPerBurst = 2; // Change 2 to your desired number
```

## Dependencies

- **pg** (^8.11.3): PostgreSQL client for Node.js
- **dotenv** (^16.3.1): Loads environment variables from `.env` file

## Troubleshooting

### Database Connection Issues

- Verify `.env` file exists and has correct credentials
- Check database host, port, and SSL settings
- Ensure database is accessible from your network
- For Neon Postgres, verify connection string format

### Seed Data Issues

- Ensure seed file exists in `seed/` folder
- Check CSV/JSON format matches expected structure
- Verify file encoding is UTF-8
- Check for empty rows or malformed data

### Insert Errors

- Verify `livedb` table exists with correct schema
- Check table permissions for the database user
- Ensure `id` column is SERIAL (auto-increment)
- Verify data types match (org: VARCHAR, amount: DECIMAL, region: VARCHAR)

## Module Status

✅ **Module Complete** - The Database Burst Writer module is fully implemented and functional. All features are working as designed:
- Continuous burst writing (2 rows every 60 seconds)
- Seed data loading and cycling
- Database connection management
- Error handling and graceful shutdown
- Integration with Kafka producer module

## Related Documentation

- **Main Project README**: [`../README.md`](../README.md)
- **Kafka Integration**: [`../kafka/kafka-README.md`](../kafka/kafka-README.md)
- **Kafka Operations Guide**: [`../SOP.md`](../SOP.md) 