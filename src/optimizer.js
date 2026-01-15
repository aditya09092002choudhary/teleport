class LoadOptimizer {
  constructor(truck, orders) {
    this.truck = truck;
    this.orders = orders;
    this.n = orders.length;
    this.cache = new Map();
  }

  optimize() {
    if (this.n === 0) {
      return this.buildResult([]);
    }

    // For small problem sizes, use brute force with pruning
    // For larger sizes (n > 15), use dynamic programming with bitmask
    if (this.n <= 15) {
      return this.bruteForceOptimize();
    } else {
      return this.dpOptimize();
    }
  }

  bruteForceOptimize() {
    let bestPayout = 0;
    let bestCombination = [];
    const maxMask = 1 << this.n;

    for (let mask = 0; mask < maxMask; mask++) {
      const combination = this.maskToOrders(mask);
      
      if (this.isValidCombination(combination)) {
        const totalPayout = this.calculateTotalPayout(combination);
        
        if (totalPayout > bestPayout) {
          bestPayout = totalPayout;
          bestCombination = combination;
        }
      }
    }

    return this.buildResult(bestCombination);
  }

  dpOptimize() {
    // Dynamic programming with memoization
    const dp = (mask, weight, volume) => {
      const key = `${mask}`;
      
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      let maxPayout = 0;
      let bestOrders = [];

      // Try adding each order that's not in the mask
      for (let i = 0; i < this.n; i++) {
        if (mask & (1 << i)) continue; // Already included
        
        const order = this.orders[i];
        const newWeight = weight + order.weight_lbs;
        const newVolume = volume + order.volume_cuft;
        
        // Check capacity constraints
        if (newWeight > this.truck.max_weight_lbs || newVolume > this.truck.max_volume_cuft) {
          continue;
        }

        const newMask = mask | (1 << i);
        const currentOrders = this.maskToOrders(newMask);
        
        // Check compatibility
        if (!this.areOrdersCompatible(currentOrders)) {
          continue;
        }

        const result = dp(newMask, newWeight, newVolume);
        const totalPayout = order.payout_cents + result.payout;
        
        if (totalPayout > maxPayout) {
          maxPayout = totalPayout;
          bestOrders = [order, ...result.orders];
        }
      }

      const result = { payout: maxPayout, orders: bestOrders };
      this.cache.set(key, result);
      return result;
    };

    const result = dp(0, 0, 0);
    return this.buildResult(result.orders);
  }

  maskToOrders(mask) {
    const orders = [];
    for (let i = 0; i < this.n; i++) {
      if (mask & (1 << i)) {
        orders.push(this.orders[i]);
      }
    }
    return orders;
  }

  isValidCombination(orders) {
    if (orders.length === 0) return true;

    // Check weight and volume constraints
    const totalWeight = orders.reduce((sum, o) => sum + o.weight_lbs, 0);
    const totalVolume = orders.reduce((sum, o) => sum + o.volume_cuft, 0);
    
    if (totalWeight > this.truck.max_weight_lbs || totalVolume > this.truck.max_volume_cuft) {
      return false;
    }

    return this.areOrdersCompatible(orders);
  }

  areOrdersCompatible(orders) {
    if (orders.length === 0) return true;
    if (orders.length === 1) return true;

    // Check route compatibility (same origin and destination)
    const firstOrder = orders[0];
    for (const order of orders) {
      if (order.origin !== firstOrder.origin || order.destination !== firstOrder.destination) {
        return false;
      }
    }

    // Check hazmat isolation rule
    const hazmatOrders = orders.filter(o => o.is_hazmat);
    if (hazmatOrders.length > 0 && orders.length > 1) {
      // Hazmat orders cannot be combined with any other orders
      return false;
    }

    // Check time window compatibility (simplified: pickup <= delivery for all)
    for (const order of orders) {
      const pickup = new Date(order.pickup_date);
      const delivery = new Date(order.delivery_date);
      if (pickup > delivery) {
        return false;
      }
    }

    return true;
  }

  calculateTotalPayout(orders) {
    return orders.reduce((sum, o) => sum + o.payout_cents, 0);
  }

  buildResult(selectedOrders) {
    const totalWeight = selectedOrders.reduce((sum, o) => sum + o.weight_lbs, 0);
    const totalVolume = selectedOrders.reduce((sum, o) => sum + o.volume_cuft, 0);
    const totalPayout = selectedOrders.reduce((sum, o) => sum + o.payout_cents, 0);

    const weightUtilization = this.truck.max_weight_lbs > 0 
      ? (totalWeight / this.truck.max_weight_lbs) * 100 
      : 0;
    const volumeUtilization = this.truck.max_volume_cuft > 0 
      ? (totalVolume / this.truck.max_volume_cuft) * 100 
      : 0;

    return {
      truck_id: this.truck.id,
      selected_order_ids: selectedOrders.map(o => o.id),
      total_payout_cents: totalPayout,
      total_weight_lbs: totalWeight,
      total_volume_cuft: totalVolume,
      utilization_weight_percent: parseFloat(weightUtilization.toFixed(2)),
      utilization_volume_percent: parseFloat(volumeUtilization.toFixed(2))
    };
  }
}

module.exports = LoadOptimizer;