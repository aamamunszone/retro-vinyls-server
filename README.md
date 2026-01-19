# 🎵 RetroVinyls API (Backend)

A robust Express.js REST API for managing vintage vinyl records, featuring MongoDB integration, serverless architecture, and comprehensive error handling.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![Express.js](https://img.shields.io/badge/Express.js-5.2.1-black?style=for-the-badge&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0.0-green?style=for-the-badge&logo=mongodb)
![Vercel](https://img.shields.io/badge/Vercel-Ready-black?style=for-the-badge&logo=vercel)

## 🚀 Functionality

### 🗄️ RESTful API Endpoints

- **CRUD Operations**: Complete Create, Read, Update, Delete functionality for vinyl records
- **Data Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Robust error responses with detailed messages
- **Health Monitoring**: Real-time server and database health checks

### 📊 MongoDB Integration

- **Atlas Cloud Database**: Scalable cloud-hosted MongoDB solution
- **Connection Caching**: Optimized connection pooling for serverless environments
- **Data Persistence**: Reliable storage with automatic backups
- **Schema Validation**: Structured data models with type checking

### ⚡ Serverless Ready Configuration

- **Vercel Optimized**: Pre-configured for seamless Vercel deployment
- **Connection Caching**: Persistent database connections across function calls
- **Cold Start Optimization**: Minimized startup time for serverless functions
- **Environment Flexibility**: Supports both traditional and serverless hosting

## 🛠️ Tech Stack

| Technology         | Version | Purpose                                  |
| ------------------ | ------- | ---------------------------------------- |
| **Node.js**        | 18+     | JavaScript runtime environment           |
| **Express.js**     | 5.2.1   | Fast, unopinionated web framework        |
| **MongoDB Driver** | 7.0.0   | Official MongoDB driver for Node.js      |
| **CORS**           | 2.8.5   | Cross-Origin Resource Sharing middleware |
| **dotenv**         | 17.2.3  | Environment variable management          |
| **Nodemon**        | 3.1.11  | Development server with auto-restart     |

## 📡 API Endpoints

### Health & Information

| Method | Endpoint  | Description                | Response                                   |
| ------ | --------- | -------------------------- | ------------------------------------------ |
| `GET`  | `/`       | API welcome message        | Server info and available endpoints        |
| `GET`  | `/health` | Comprehensive health check | Server status, database connection, uptime |

### Vinyl Records Management

| Method | Endpoint         | Description                     | Authentication |
| ------ | ---------------- | ------------------------------- | -------------- |
| `GET`  | `/api/items`     | Fetch all vinyl records         | None           |
| `GET`  | `/api/items/:id` | Fetch single vinyl record by ID | None           |
| `POST` | `/api/items`     | Create new vinyl record         | None           |
| `POST` | `/api/seed`      | Seed database with sample data  | None           |

### API Response Format

```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Abbey Road",
      "artist": "The Beatles",
      "description": "The Beatles' eleventh studio album...",
      "price": 189.99,
      "originalPrice": 240.0,
      "image": "https://example.com/image.jpg",
      "genre": "Rock",
      "year": 1969,
      "condition": "Near Mint",
      "rating": 4.9,
      "inStock": true,
      "createdAt": "2024-01-19T10:30:00.000Z",
      "updatedAt": "2024-01-19T10:30:00.000Z"
    }
  ]
}
```

### Error Response Format

```json
{
  "error": "Validation Error",
  "message": "The following fields are required: name, artist, price",
  "missingFields": ["name", "artist", "price"],
  "timestamp": "2024-01-19T10:30:00.000Z"
}
```

## 🔧 Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/retrovinyls?retryWrites=true&w=majority
DB_NAME=retrovinyls

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration (Optional)
FRONTEND_URL=http://localhost:3000
```

### Production Environment Variables

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/retrovinyls?retryWrites=true&w=majority
DB_NAME=retrovinyls

# Server Configuration
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account with cluster setup
- Environment variables configured

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd retro-vinyls-server

# Install dependencies
npm install

# Start development server
npm run dev
```

The server will start on [http://localhost:5000](http://localhost:5000)

### Production Build

```bash
npm start
```

## 🗄️ Database Schema

### Vinyl Record Model

```javascript
{
  _id: ObjectId,
  name: String (required),
  artist: String (required),
  description: String (required),
  price: Number (required, > 0),
  originalPrice: Number (optional),
  image: String (required, URL),
  genre: String (required),
  year: Number (required, 1900-current),
  condition: String (default: "Near Mint"),
  rating: Number (required, 1-5),
  inStock: Boolean (default: true),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

## 🧪 Testing API Endpoints

### Health Check

```bash
curl http://localhost:5000/health
```

### Get All Items

```bash
curl http://localhost:5000/api/items
```

### Get Single Item

```bash
curl http://localhost:5000/api/items/507f1f77bcf86cd799439011
```

### Create New Item

```bash
curl -X POST http://localhost:5000/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dark Side of the Moon",
    "artist": "Pink Floyd",
    "description": "Progressive rock masterpiece",
    "price": 299.99,
    "image": "https://example.com/image.jpg",
    "genre": "Progressive Rock",
    "year": 1973,
    "rating": 5.0
  }'
```

### Seed Database

```bash
curl -X POST http://localhost:5000/api/seed
```

## 📦 Deployment

### Vercel Deployment (Recommended)

The project includes `vercel.json` configuration for seamless deployment:

```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }]
}
```

#### Deployment Steps:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

#### Manual Deployment:

```bash
vercel --prod
```

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Add your IP address to the whitelist (or use 0.0.0.0/0 for all IPs)
4. Create a database user with read/write permissions
5. Get the connection string and add it to your environment variables

## 🔒 Security Features

- **Input Validation**: Comprehensive validation for all API endpoints
- **Error Handling**: Secure error messages without sensitive information exposure
- **CORS Configuration**: Controlled cross-origin access
- **Environment Variables**: Sensitive data stored securely
- **Connection Security**: MongoDB connection with authentication

## 📊 Performance Optimizations

- **Connection Caching**: Reused database connections for serverless environments
- **Error Boundaries**: Graceful error handling without server crashes
- **Efficient Queries**: Optimized MongoDB queries with proper indexing
- **Response Compression**: Automatic response compression for better performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

---

**Built with ❤️ for vinyl enthusiasts worldwide**
