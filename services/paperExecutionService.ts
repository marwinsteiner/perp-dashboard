
import { Position, FlowOrder, FlowFill } from '../types';
import { v4 as uuidv4 } from 'uuid';
import flowDataService from './flowDataService';

// Seed Data for a Delta Neutral Desk
const SEED_POSITIONS: Position[] = [
    { id: '1', baseAsset: 'BTC', symbol: 'BTCUSDT', venue: 'SPOT', side: 'LONG', quantity: 25, avgEntryPrice: 96500, timestamp: Date.now(), strategyId: 'ARB_DELTA_NEUTRAL', traderId: 'ALICE' },
    { id: '2', baseAsset: 'BTC', symbol: 'BTCUSDT', venue: 'PERP_USDT', side: 'SHORT', quantity: 25, avgEntryPrice: 96800, timestamp: Date.now(), strategyId: 'ARB_DELTA_NEUTRAL', traderId: 'ALICE' },
    
    { id: '3', baseAsset: 'ETH', symbol: 'ETHUSDT', venue: 'SPOT', side: 'LONG', quantity: 300, avgEntryPrice: 2650, timestamp: Date.now(), strategyId: 'ARB_DELTA_NEUTRAL', traderId: 'ALICE' },
    { id: '4', baseAsset: 'ETH', symbol: 'ETHUSDT', venue: 'PERP_USDT', side: 'SHORT', quantity: 150, avgEntryPrice: 2680, timestamp: Date.now(), strategyId: 'TREND_FOLLOW', traderId: 'BOB' },
    { id: '5', baseAsset: 'ETH', symbol: 'ETHUSDT_250328', venue: 'FUTURE_USDT', side: 'SHORT', quantity: 150, avgEntryPrice: 2750, timestamp: Date.now(), strategyId: 'ARB_DELTA_NEUTRAL', traderId: 'ALICE' },

    { id: '6', baseAsset: 'SOL', symbol: 'SOLUSDT', venue: 'SPOT', side: 'LONG', quantity: 5000, avgEntryPrice: 180, timestamp: Date.now(), strategyId: 'TREND_FOLLOW', traderId: 'BOB' },
    { id: '7', baseAsset: 'SOL', symbol: 'SOLUSDT', venue: 'PERP_USDT', side: 'SHORT', quantity: 5000, avgEntryPrice: 182, timestamp: Date.now(), strategyId: 'TREND_FOLLOW', traderId: 'BOB' },
];

class PaperExecutionService {
    private positions: Position[] = [];
    private activeOrders: FlowOrder[] = []; // Working orders for Blotter

    constructor() {
        this.load();
    }

    private load() {
        const storedPos = localStorage.getItem('termifi_paper_positions');
        if (storedPos) {
            try { this.positions = JSON.parse(storedPos); } catch (e) { this.positions = []; }
        }
        
        // Seed if empty
        if (this.positions.length === 0) {
            this.positions = SEED_POSITIONS;
            this.save();
        }
    }

    private save() {
        localStorage.setItem('termifi_paper_positions', JSON.stringify(this.positions));
    }

    public getPositions(): Position[] {
        return this.positions;
    }

    public getActiveOrders(): FlowOrder[] {
        return this.activeOrders;
    }

    // --- OMS Methods ---

    public placeOrder(
        symbol: string, 
        baseAsset: string, 
        venue: Position['venue'], 
        side: 'BUY' | 'SELL', 
        qty: number, 
        price: number, // If 0, treated as Market
        type: 'MARKET' | 'LIMIT',
        strategyId: string, 
        traderId: string,
        tif: 'GTC' | 'IOC' | 'FOK' = 'GTC'
    ): FlowOrder {
        const order: FlowOrder = {
            id: uuidv4(),
            strategyId,
            traderId,
            symbol,
            venue,
            side,
            size: qty,
            price,
            type,
            status: 'NEW',
            timestamp: Date.now(),
            latencyMs: Math.random() * 20,
            tif,
            filledSize: 0,
            avgFillPrice: 0
        };

        // Notify Flow Service
        flowDataService.injectOrder(order);

        // Execution Logic
        if (type === 'MARKET') {
            // Instant Fill
            this.executeFill(order, qty, price || 100); // price would come from market data in real app
            order.status = 'FILLED';
        } else {
            // Limit Order - Add to Active Blotter
            this.activeOrders.unshift(order);
        }

        return order;
    }

    public cancelOrder(orderId: string) {
        const idx = this.activeOrders.findIndex(o => o.id === orderId);
        if (idx >= 0) {
            const order = this.activeOrders[idx];
            order.status = 'CANCELED';
            this.activeOrders.splice(idx, 1);
            // Notify flow
            flowDataService.injectOrder({...order, timestamp: Date.now()}); 
        }
    }

    // Mock Fill Trigger (For Limit Orders in Blotter)
    public forceFillOrder(orderId: string, fillPrice: number) {
        const idx = this.activeOrders.findIndex(o => o.id === orderId);
        if (idx >= 0) {
            const order = this.activeOrders[idx];
            this.executeFill(order, order.size, fillPrice);
            this.activeOrders.splice(idx, 1);
        }
    }

    private executeFill(order: FlowOrder, qty: number, price: number) {
        // Create Fill Record
        const fill: FlowFill = {
            id: uuidv4(),
            orderId: order.id,
            strategyId: order.strategyId,
            symbol: order.symbol,
            side: order.side,
            price: price,
            size: qty,
            notional: qty * price,
            slippageBps: Math.random() * 2 - 1,
            fee: qty * price * 0.0004,
            timestamp: Date.now(),
            liquidity: order.type === 'LIMIT' ? 'MAKER' : 'TAKER',
            venue: order.venue || 'SPOT'
        };

        // Inject into Flow
        flowDataService.injectFill(fill);

        // Update Positions
        // If Buy, we are LONG. If Sell, we are SHORT.
        // Need to check if we have existing position to net against?
        // For simple demo, we just add new position record or update existing?
        // Let's just append position log for now as "Positions" usually aggregates them.
        
        // Map BUY/SELL to LONG/SHORT for Position logic. 
        // Note: Buying a Short reduces it. Selling a Long reduces it.
        // Simplified Paper Logic: Just create a new position entry.
        const posSide = order.side === 'BUY' ? 'LONG' : 'SHORT';
        
        // Need to map Venue correctly back to baseAsset
        const baseAsset = order.symbol.replace('USDT', '').replace('_', '');

        const newPos: Position = {
            id: uuidv4(),
            baseAsset,
            symbol: order.symbol,
            venue: order.venue as Position['venue'],
            side: posSide,
            quantity: qty,
            avgEntryPrice: price,
            timestamp: Date.now(),
            strategyId: order.strategyId,
            traderId: order.traderId
        };
        
        this.positions.push(newPos);
        this.save();
    }
}

export default new PaperExecutionService();
