// Database Insert Operations
// Handles all database insert operations
// inserts 2 rows per burst from seed data file
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Track current index in seed data
let currentIndex = 0;
let seedData = null;

// Load seed data from file
function loadSeedData() {
    if (seedData) return seedData; // Already loaded
    
    try {
        const seedDir = path.join(projectRoot, 'seed');
        const files = fs.readdirSync(seedDir);
        
        // Find the first data file (CSV or JSON)
        const dataFile = files.find(file => 
            file.endsWith('.csv') || file.endsWith('.json')
        );
        
        if (!dataFile) {
            throw new Error('No seed data file found in seed/ folder. Please add a CSV or JSON file.');
        }
        
        const filePath = path.join(seedDir, dataFile);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Parse CSV format (supports: org,amount,region or id,org,amount,region)
        if (dataFile.endsWith('.csv')) {
            const lines = fileContent.trim().split('\n');
            const hasHeader = lines[0].toLowerCase().includes('org') || lines[0].toLowerCase().includes('id');
            const startIndex = hasHeader ? 1 : 0;
            
            seedData = lines.slice(startIndex).map(line => {
                const columns = line.split(',').map(s => s.trim());
                
                // Determine format based on number of columns
                if (columns.length === 3) {
                    // Format: org,amount,region (no id)
                    return {
                        id: null,
                        org: columns[0],
                        amount: parseFloat(columns[1]),
                        region: columns[2]
                    };
                } else if (columns.length === 4) {
                    // Format: id,org,amount,region
                    return {
                        id: columns[0] && columns[0] !== 'null' ? parseInt(columns[0]) : null,
                        org: columns[1],
                        amount: parseFloat(columns[2]),
                        region: columns[3]
                    };
                }
                
                throw new Error(`Invalid CSV format: expected 3 or 4 columns, got ${columns.length}`);
            }).filter(row => row.org); // Filter out empty rows
            
            console.log(`Loaded ${seedData.length} rows from ${dataFile}`);
        } else if (dataFile.endsWith('.json')) {
            // Parse JSON format
            seedData = JSON.parse(fileContent);
            if (!Array.isArray(seedData)) {
                throw new Error('JSON file must contain an array of objects');
            }
            console.log(`Loaded ${seedData.length} rows from ${dataFile}`);
        }
        
        return seedData;
    } catch (error) {
        console.error('Error loading seed data:', error);
        throw error;
    }
}

// Insert operations for burst writing
// Inserts 2 rows per burst from seed data file
async function performBurstInsert(client) {
    try {
        // Load seed data if not already loaded
        const data = loadSeedData();
        
        if (!data || data.length === 0) {
            throw new Error('No seed data available');
        }
        
        const insertQuery = `
            INSERT INTO "livedb" ("org", "amount", "region")
            VALUES ($1, $2, $3)
        `;
        
        const rowsPerBurst = 2;
        
        // Insert rows in a loop
        for (let i = 0; i < rowsPerBurst; i++) {
            const rowIndex = currentIndex % data.length; // Loop back to start if we reach the end
            const row = data[rowIndex];
            const rowValues = [
                row.org,
                row.amount,
                row.region
            ];
            
            await client.query(insertQuery, rowValues);
            console.log(`Row ${i + 1} inserted: ${row.org}, $${row.amount}, ${row.region}`);
            currentIndex++;
        }
        
        console.log(`Insert operations completed - ${rowsPerBurst} rows inserted (Progress: ${currentIndex}/${data.length})`);
    } catch (error) {
        console.error('Error during insert operations:', error);
        throw error; // Re-throw to be handled by the caller
    }
}

export {
    performBurstInsert,
};
