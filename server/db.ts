import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon to use ws for WebSocket connections
neonConfig.webSocketConstructor = ws;

// Add fetch polyfill for Neon in production if needed
if (typeof fetch === 'undefined') {
  neonConfig.fetchConnectionCache = true;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log database connection info (without exposing credentials)
const dbUrl = process.env.DATABASE_URL;
const urlPattern = /^postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)$/;
const match = dbUrl.match(urlPattern);
if (match) {
  console.log(`Database: Connecting to ${match[3]}/${match[4]} as ${match[1]}`);
} else {
  console.log('Database: Connection string configured');
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Add connection options for better error handling
  connectionTimeoutMillis: 10000,
});

export const db = drizzle({ client: pool, schema });

// Test database connection on startup
export async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:');
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    return false;
  }
}
