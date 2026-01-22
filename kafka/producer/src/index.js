import dotenv from 'dotenv';
dotenv.config();

import { sendTestEvent } from './producer.js';

try {
  await sendTestEvent();
  console.log('Test event sent successfully');
  process.exit(0);
} catch (error) {
  console.error('Error sending test event:', error);
  process.exit(1);
}
