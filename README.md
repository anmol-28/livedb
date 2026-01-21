# LiveDB - Database Burst Writer

A Node.js application that continuously writes data to a PostgreSQL database in timed bursts. Perfect for simulating live data streams, testing database performance, or populating databases with seed data over time.

## Features

- **Burst Writing**: Inserts 2 rows every 60 seconds in a continuous loop
- **Seed Data Support**: Reads from CSV or JSON files in the `seed/` folder
- **PostgreSQL Integration**: Connects to PostgreSQL databases (including Neon Postgres)
- **Automatic Cycling**: Loops through seed data continuously, restarting from the beginning when finished
- **Graceful Shutdown**: Handles SIGINT (Ctrl+C) to close database connections cleanly
- **Progress Tracking**: Shows insertion progress and countdown timers

## Project Structure

```
livedb/
├── src/
│   ├── index.js          # Main entry point - orchestrates burst writing
│   ├── db.js             # Database connection and configuration
│   └── insert.js         # Insert operations and seed data loading
├── seed/
│   ├── livedb_seed.csv   # Seed data file (CSV or JSON format)
│   └── README.md         # Seed data format documentation
├── .gitignore            # Git ignore rules
├── package.json        # Node.js dependencies and scripts
└── README.md
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
    "region" VARCHAR(255) NOT NULL
  );
  ```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   Create a `.env` file in the root directory with your database credentials:
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
   - Establishes connection to PostgreSQL database
   - Loads seed data from CSV/JSON file in `seed/` folder

2. **Burst Cycle** (repeats every 60 seconds):
   - Inserts 2 rows from the seed data
   - Tracks current position in seed data array
   - Cycles back to the beginning when all rows are processed
   - Displays progress and countdown timer

3. **Error Handling**:
   - Catches and logs errors during insert operations
   - Continues to next burst cycle even if errors occur
   - Maintains database connection throughout

## Seed Data Format

The application supports two file formats:

### CSV Format

**Without ID (recommended):**
```csv
org,amount,region
Acme Corp,1500.50,North
TechStart Inc,2300.75,South
```

**With ID:**
```csv
id,org,amount,region
1,Acme Corp,1500.50,North
2,TechStart Inc,2300.75,South
```

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
- The script cycles through all rows continuously

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

- **pg**: PostgreSQL client for Node.js
- **dotenv**: Loads environment variables from `.env` file

## Future Enhancements

- Dynamic or read-ahead mechanism for checkpoint management
- Checkpoint system to track last inserted row and resume from there
- Sequelize ORM integration
- Support for multiple database tables
- Configurable burst patterns and timing

## License

ISC
