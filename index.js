/**
 * RetroVinyls Server - Enterprise Production API
 * Bulletproof MongoDB Connection with Comprehensive Error Handling
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'retrovinyls';

// Critical Environment Validation
if (!MONGODB_URI) {
  console.error('❌ CRITICAL: MONGODB_URI environment variable is required');
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
}

// Enterprise Singleton Database Connection
class DatabaseManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.connectionPromise = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async connect() {
    if (this.isConnected && this.client && this.db) {
      try {
        await this.client.db(DB_NAME).admin().ping();
        console.log('✅ Database connection verified');
        return { client: this.client, db: this.db };
      } catch (pingError) {
        console.log('🔄 Connection lost, reconnecting...');
        this.reset();
      }
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._establishConnection();
    return this.connectionPromise;
  }

  async _establishConnection() {
    try {
      console.log(
        `🔄 Establishing MongoDB connection (Attempt ${this.retryCount + 1}/${this.maxRetries})`,
      );

      const clientOptions = {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        retryReads: true,
        connectTimeoutMS: 10000,
      };

      this.client = new MongoClient(MONGODB_URI, clientOptions);

      // Connect with timeout
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 15000),
        ),
      ]);

      // Verify connection
      await this.client.db(DB_NAME).admin().ping();

      this.db = this.client.db(DB_NAME);
      this.isConnected = true;
      this.connectionPromise = null;
      this.retryCount = 0;

      console.log('✅ MongoDB Atlas connection established successfully');
      console.log(`📊 Database: ${DB_NAME}`);

      return { client: this.client, db: this.db };
    } catch (error) {
      console.error(
        `❌ MongoDB connection failed (Attempt ${this.retryCount + 1}):`,
        error.message,
      );

      this.reset();
      this.retryCount++;

      if (this.retryCount < this.maxRetries) {
        console.log(`🔄 Retrying connection in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this._establishConnection();
      }

      throw new Error(
        `Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`,
      );
    }
  }

  reset() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
    return { client: this.client, db: this.db };
  }
}

// Global Database Manager Instance
const dbManager = new DatabaseManager();

// Database Connection Middleware
const requireDatabase = async (req, res, next) => {
  try {
    await dbManager.ensureConnection();
    req.db = dbManager.db;
    next();
  } catch (error) {
    console.error('❌ Database middleware error:', error);
    return res.status(503).json({
      success: false,
      error: 'Database Unavailable',
      message: 'Database connection failed. Please try again later.',
      timestamp: new Date().toISOString(),
    });
  }
};

// CORS Configuration - Production Security
app.use(
  cors({
    origin: [
      'https://retro-vinyls.vercel.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
    ],
    optionsSuccessStatus: 200,
  }),
);

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging Middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`${timestamp} - ${req.method} ${req.path}`);
    if (req.method === 'POST' && req.body) {
      console.log('Request body keys:', Object.keys(req.body));
    }
  }
  next();
});

// ROUTES

/**
 * GET / - API Status
 */
