# DB Burst Writer - Skeleton

Minimal JavaScript skeleton for a database burst writer.

## Structure

```
livedb/
├── src/
│   └── writer.js          # Main burst writer script
├── .env.example           # Environment variables template
├── package.json           # Node.js dependencies
└── README.md
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure your database credentials:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your PostgreSQL connection details:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_username
   DB_PASSWORD=your_password
   ```

4. Ensure your database table is already created (no DDL included in this skeleton).

5. Run the burst writer:
   ```bash
   npm start
   ```

## How It Works

The writer runs in an infinite loop that:
- Logs "starting burst"
- Contains TODO sections where insertion logic for 2 rows will be added
- Logs "burst complete"
- Sleeps for 60 seconds before the next burst

## Next Steps

- Implement the actual row insertion logic in the TODO sections
- Add error handling for database operations
- Configure the number of rows per burst if needed
