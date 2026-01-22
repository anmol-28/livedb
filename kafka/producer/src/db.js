import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let pool = null;

/**
 * Creates and returns a PostgreSQL client pool.
 * Uses DATABASE_URL from environment variables.
 */
function getDbClient() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString: databaseUrl,
    });
  }
  return pool;
}

/**
 * Reads the current offset from producer_offsets table.
 * @returns {Promise<{last_id: number, last_created_at: Date}>}
 */
export async function getOffset() {
  const client = getDbClient();
  try {
    const result = await client.query(
      'SELECT last_id, last_created_at FROM producer_offsets WHERE id = 1'
    );
    
    if (result.rows.length === 0) {
      throw new Error('producer_offsets table must have exactly one row with id = 1');
    }
    
    const row = result.rows[0];
    return {
      last_id: row.last_id,
      last_created_at: row.last_created_at,
    };
  } catch (error) {
    console.error('Error reading offset:', error.message);
    throw error;
  }
}

/**
 * Updates the offset in producer_offsets table.
 * Should only be called after Kafka send succeeds.
 * @param {number} last_id - The last processed id
 * @param {Date|string} last_created_at - The last processed created_at timestamp
 */
export async function updateOffset(last_id, last_created_at) {
  const client = getDbClient();
  try {
    await client.query(
      `UPDATE producer_offsets 
       SET last_id = $1, last_created_at = $2, updated_at = NOW() 
       WHERE id = 1`,
      [last_id, last_created_at]
    );
  } catch (error) {
    console.error('Error updating offset:', error.message);
    throw error;
  }
}

/**
 * Polls for new rows from livedb table where id > last_id.
 * @param {number} last_id - The last processed id
 * @param {number} limit - Maximum number of rows to return
 * @returns {Promise<Array<{id: number, org: string, amount: number, region: string, created_at: Date}>>}
 */
export async function pollNewRows(last_id, limit) {
  const client = getDbClient();
  try {
    const result = await client.query(
      `SELECT id, org, amount, region, created_at
       FROM livedb
       WHERE id > $1
       ORDER BY id ASC, created_at ASC
       LIMIT $2`,
      [last_id, limit]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error polling new rows:', error.message);
    throw error;
  }
}

/**
 * Closes the database connection pool.
 * Should be called during graceful shutdown.
 */
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