app.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'RetroVinyls API - Production Ready',
      version: '2.0.0',
      status: 'active',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/health',
        items: '/api/items',
        seed: '/api/seed',
      },
    });
  } catch (error) {
    console.error('❌ Root route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health - Comprehensive Health Check
 */
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbDetails = {};
  let dbConnected = false;

  try {
    await dbManager.ensureConnection();
    dbConnected = true;
    dbStatus = 'connected';
    dbDetails = {
      name: DB_NAME,
      cluster: 'RetroVinylsCluster',
      provider: 'MongoDB Atlas',
      lastConnected: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Health check database error:', error.message);
    dbStatus = 'connection_failed';
    dbDetails = {
      error: error.message,
      lastAttempt: new Date().toISOString(),
    };
  }

  const healthStatus = {
    success: true,
    status: 'active',
    database: {
      status: dbStatus,
      connected: dbConnected,
      ...dbDetails,
    },
    server: {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      nodeVersion: process.version,
    },
    timestamp: new Date().toISOString(),
  };

  const httpStatus = dbConnected ? 200 : 503;
  res.status(httpStatus).json(healthStatus);
});

/**
 * GET /api/items - Get all vinyl records
 */
app.get('/api/items', requireDatabase, async (req, res) => {
  try {
    console.log('📖 Fetching all vinyl records...');

    const collection = req.db.collection('vinyls');
    const items = await collection.find({}).sort({ createdAt: -1 }).toArray();

    console.log(`✅ Retrieved ${items.length} vinyl records`);

    res.json({
      success: true,
      count: items.length,
      data: items,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch items',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/items/:id - Get single vinyl record
 */
app.get('/api/items/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'The provided ID is not a valid MongoDB ObjectId',
        timestamp: new Date().toISOString(),
      });
    }

    const collection = req.db.collection('vinyls');
    const item = await collection.findOne({ _id: new ObjectId(id) });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
        message: `No vinyl record found with ID: ${id}`,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`✅ Retrieved vinyl record: ${item.name}`);

    res.json({
      success: true,
      data: item,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch item',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/items - Add new vinyl record
 * CRITICAL: Main item creation endpoint
 */
app.post('/api/items', requireDatabase, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 POST /api/items - Creating new vinyl record');
    }

    const {
      name,
      artist,
      description,
      price,
      originalPrice,
      image,
      genre,
      year,
      condition,
      rating,
      inStock,
    } = req.body;

    // Comprehensive Field Validation
    const requiredFields = {
      name,
      artist,
      description,
      price,
      image,
      genre,
      year,
    };
    const missingFields = [];

    Object.entries(requiredFields).forEach(([key, value]) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        missingFields.push(key);
      }
    });

    if (missingFields.length > 0) {
      console.error('❌ Validation failed - missing fields:', missingFields);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields,
        timestamp: new Date().toISOString(),
      });
    }

    // Data Type Validation with Conversion
    const numericPrice = Number(price);
    const numericYear = Number(year);
    const numericRating = Number(rating || 4.5);
    const numericOriginalPrice = originalPrice ? Number(originalPrice) : null;

    // Validation Rules
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Price',
        message: 'Price must be a positive number',
        timestamp: new Date().toISOString(),
      });
    }

    if (
      isNaN(numericYear) ||
      numericYear < 1900 ||
      numericYear > new Date().getFullYear()
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Year',
        message: `Year must be between 1900 and ${new Date().getFullYear()}`,
        timestamp: new Date().toISOString(),
      });
    }

    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Rating',
        message: 'Rating must be between 1 and 5',
        timestamp: new Date().toISOString(),
      });
    }

    // Create Vinyl Record Object
    const newVinyl = {
      name: String(name).trim(),
      artist: String(artist).trim(),
      description: String(description).trim(),
      price: numericPrice,
      originalPrice: numericOriginalPrice,
      image: String(image).trim(),
      genre: String(genre).trim(),
      year: numericYear,
      condition: String(condition || 'Near Mint').trim(),
      rating: numericRating,
      inStock: Boolean(inStock !== false), // Default to true
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(
        '💾 Inserting vinyl record:',
        JSON.stringify(newVinyl, null, 2),
      );
    }

    // Database Insertion
    const collection = req.db.collection('vinyls');
    const result = await collection.insertOne(newVinyl);

    if (!result.insertedId) {
      throw new Error('Database insertion failed - no insertedId returned');
    }

    const insertedRecord = {
      _id: result.insertedId,
      ...newVinyl,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `✅ SUCCESS: Vinyl record created with ID: ${result.insertedId}`,
      );
      console.log(`📀 Record: "${name}" by ${artist}`);
    }

    res.status(201).json({
      success: true,
      message: 'Vinyl record created successfully',
      data: insertedRecord,
      insertedId: result.insertedId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ CRITICAL ERROR in POST /api/items:', error);
      console.error('Error stack:', error.stack);
    }

    res.status(500).json({
      success: false,
      error: 'Database Operation Failed',
      message: 'Failed to create vinyl record. Please try again.',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/seed - Development seeding endpoint
 */
app.post('/api/seed', requireDatabase, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Seeding is not allowed in production',
        timestamp: new Date().toISOString(),
      });
    }

    const sampleVinyls = [
      {
        name: 'Abbey Road',
        artist: 'The Beatles',
        description:
          "The Beatles' eleventh studio album, recorded at Abbey Road Studios. Features iconic tracks like 'Come Together' and 'Here Comes the Sun'.",
        price: 189.99,
        originalPrice: 240.0,
        image:
          'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        genre: 'Rock',
        year: 1969,
        condition: 'Near Mint',
        rating: 4.9,
        inStock: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Add more sample records as needed
    ];

    const collection = req.db.collection('vinyls');
    await collection.deleteMany({});
    const result = await collection.insertMany(sampleVinyls);

    console.log(`✅ Seeded ${result.insertedCount} vinyl records`);

    res.json({
      success: true,
      message: 'Database seeded successfully',
      insertedCount: result.insertedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({
      success: false,
      error: 'Seeding failed',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route Not Found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/items',
      'POST /api/items',
      'GET /api/items/:id',
      'POST /api/seed',
    ],
    timestamp: new Date().toISOString(),
  });
});

/**
 * Global Error Handler
 */
app.use((error, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 GLOBAL ERROR:', error);
    console.error('Error stack:', error.stack);
  }

  res.status(500).json({
    success: false,
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
    if (process.env.NODE_ENV !== 'production') {
      // Test database connection
      try {
        await dbManager.connect();
        console.log('✅ Database connection verified for development');
      } catch (dbError) {
        console.warn('⚠️  Starting server without database connection');
      }

      app.listen(PORT, () => {
        console.log('\n🎵 ================================');
        console.log('🎵 RetroVinyls Server - PRODUCTION READY');
        console.log('🎵 ================================');
        console.log(`🚀 Server: http://localhost:${PORT}`);
        console.log(`🔍 Health: http://localhost:${PORT}/health`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('🎵 ================================\n');
      });
    }
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Start server in development
if (process.env.NODE_ENV !== 'production') {
  startServer();
}

// Export for Vercel
module.exports = app;
