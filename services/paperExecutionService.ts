
import { Position } from '../types';
import { v4 as uuidv4 } from 'uuid';
import configService from './configService';

// Seed Data for a Delta Neutral Desk (Demo Only)
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
        
        // Demo Mode Logic:
        // If we are in Demo Mode and have NO positions, seed them.
        // If we are NOT in Demo Mode, we should not be using seed data (unless user manually entered them, but for safety, start clean if local storage was empty).
        // Actually, if we switch to PROD, we probably shouldn't show seed data at all even if it's in local storage.
        
        if (configService.isDemoMode) {
             if (this.positions.length === 0) {
                this.positions = SEED_POSITIONS;
                this.save();
             }
        } else {
             // Production mode logic - ensure we don't accidentally load demo data if we can distinguish it.
             // For now, if config is PROD, we only use what's in local storage if explicitly saved there, 
             // but arguably we should start empty.
             // Let's assume Production means "Connect to EMS" which this service mocks, so in Prod this service acts as a pass-through.
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
