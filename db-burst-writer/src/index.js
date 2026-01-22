// DB Burst Writer - Main Entry Point
// Orchestrates the burst writing process
//Dynamic or Read ahead mechanism will be added later
// A Checkpoint where it checks the last inserted row and starts from there
import { connect, getClient } from './db.js';
import { performBurstInsert } from './insert.js';

// Sleep function for delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Countdown function with visual feedback
async function countdown(seconds) {
    for (let i = seconds; i > 0; i--) {
        // Use \r to overwrite the same line
        process.stdout.write(`\r⏳ Waiting ${i}s until next burst...`);
        await sleep(1000);
    }
    // Clear the line and move to next
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
}

// Main burst writer loop
async function runBurstWriter() {
    await connect();
    const client = getClient();
    
    console.log('Starting burst writer...');
    
    // Infinite loop for burst writing
    while (true) {
        try {
            console.log('starting burst');
            
            // Perform insert operations
            await performBurstInsert(client);
            
            console.log('burst complete');
            
            // Countdown for 60 seconds before next burst
            await countdown(60);
        } catch (error) {
            console.error('Error in burst cycle:', error);
            // Continue to next iteration even if there's an error
            await countdown(60);
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    const client = getClient();
    await client.end();
    process.exit(0);
});

// Start the burst writer
runBurstWriter().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
