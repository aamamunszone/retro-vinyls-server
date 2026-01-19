/**
 * RetroVinyls Server - Premium Vintage Music Platform API
 * A robust Express.js server with MongoDB Atlas integration
 */

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

// Sample Data for Seeding
const sampleVinyls = [
  {
    name: 'Abbey Road',
    artist: 'The Beatles',
    description:
      "The Beatles' eleventh studio album, recorded at Abbey Road Studios. Features iconic tracks like 'Come Together' and 'Here Comes the Sun'. This original UK pressing includes the rare misprint on the back cover, making it a true collector's piece.",
    price: 189.99,
    originalPrice: 240.0,
    image:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    genre: 'Rock',
    year: 1969,
    condition: 'Near Mint',
    rating: 4.9,
    inStock: true,
  },
  {
    name: 'Kind of Blue',
    artist: 'Miles Davis',
    description:
      'Widely considered one of the greatest jazz albums of all time. This first pressing Columbia 6-eye label features the legendary quintet with John Coltrane, Bill Evans, and Cannonball Adderley. A masterpiece of modal jazz in pristine condition.',
    price: 324.99,
    originalPrice: 400.0,
    image:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    genre: 'Jazz',
    year: 1959,
    condition: 'Mint',
    rating: 4.8,
    inStock: true,
  },
  {
    name: 'The Dark Side of the Moon',
    artist: 'Pink Floyd',
    description:
      "Pink Floyd's eighth studio album and one of the best-selling albums of all time. This original Harvest pressing features the iconic prism artwork and includes the solid blue triangle. A progressive rock masterpiece with impeccable sound quality.",
    price: 456.99,
    originalPrice: 600.0,
    image:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    genre: 'Progressive Rock',
    year: 1973,
    condition: 'Mint',
    rating: 5.0,
    inStock: true,
  },
  {
    name: "What's Going On",
    artist: 'Marvin Gaye',
    description:
      "Marvin Gaye's socially conscious masterpiece addressing war, poverty, and environmental issues. This Tamla original pressing with gatefold sleeve intact represents soul music at its finest. A powerful statement that remains relevant today.",
    price: 198.99,
    originalPrice: 260.0,
    image:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    genre: 'Soul',
    year: 1971,
    condition: 'Very Good+',
    rating: 4.7,
    inStock: true,
  },
  {
    name: 'Pet Sounds',
    artist: 'The Beach Boys',
    description:
      "Brian Wilson's ambitious and influential album that pushed the boundaries of pop music. This Capitol mono pressing showcases the legendary production techniques and orchestral arrangements that inspired The Beatles' Sgt. Pepper's.",
    price: 342.99,
    originalPrice: 450.0,
    image:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    genre: 'Pop',
    year: 1966,
    condition: 'Near Mint',
    rating: 4.9,
    inStock: true,
  },
  {
    name: 'Blue Train',
    artist: 'John Coltrane',
    description:
      "John Coltrane's only album as leader for Blue Note Records. This original pressing with Van Gelder stamp features the legendary saxophonist with Lee Morgan, Curtis Fuller, and Kenny Drew. A hard bop classic in excellent condition.",
    price: 289.99,
    originalPrice: 380.0,
    image:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    genre: 'Jazz',
    year: 1957,
    condition: 'Excellent',
    rating: 4.8,
    inStock: true,
  },
  {
    name: 'Rumours',
    artist: 'Fleetwood Mac',
    description:
      "One of the best-selling albums of all time, recorded during the band's personal turmoil. This original pressing captures the raw emotion and perfect production that made this album a timeless classic. Features hits like 'Go Your Own Way' and 'Dreams'.",
    price: 156.99,
    originalPrice: 200.0,
    image:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    genre: 'Rock',
    year: 1977,
    condition: 'Very Good+',
    rating: 4.6,
    inStock: true,
  },
  {
    name: 'A Love Supreme',
    artist: 'John Coltrane',
    description:
      "Coltrane's spiritual masterpiece and one of the most important jazz albums ever recorded. This original Impulse pressing represents the pinnacle of spiritual jazz. A deeply moving four-part suite that showcases Coltrane's transcendent artistry.",
    price: 412.99,
    originalPrice: 520.0,
    image:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    genre: 'Jazz',
    year: 1965,
    condition: 'Near Mint',
    rating: 4.9,
    inStock: true,
  },
];

