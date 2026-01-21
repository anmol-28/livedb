// Database Configuration and Connection
// Handles database config and connection setup

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

// Load environment variables
const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
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

// Get the client instance
function getClient() {
    return client;
}

export {
    connect,
    getClient,
};
 