
import { Order, RoutingMode, Venue, ExecutionAlgo, Side, OrderType } from '../types';
import paperExecutionService from './paperExecutionService';
import auditLogService from './auditLogService';
import { v4 as uuidv4 } from 'uuid';

class RoutingEngine {
  public async submitOrder(params: {
    symbol: string;
    side: Side;
    qty: number;
    type: OrderType;
    price?: number;
    routingMode: RoutingMode;
    venue?: Venue;
    executionAlgo: ExecutionAlgo;
    traderId?: string;
    strategyId?: string;
  }) {
    const correlationId = uuidv4();
    auditLogService.log('ROUTING_ENGINE', 'COMMAND', `Initiating Route: ${params.routingMode} | ${params.executionAlgo} | ${params.symbol}`, params.traderId);

    if (params.routingMode === 'BEST') {
      return this.executeSOR(params, correlationId);
    } else {
      return this.executeDirect(params, correlationId);
    }
  }

  private async executeDirect(params: any, correlationId: string) {
    const venue = params.venue || 'BINANCE';
    
    auditLogService.log('ROUTING_ENGINE', 'TRADE', `Direct Route: Submitting to ${venue} via ${params.executionAlgo}`, params.traderId);

    return paperExecutionService.placeOrder({
      ...params,
      venue,
      id: correlationId,
      parentOrderId: correlationId
    });
  }

  private async executeSOR(params: any, correlationId: string) {
    auditLogService.log('ROUTING_ENGINE', 'TRADE', `SOR: Scanning aggregated liquidity for ${params.symbol}`, params.traderId);

    // Mock SOR Logic: Split large orders across venues or pick best price
    // In real SOR, we would fetch quotes from all venues via MarketDataHub
    const childOrders = [];
    
    // Simulate 70/30 split between Binance and Coinbase for "BEST" routing
    childOrders.push(paperExecutionService.placeOrder({
      ...params,
      qty: params.qty * 0.7,
      venue: 'BINANCE',
      routingMode: 'BEST',
      parentOrderId: correlationId
    }));

    childOrders.push(paperExecutionService.placeOrder({
      ...params,
      qty: params.qty * 0.3,
      venue: 'COINBASE',
      routingMode: 'BEST',
      parentOrderId: correlationId
    }));

    return childOrders[0]; // Return lead child
  }
}

export default new RoutingEngine();
