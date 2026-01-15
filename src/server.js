const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const LoadOptimizer = require('./optimizer');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/actuator/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Validation middleware
const validateOptimizeRequest = [
  body('truck').exists().withMessage('truck is required'),
  body('truck.id').isString().notEmpty().withMessage('truck.id must be a non-empty string'),
  body('truck.max_weight_lbs').isInt({ min: 1 }).withMessage('truck.max_weight_lbs must be a positive integer'),
  body('truck.max_volume_cuft').isInt({ min: 1 }).withMessage('truck.max_volume_cuft must be a positive integer'),
  body('orders').isArray({ min: 0, max: 25 }).withMessage('orders must be an array with 0-25 items'),
  body('orders.*.id').isString().notEmpty().withMessage('order.id must be a non-empty string'),
  body('orders.*.payout_cents').isInt({ min: 0 }).withMessage('order.payout_cents must be a non-negative integer'),
  body('orders.*.weight_lbs').isInt({ min: 0 }).withMessage('order.weight_lbs must be a non-negative integer'),
  body('orders.*.volume_cuft').isInt({ min: 0 }).withMessage('order.volume_cuft must be a non-negative integer'),
  body('orders.*.origin').isString().notEmpty().withMessage('order.origin must be a non-empty string'),
  body('orders.*.destination').isString().notEmpty().withMessage('order.destination must be a non-empty string'),
  body('orders.*.pickup_date').isString().notEmpty().withMessage('order.pickup_date must be a non-empty string'),
  body('orders.*.delivery_date').isString().notEmpty().withMessage('order.delivery_date must be a non-empty string'),
  body('orders.*.is_hazmat').isBoolean().withMessage('order.is_hazmat must be a boolean'),
];

// Main optimization endpoint
app.post('/api/v1/load-optimizer/optimize', validateOptimizeRequest, (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }

  try {
    const { truck, orders } = req.body;

    // Check payload size
    if (orders.length > 22) {
      return res.status(413).json({ 
        error: 'Payload too large',
        message: 'Maximum 22 orders allowed for optimal performance'
      });
    }

    // Edge case: no orders
    if (orders.length === 0) {
      return res.status(200).json({
        truck_id: truck.id,
        selected_order_ids: [],
        total_payout_cents: 0,
        total_weight_lbs: 0,
        total_volume_cuft: 0,
        utilization_weight_percent: 0,
        utilization_volume_percent: 0
      });
    }

    // Run optimization
    const startTime = Date.now();
    const optimizer = new LoadOptimizer(truck, orders);
    const result = optimizer.optimize();
    const executionTime = Date.now() - startTime;

    console.log(`Optimization completed in ${executionTime}ms for ${orders.length} orders`);

    res.status(200).json(result);
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SmartLoad Optimization API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/healthz`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/v1/load-optimizer/optimize`);
});
