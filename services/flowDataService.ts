
import { FlowFill, FlowOrder } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Mock data generator for Execution Quality
class FlowDataService {
    private fills: FlowFill[] = [];
    private orders: FlowOrder[] = [];
    private maxHistory = 2000;
    private listeners: (() => void)[] = [];
    private intervalId: any;

    constructor() {
        this.seedHistory();
        this.startStream();
    }

    private seedHistory() {
        const now = Date.now();
        const strats = ['ARB_DELTA_NEUTRAL', 'TREND_FOLLOW', 'ETH_FUTURES_HEDGE'];
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];

        for (let i = 0; i < 500; i++) {
            const timeOffset = Math.random() * 1000 * 60 * 60 * 8; // Last 8 hours
            const timestamp = now - timeOffset;
            
            this.generateTrade(timestamp, strats, symbols);
        }
    }

    private generateTrade(timestamp: number, strats: string[], symbols: string[]) {
        const strat = strats[Math.floor(Math.random() * strats.length)];
        const sym = symbols[Math.floor(Math.random() * symbols.length)];
        const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
        
        // Base Price Simulation
        let basePrice = 100;
        if (sym.startsWith('BTC')) basePrice = 96000;
        if (sym.startsWith('ETH')) basePrice = 2600;
        if (sym.startsWith('SOL')) basePrice = 180;
        if (sym.startsWith('BNB')) basePrice = 600;

        const price = basePrice * (1 + (Math.random() * 0.02 - 0.01));
        const size = (10000 / price) * (0.5 + Math.random()); // ~$10k trades
        
        // Sim Execution Quality
        // Trend Follow pays more slippage usually
        const isTrend = strat === 'TREND_FOLLOW';
        const slippageMean = isTrend ? 1.5 : -0.5; // Arb makes spread often
        const slippageBps = slippageMean + (Math.random() * 4 - 2); 
        const isTaker = slippageBps > 0;
        
        const orderId = uuidv4();

        // 90% fill rate
        const status = Math.random() > 0.1 ? 'FILLED' : (Math.random() > 0.5 ? 'CANCELED' : 'REJECTED');

        const order: FlowOrder = {
            id: orderId,
            strategyId: strat,
            symbol: sym,
            side,
            price,
            size,
            status,
            timestamp: timestamp - (Math.random() * 500), // Order slightly before
            latencyMs: 10 + Math.random() * 50
        };

        this.orders.push(order);

        if (status === 'FILLED') {
            const fill: FlowFill = {
                id: uuidv4(),
                orderId,
                strategyId: strat,
                symbol: sym,
                side,
                price: price * (1 + (side === 'BUY' ? slippageBps : -slippageBps) / 10000),
                size,
                notional: price * size,
                slippageBps,
                fee: price * size * 0.0004,
                timestamp,
                liquidity: isTaker ? 'TAKER' : 'MAKER',
                venue: 'BINANCE_PERP'
            };
            this.fills.push(fill);
        }
    }

    private startStream() {
        // Generate new trade every 1-3 seconds
        this.intervalId = setInterval(() => {
            const strats = ['ARB_DELTA_NEUTRAL', 'TREND_FOLLOW', 'ETH_FUTURES_HEDGE'];
            const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
            this.generateTrade(Date.now(), strats, symbols);
            
            // Trim
            if (this.orders.length > this.maxHistory) {
                this.orders = this.orders.slice(-this.maxHistory);
                this.fills = this.fills.slice(-this.maxHistory);
            }

            this.notify();
        }, 2000);
    }

    public getFills(): FlowFill[] {
        // Return a copy to ensure React state reference equality checks trigger updates
        return [...this.fills].sort((a,b) => b.timestamp - a.timestamp);
    }

    public getOrders(): FlowOrder[] {
        // Return a copy to ensure React state reference equality checks trigger updates
        return [...this.orders].sort((a,b) => b.timestamp - a.timestamp);
    }

    public subscribe(cb: () => void) {
        this.listeners.push(cb);
        return () => {
            this.listeners = this.listeners.filter(l => l !== cb);
        };
    }

    private notify() {
        this.listeners.forEach(cb => cb());
    }
}

export default new FlowDataService();
