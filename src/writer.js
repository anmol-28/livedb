// DB Burst Writer - Skeleton
// This is a minimal scaffold for a database burst writer

require('dotenv').config();
const { Client } = require('pg');

// Load environment variables
const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
};

// Create PostgreSQL connection
const client = new Client(dbConfig);

// Connect to database
async function connect() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL database');
    } catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1);
    }
}

// Sleep function for delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main burst writer loop
async function runBurstWriter() {
    await connect();
    
    console.log('Starting burst writer...');
    
    // Infinite loop for burst writing
    while (true) {
        try {
            console.log('starting burst');
            
            // TODO: Insert 2 rows here
            // TODO: Add insertion logic for row 1
            // TODO: Add insertion logic for row 2
            
            console.log('burst complete');
            
            // Sleep for 60 seconds before next burst
            await sleep(60000);
        } catch (error) {
            console.error('Error in burst cycle:', error);
            // Continue to next iteration even if there's an error
            await sleep(60000);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await client.end();
    process.exit(0);
});

// Start the burst writer
runBurstWriter().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
