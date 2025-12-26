// ===============================================
// ENVIRONMENT SERVICE - Your First Microservice!
// ===============================================
//
// WHAT THIS SERVICE DOES:
// This is like a librarian who has 3 books:
// - Book 1: UAT environment details
// - Book 2: PET environment details  
// - Book 3: PROD environment details
//
// When someone asks for a book, we give it to them!
//
// PORT: 8081
// ===============================================

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

// Import Winston for logging to ELK (we'll add this later)
// For now, we'll use console.log

const app = express();
const PORT = process.env.PORT || 8081;

// ===============================================
// MIDDLEWARE (Helper tools)
// ===============================================

// CORS: Allows other services to talk to us
// Think: Security guard who allows friendly visitors
app.use(cors());

// JSON: Helps us understand JSON data
app.use(express.json());

// Request Logger: Logs every request
// Think: Security log book at reception
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ===============================================
// DATA STORAGE (Our "library")
// ===============================================

// This stores all environment data in memory
// Think: Librarian's memory of where books are
let environmentData = {
  UAT: null,
  PET: null,
  PROD: null
};

// ===============================================
// FUNCTION: Load JSON Files
// ===============================================
// This reads JSON files from disk and stores in memory
// Think: Librarian reading books and remembering them

async function loadEnvironmentData() {
  try {
    console.log('📚 Loading environment data from files...');
    
    // Read UAT data
    console.log('  → Reading UAT data...');
    const uatData = await fs.readFile(
      path.join(__dirname, 'data', 'env-details_UAT.json'),
      'utf8'
    );
    environmentData.UAT = JSON.parse(uatData);
    console.log('  ✅ UAT data loaded successfully');
    
    // Read PET data
    console.log('  → Reading PET data...');
    const petData = await fs.readFile(
      path.join(__dirname, 'data', 'env-details_PET.json'),
      'utf8'
    );
    environmentData.PET = JSON.parse(petData);
    console.log('  ✅ PET data loaded successfully');
    
    // Read PROD data
    console.log('  → Reading PROD data...');
    const prodData = await fs.readFile(
      path.join(__dirname, 'data', 'env-details_PROD.json'),
      'utf8'
    );
    environmentData.PROD = JSON.parse(prodData);
    console.log('  ✅ PROD data loaded successfully');
    
    console.log('🎉 All environment data loaded!');
    console.log(`   Total environments: ${Object.keys(environmentData).length}`);
  } catch (error) {
    console.error('❌ ERROR: Failed to load environment data!');
    console.error('   Details:', error.message);
    console.error('   Make sure JSON files exist in data/ folder');
    process.exit(1); // Stop the service if data can't load
  }
}

// ===============================================
// API ENDPOINTS (What people can ask for)
// ===============================================

// 1️⃣ HEALTH CHECK
// Endpoint: GET /health
// Purpose: Let Kubernetes know if service is alive
// Think: "Are you alive?" check
app.get('/health', (req, res) => {
  console.log('💚 Health check requested');
  res.status(200).json({ 
    status: 'healthy',
    service: 'environment-service',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 2️⃣ GET ALL ENVIRONMENTS
// Endpoint: GET /api/environments
// Returns: All environment data (UAT, PET, PROD)
// Think: "Give me all the books!"
app.get('/api/environments', (req, res) => {
  console.log('📦 Request for ALL environments');
  
  res.json({
    success: true,
    data: environmentData,
    count: Object.keys(environmentData).length,
    timestamp: new Date().toISOString()
  });
  
  console.log('   ✅ Returned all environments');
});

// 3️⃣ GET SPECIFIC ENVIRONMENT
// Endpoint: GET /api/environments/:env
// Example: GET /api/environments/uat
// Returns: Specific environment data
// Think: "Give me the UAT book!"
app.get('/api/environments/:env', (req, res) => {
  const envName = req.params.env.toUpperCase(); // Convert to uppercase
  
  console.log(`📖 Request for ${envName} environment`);
  
  // Check if environment exists
  if (!environmentData[envName]) {
    console.log(`   ❌ Environment ${envName} not found!`);
    return res.status(404).json({
      success: false,
      error: `Environment '${envName}' not found`,
      availableEnvironments: Object.keys(environmentData),
      hint: 'Try: uat, pet, or prod'
    });
  }
  
  // Return the requested environment data
  res.json({
    success: true,
    environment: envName,
    data: environmentData[envName],
    timestamp: new Date().toISOString()
  });
  
  console.log(`   ✅ Returned ${envName} environment data`);
});

// 4️⃣ GET ENVIRONMENT LIST
// Endpoint: GET /api/environments-list
// Returns: List of available environments
// Think: "What books do you have?"
app.get('/api/environments-list', (req, res) => {
  console.log('📋 Request for environment list');
  
  const envList = Object.keys(environmentData);
  
  res.json({
    success: true,
    environments: envList,
    count: envList.length,
    timestamp: new Date().toISOString()
  });
  
  console.log(`   ✅ Returned list of ${envList.length} environments`);
});

// ===============================================
// ERROR HANDLING
// ===============================================

// Handle 404 - Not Found
app.use((req, res) => {
  console.log(`❌ 404 - Endpoint not found: ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requestedPath: req.path,
    availableEndpoints: [
      'GET /health',
      'GET /api/environments',
      'GET /api/environments/:env',
      'GET /api/environments-list'
    ],
    examples: [
      'GET /api/environments/uat',
      'GET /api/environments/pet',
      'GET /api/environments/prod'
    ]
  });
});

// Handle all other errors
app.use((err, req, res, next) => {
  console.error('❌ Internal Server Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ===============================================
// START THE SERVICE
// ===============================================

async function startService() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('🚀 Starting Environment Service...');
    console.log('═══════════════════════════════════════════');
    
    // Load environment data first
    await loadEnvironmentData();
    
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log('║  ✅ ENVIRONMENT SERVICE STARTED!      ║');
      console.log('╚════════════════════════════════════════╝');
      console.log('');
      console.log(`📍 Port: ${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('📚 Available Endpoints:');
      console.log(`   All Envs:  http://localhost:${PORT}/api/environments`);
      console.log(`   UAT:       http://localhost:${PORT}/api/environments/uat`);
      console.log(`   PET:       http://localhost:${PORT}/api/environments/pet`);
      console.log(`   PROD:      http://localhost:${PORT}/api/environments/prod`);
      console.log(`   List:      http://localhost:${PORT}/api/environments-list`);
      console.log('');
      console.log('💡 Try it: curl http://localhost:8081/health');
      console.log('═══════════════════════════════════════════');
    });
  } catch (error) {
    console.error('❌ FATAL ERROR: Failed to start service!');
    console.error('   Details:', error.message);
    process.exit(1);
  }
}

// Start the service
startService();

// ===============================================
// GRACEFUL SHUTDOWN
// ===============================================
// When Kubernetes needs to restart the service,
// finish current requests before stopping

process.on('SIGTERM', () => {
  console.log('');
  console.log('🛑 SIGTERM received - shutting down gracefully...');
  console.log('   Finishing current requests...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 SIGINT received - shutting down gracefully...');
  console.log('   Finishing current requests...');
  process.exit(0);
});
