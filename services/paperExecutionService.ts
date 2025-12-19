
import { Position } from '../types';
import { v4 as uuidv4 } from 'uuid';

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

    constructor() {
        this.load();
    }

    private load() {
        const stored = localStorage.getItem('termifi_paper_positions');
        if (stored) {
            try {
                this.positions = JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse positions", e);
                this.positions = [];
            }
        }
        
        // Seed if empty for demo purposes
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

    // Basic execution stub
    public executeTrade(symbol: string, baseAsset: string, venue: Position['venue'], side: 'LONG' | 'SHORT', qty: number, price: number, strategyId?: string, traderId?: string) {
        const newPos: Position = {
            id: uuidv4(),
            baseAsset,
            symbol,
            venue,
            side,
            quantity: qty,
            avgEntryPrice: price,
            timestamp: Date.now(),
            strategyId,
            traderId
        };
        this.positions.push(newPos);
        this.save();
        return newPos;
    }
}

export default new PaperExecutionService();
