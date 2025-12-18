import { Position } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Seed Data for a Delta Neutral Desk
const SEED_POSITIONS: Position[] = [
    { id: '1', baseAsset: 'BTC', symbol: 'BTCUSDT', venue: 'SPOT', side: 'LONG', quantity: 2.5, avgEntryPrice: 96500, timestamp: Date.now() },
    { id: '2', baseAsset: 'BTC', symbol: 'BTCUSDT', venue: 'PERP_USDT', side: 'SHORT', quantity: 2.5, avgEntryPrice: 96800, timestamp: Date.now() },
    
    { id: '3', baseAsset: 'ETH', symbol: 'ETHUSDT', venue: 'SPOT', side: 'LONG', quantity: 30, avgEntryPrice: 2650, timestamp: Date.now() },
    { id: '4', baseAsset: 'ETH', symbol: 'ETHUSDT', venue: 'PERP_USDT', side: 'SHORT', quantity: 15, avgEntryPrice: 2680, timestamp: Date.now() },
    { id: '5', baseAsset: 'ETH', symbol: 'ETHUSDT_250328', venue: 'FUTURE_USDT', side: 'SHORT', quantity: 15, avgEntryPrice: 2750, timestamp: Date.now() },

    { id: '6', baseAsset: 'SOL', symbol: 'SOLUSDT', venue: 'SPOT', side: 'LONG', quantity: 500, avgEntryPrice: 180, timestamp: Date.now() },
    { id: '7', baseAsset: 'SOL', symbol: 'SOLUSDT', venue: 'PERP_USDT', side: 'SHORT', quantity: 500, avgEntryPrice: 182, timestamp: Date.now() },
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

    // Basic execution stub - would elaborate with order types for full execution engine
    public executeTrade(symbol: string, baseAsset: string, venue: Position['venue'], side: 'LONG' | 'SHORT', qty: number, price: number) {
        // Netting logic omitted for simplicity, just adding rows
        const newPos: Position = {
            id: uuidv4(),
            baseAsset,
            symbol,
            venue,
            side,
            quantity: qty,
            avgEntryPrice: price,
            timestamp: Date.now()
        };
        this.positions.push(newPos);
        this.save();
        return newPos;
    }
}

export default new PaperExecutionService();