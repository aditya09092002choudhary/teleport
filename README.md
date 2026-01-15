# SmartLoad Optimization API

A high-performance REST API for optimizing truck load combinations to maximize revenue while respecting weight, volume, and compatibility constraints.

## Features

- **Dynamic Programming Optimization**: Efficient algorithm handling up to 22 orders (2^22 possible combinations)
- **Multi-constraint Validation**: Weight, volume, route compatibility, and hazmat isolation
- **High Performance**: < 800ms execution time for 22 orders
- **Stateless Design**: No database required, fully in-memory processing
- **Production Ready**: Docker support, input validation, error handling

## Algorithm

The optimizer uses two strategies based on problem size:
- **n ≤ 15**: Brute force with pruning (2^15 = 32K states)
- **n > 15**: Dynamic programming with bitmask memoization

## Requirements

- Docker and Docker Compose
- OR Node.js 18+

## How to Run

### Using Docker (Recommended)

```bash
git clone <your-repo>
cd smartload-optimization-api
docker compose up --build
```

The service will be available at `http://localhost:8080`

### Using Node.js Directly

```bash
npm install
npm start
```

## API Endpoints

### Health Check

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/actuator/health
```

### Optimize Load

```bash
curl -X POST http://localhost:8080/api/v1/load-optimizer/optimize \
  -H "Content-Type: application/json" \
  -d @sample-request.json
```

## Request Format

```json
{
  "truck": {
    "id": "truck-123",
    "max_weight_lbs": 44000,
    "max_volume_cuft": 3000
  },
  "orders": [
    {
      "id": "ord-001",
      "payout_cents": 250000,
      "weight_lbs": 18000,
      "volume_cuft": 1200,
      "origin": "Los Angeles, CA",
      "destination": "Dallas, TX",
      "pickup_date": "2025-12-05",
      "delivery_date": "2025-12-09",
      "is_hazmat": false
    }
  ]
}
```

## Response Format

```json
{
  "truck_id": "truck-123",
  "selected_order_ids": ["ord-001", "ord-002"],
  "total_payout_cents": 430000,
  "total_weight_lbs": 30000,
  "total_volume_cuft": 2100,
  "utilization_weight_percent": 68.18,
  "utilization_volume_percent": 70.0
}
```

## Constraints & Rules

1. **Weight Limit**: Total weight cannot exceed `truck.max_weight_lbs`
2. **Volume Limit**: Total volume cannot exceed `truck.max_volume_cuft`
3. **Route Compatibility**: All orders must have the same origin and destination
4. **Hazmat Isolation**: Hazmat orders cannot be combined with any other orders
5. **Time Windows**: Pickup date must be ≤ delivery date

## HTTP Status Codes

- `200`: Success
- `400`: Invalid input
- `404`: Endpoint not found
- `413`: Payload too large (> 22 orders)
- `500`: Internal server error

## Performance

- Handles 22 orders in < 800ms on modern hardware
- Memory-efficient with memoization
- Optimized for both small and large problem sizes

## Architecture

```
src/
├── server.js     # Express app with validation & routing
├── optimizer.js  # Core optimization algorithm (DP + brute force)
```

## Testing

Use the provided `sample-request.json` for testing:

```bash
curl -X POST http://localhost:8080/api/v1/load-optimizer/optimize \
  -H "Content-Type: application/json" \
  -d @sample-request.json
```

Expected result: Orders ord-001 and ord-002 selected (ord-003 excluded due to hazmat)

## License

MIT