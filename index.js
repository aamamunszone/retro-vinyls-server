/**
 * RetroVinyls Server - Premium Vintage Music Platform API
 * A robust Express.js server with MongoDB Atlas integration
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'retrovinyls';

// Validate required environment variables
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

// Global variables for database connection
let db = null;
let client = null;
let isConnected = false;
const serverStartTime = Date.now();

// MongoDB Client Configuration for Atlas
const clientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Middleware Configuration
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection Function
async function connectToDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');

    // Create MongoDB client
    client = new MongoClient(MONGODB_URI, clientOptions);

    // Connect to MongoDB Atlas
    await client.connect();

    // Verify connection with ping
    await client.db(DB_NAME).admin().ping();

    // Store database instance
    db = client.db(DB_NAME);
    isConnected = true;

    console.log('✅ Successfully connected to MongoDB Atlas');
    console.log(`📊 Database: ${DB_NAME}`);
    console.log(`🌐 Cluster: RetroVinylsCluster`);

    return true;
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:', error.message);
    isConnected = false;

    // Don't exit the process, allow server to start without DB
    return false;
  }
}

// Database connection health check
function isDatabaseConnected() {
  try {
    return (
      client && isConnected && client.topology && client.topology.isConnected()
    );
  } catch (error) {
    return false;
  }
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n🔄 Gracefully shutting down server...');

  if (client && isConnected) {
    try {
      await client.close();
      console.log('📊 MongoDB Atlas connection closed');
    } catch (error) {
      console.error('Error closing MongoDB connection:', error.message);
    }
  }

  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('🚨 Uncaught Exception:', error);

  if (client && isConnected) {
    try {
      await client.close();
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError.message);
    }
  }

  process.exit(1);
});

// Routes

/**
 * GET / - Welcome endpoint
 * Returns a welcome message confirming the RetroVinyls API is running
 */
app.get('/', (req, res) => {
  res.json({
    message: 'RetroVinyls API is running',
    description: 'Premium platform for vintage music enthusiasts',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      documentation: 'Coming soon...',
    },
  });
});

/**
 * GET /health - Comprehensive health check endpoint
 * Returns server status, database connection status, and detailed uptime information
 */
app.get('/health', async (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;

  // Check actual database connection status
  const dbConnected = isDatabaseConnected();
  let dbStatus = 'disconnected';
  let dbDetails = {};

  if (dbConnected) {
    dbStatus = 'connected';
    dbDetails = {
      name: DB_NAME,
      cluster: 'RetroVinylsCluster',
      provider: 'MongoDB Atlas',
    };
  } else if (client) {
    dbStatus = 'connection_lost';
  }

  const healthStatus = {
    status: 'active',
    database: {
      status: dbStatus,
      connected: dbConnected,
      ...dbDetails,
    },
    server: {
      uptime: uptimeFormatted,
      uptimeSeconds: uptime,
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      nodeVersion: process.version,
    },
    timestamp: new Date().toISOString(),
  };

  // Set appropriate HTTP status based on database connection
  const httpStatus = dbConnected ? 200 : 503;

  res.status(httpStatus).json(healthStatus);
});

/**
 * 404 Handler - Handle undefined routes
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: ['GET /', 'GET /health'],
    timestamp: new Date().toISOString(),
  });
});

/**
 * Global Error Handler
 */
app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);

  res.status(500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Something went wrong',
    timestamp: new Date().toISOString(),
  });
});

// Server Initialization
async function startServer() {
  try {
    // Attempt database connection (non-blocking)
    const dbConnected = await connectToDatabase();

    if (!dbConnected) {
      console.warn('⚠️  Server starting without database connection');
      console.warn(
        '⚠️  Database features will be unavailable until connection is restored',
      );
    }

    // Start the Express server
    app.listen(PORT, () => {
      console.log('\n🎵 ================================');
      console.log('🎵 RetroVinyls Server Started');
      console.log('🎵 ================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Local: http://localhost:${PORT}`);
      console.log(`🔍 Health: http://localhost:${PORT}/health`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
      console.log('🎵 ================================\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