/**
 * POST /api/seed - Seed database with sample vinyl records
 * Development endpoint to populate the database with sample data
 */
app.post('/api/seed', async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'Cannot seed data without database connection',
      });
    }

    const collection = db.collection('vinyls');

    // Clear existing data
    await collection.deleteMany({});

    // Insert sample data
    const result = await collection.insertMany(sampleVinyls);

    console.log(`✅ Seeded ${result.insertedCount} vinyl records`);

    res.json({
      message: 'Database seeded successfully',
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds,
    });
  } catch (error) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({
      error: 'Seeding failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/items - Get all vinyl records
 * Returns all vinyl records from the database
 */
app.get('/api/items', async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'Cannot fetch items without database connection',
      });
    }

    const collection = db.collection('vinyls');
    const items = await collection.find({}).toArray();

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('❌ Error fetching items:', error);
    res.status(500).json({
      error: 'Failed to fetch items',
      message: error.message,
    });
  }
});

/**
 * GET /api/items/:id - Get single vinyl record by ID
 * Returns a specific vinyl record by its MongoDB ObjectId
 */
app.get('/api/items/:id', async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'Cannot fetch item without database connection',
      });
    }

    const { id } = req.params;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        message: 'The provided ID is not a valid MongoDB ObjectId',
      });
    }

    const collection = db.collection('vinyls');
    const item = await collection.findOne({ _id: new ObjectId(id) });

    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: `No vinyl record found with ID: ${id}`,
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('❌ Error fetching item:', error);
    res.status(500).json({
      error: 'Failed to fetch item',
      message: error.message,
    });
  }
});

/**
 * POST /api/items - Add new vinyl record
 * Creates a new vinyl record in the database
 */
app.post('/api/items', async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database not connected',
        message: 'Cannot add item without database connection',
      });
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

    // Validate required fields
    const requiredFields = {
      name,
      artist,
      description,
      price,
      image,
      genre,
      year,
    };
    const missingFields = Object.entries(requiredFields)
      .filter(
        ([key, value]) =>
          !value || (typeof value === 'string' && !value.trim()),
      )
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: `The following fields are required: ${missingFields.join(', ')}`,
        missingFields,
      });
    }

    // Validate data types
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({
        error: 'Invalid price',
        message: 'Price must be a positive number',
      });
    }

    if (
      typeof year !== 'number' ||
      year < 1900 ||
      year > new Date().getFullYear()
    ) {
      return res.status(400).json({
        error: 'Invalid year',
        message: 'Year must be between 1900 and current year',
      });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'Invalid rating',
        message: 'Rating must be between 1 and 5',
      });
    }

    // Create new vinyl record object
    const newVinyl = {
      name: name.trim(),
      artist: artist.trim(),
      description: description.trim(),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      image: image.trim(),
      genre: genre.trim(),
      year: Number(year),
      condition: condition || 'Near Mint',
      rating: Number(rating),
      inStock: Boolean(inStock),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const collection = db.collection('vinyls');
    const result = await collection.insertOne(newVinyl);

    console.log(`✅ Added new vinyl record: ${name} by ${artist}`);

    res.status(201).json({
      success: true,
      message: 'Vinyl record added successfully',
      data: {
        _id: result.insertedId,
        ...newVinyl,
      },
    });
  } catch (error) {
    console.error('❌ Error adding item:', error);
    res.status(500).json({
      error: 'Failed to add item',
      message: error.message,
    });
  }
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
