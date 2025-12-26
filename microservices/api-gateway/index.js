// ===============================================
// API GATEWAY - Traffic Controller
// ===============================================
//
// This service routes traffic to the right microservice:
// - Frontend requests → Frontend Service
// - API requests → Environment Service
//
// Think: Hotel receptionist directing guests
// ===============================================

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Service URLs (will be different in Kubernetes)
const FRONTEND_SERVICE_URL = process.env.FRONTEND_SERVICE_URL || 'http://localhost:3000';
const ENVIRONMENT_SERVICE_URL = process.env.ENVIRONMENT_SERVICE_URL || 'http://localhost:8081';

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} → Routing...`);
  next();
});

// ===============================================
// HEALTH CHECK
// ===============================================
app.get('/health', (req, res) => {
  console.log('💚 Health check - API Gateway');
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    upstreamServices: {
      frontend: FRONTEND_SERVICE_URL,
      environment: ENVIRONMENT_SERVICE_URL
    }
  });
});

// ===============================================
// ROUTE 1: API Requests → Environment Service
// ===============================================
// Any request to /api/* goes to Environment Service
app.use('/api', createProxyMiddleware({
  target: ENVIRONMENT_SERVICE_URL,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`  → Forwarding to Environment Service: ${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`  ← Response from Environment Service: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`  ❌ Error proxying to Environment Service:`, err.message);
    res.status(503).json({
      error: 'Environment Service unavailable',
      message: err.message
    });
  }
}));

// ===============================================
// ROUTE 2: Root & Static Requests → Frontend Service
// ===============================================
// Any other request goes to Frontend Service
app.use('/', createProxyMiddleware({
  target: FRONTEND_SERVICE_URL,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`  → Forwarding to Frontend Service: ${req.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`  ← Response from Frontend Service: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error(`  ❌ Error proxying to Frontend Service:`, err.message);
    res.status(503).json({
      error: 'Frontend Service unavailable',
      message: err.message
    });
  }
}));

// ===============================================
// START SERVER
// ===============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════╗');
  console.log('║  ✅ API GATEWAY STARTED!          ║');
  console.log('╚════════════════════════════════════╝');
  console.log('');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🔀 Routing Rules:');
  console.log(`   /api/*  → Environment Service (${ENVIRONMENT_SERVICE_URL})`);
  console.log(`   /*      → Frontend Service (${FRONTEND_SERVICE_URL})`);
  console.log('');
  console.log('💡 Try: curl http://localhost:8080/health');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down API Gateway...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down API Gateway...');
  process.exit(0);
});
