/**
 * Maps a database row to a Kafka event.
 * Pure function - does not mutate input.
 * 
 * @param {Object} row - Database row from livedb table
 * @param {number} row.id - Row ID
 * @param {string} row.org - Organization
 * @param {number} row.amount - Amount
 * @param {string} row.region - Region
 * @param {Date} row.created_at - Creation timestamp
 * @returns {Object} Kafka event with key and value
 */
export function mapRowToEvent(row) {
  return {
    key: String(row.id),
    value: {
      id: row.id,
      payload: {
        org: row.org,
        amount: row.amount,
        region: row.region,
      },
      meta: {
        source: 'livedb',
        created_at: row.created_at.toISOString(),
      },
    },
  };
}
