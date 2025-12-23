import { Position, Order, Trade, Venue, Side, OrderType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import configService from './configService';
import auditLogService from './auditLogService';

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
    private orders: Order[] = [];
    private trades: Trade[] = [];
    private mockInterval: any = null;

    constructor() {
        this.load();
        if (configService.isDemoMode) {
            this.seedHistoricalFlow();
            this.startMockEngine();
        }
    }

    public reset() {
        this.positions = [];
        this.orders = [];
        this.trades = [];
        if (this.mockInterval) clearInterval(this.mockInterval);
        this.load();
        if (configService.isDemoMode) {
            this.seedHistoricalFlow();
            this.startMockEngine();
        }
    }

    private seedHistoricalFlow() {
        // Generate 100 historical trades across strategies to populate analytics immediately
        const strategies = ['ARB_DELTA_NEUTRAL', 'TREND_FOLLOW', 'HFT_LIQUIDITY'];
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
        const now = Date.now();

        for (let i = 0; i < 100; i++) {
            const time = now - (100 * 60000) + (i * 60000); // spread over last ~100 mins
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            const strat = strategies[Math.floor(Math.random() * strategies.length)];
            const side = Math.random() > 0.5 ? 'LONG' : 'SHORT';
            const price = 2000 + Math.random() * 50000;
            const arrivalPrice = price * (1 + (Math.random() - 0.5) * 0.001); // Random slippage baseline

            const order: Order = {
                id: `hist-ord-${i}`,
                symbol,
                venue: 'BINANCE_USDT_M',
                side,
                qty: Math.random() * 5,
                price,
                arrivalPrice,
                type: 'MARKET',
                status: 'FILLED',
                filledQty: Math.random() * 5,
                avgFillPrice: price,
                timestamp: time,
                firstFillTime: time + 50,
                fullFillTime: time + 100,
                strategyId: strat,
                traderId: 'SIM_BOT'
            };
            this.orders.push(order);

            const trade: Trade = {
                id: `hist-trd-${i}`,
                venue: 'BINANCE_USDT_M',
                symbol,
                type: 'TRADE',
                price,
                qty: order.qty,
                time: time + 100,
                venueTime: time + 100,
                isBuyerMaker: side === 'SHORT',
                orderId: order.id
            };
            this.trades.push(trade);
        }
    }

    private startMockEngine() {
        this.mockInterval = setInterval(() => {
            const roll = Math.random();
            if (roll > 0.7) { // 30% chance every 2s to place a new mock order
                const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'];
                const strats = ['ARB_DELTA_NEUTRAL', 'TREND_FOLLOW', 'LIQUIDITY_BOT'];
                const symbol = symbols[Math.floor(Math.random() * symbols.length)];
                const strat = strats[Math.floor(Math.random() * strats.length)];
                const side = Math.random() > 0.5 ? 'LONG' : 'SHORT';
                
                // Simple price simulation
                const basePrice = symbol === 'BTCUSDT' ? 96000 : symbol === 'ETHUSDT' ? 2600 : 150;
                const arrivalPrice = basePrice * (1 + (Math.random() - 0.5) * 0.01);

                this.placeOrder({
                    symbol,
                    venue: 'BINANCE_USDT_M',
                    side,
                    qty: Math.random() * 2,
                    type: 'MARKET',
                    arrivalPrice,
                    strategyId: strat,
                    traderId: 'SIM_BOT'
                });
            }
        }, 2000);
    }

    private load() {
        if (configService.isDemoMode) {
             const storedPos = localStorage.getItem('termifi_paper_positions');
             const storedOrd = localStorage.getItem('termifi_paper_orders');
             const storedTrd = localStorage.getItem('termifi_paper_trades');

             if (storedPos) try { this.positions = JSON.parse(storedPos); } catch (e) { this.positions = []; }
             if (storedOrd) try { this.orders = JSON.parse(storedOrd); } catch (e) { this.orders = []; }
             if (storedTrd) try { this.trades = JSON.parse(storedTrd); } catch (e) { this.trades = []; }
             
             if (this.positions.length === 0) {
                this.positions = SEED_POSITIONS;
                this.save();
             }
        } else {
             this.positions = [];
             this.orders = [];
             this.trades = [];
        }
    }

    private save() {
        if (configService.isDemoMode) {
            localStorage.setItem('termifi_paper_positions', JSON.stringify(this.positions));
            localStorage.setItem('termifi_paper_orders', JSON.stringify(this.orders));
            localStorage.setItem('termifi_paper_trades', JSON.stringify(this.trades));
        }
    }

    public getPositions(): Position[] { return this.positions; }
    public getOrders(): Order[] { return this.orders; }
    public getTrades(): Trade[] { return this.trades; }

    public placeOrder(orderReq: { 
        symbol: string, venue: Venue, side: Side, 
        qty: number, type: OrderType, price?: number, 
        arrivalPrice?: number,
        traderId?: string, strategyId?: string 
    }) {
        const order: Order = {
            id: uuidv4(),
            symbol: orderReq.symbol,
            venue: orderReq.venue,
            side: orderReq.side,
            qty: orderReq.qty,
            price: orderReq.price,
            arrivalPrice: orderReq.arrivalPrice,
            type: orderReq.type,
            status: 'NEW',
            filledQty: 0,
            avgFillPrice: 0,
            timestamp: Date.now(),
            traderId: orderReq.traderId || 'MANUAL',
            strategyId: orderReq.strategyId || 'DISCRETIONARY'
        };

        this.orders.push(order);
        auditLogService.log('OMS', 'COMMAND', `Order Placed: ${order.side} ${order.qty} ${order.symbol} @ ${order.type === 'MARKET' ? 'MKT' : order.price}`, order.traderId);

        if (order.type === 'MARKET') {
            const slippageFactor = 1 + (Math.random() - 0.5) * 0.0005; // Tight mock slippage
            const execPrice = (orderReq.arrivalPrice || order.price || 100000) * slippageFactor;
            setTimeout(() => this.fillOrder(order, execPrice), 50);
        }

        this.save();
        return order;
    }

    public cancelOrder(orderId: string) {
        const order = this.orders.find(o => o.id === orderId);
        if (order && (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED')) {
            order.status = 'CANCELLED';
            auditLogService.log('OMS', 'COMMAND', `Order Cancelled: ${orderId}`, 'SYSTEM');
            this.save();
        }
    }

    private fillOrder(order: Order, executionPrice: number) {
        order.status = 'FILLED';
        order.filledQty = order.qty;
        order.avgFillPrice = executionPrice;
        order.firstFillTime = Date.now();
        order.fullFillTime = Date.now();

        const trade: Trade = {
            id: uuidv4(),
            venue: order.venue,
            symbol: order.symbol,
            type: 'TRADE',
            price: executionPrice,
            qty: order.qty,
            time: Date.now(),
            venueTime: Date.now(),
            isBuyerMaker: order.side === 'SHORT',
            orderId: order.id
        };

        this.trades.push(trade);
        this.updatePosition(trade, order);
        
        auditLogService.log('OMS', 'TRADE', `Order Filled: ${order.id} ${order.qty} @ ${executionPrice.toFixed(2)}`, 'MATCHING_ENGINE');
        this.save();
    }

    private updatePosition(trade: Trade, order: Order) {
        if (order.side === 'FLAT') return;

        const existing = this.positions.find(p => p.symbol === order.symbol && p.venue === order.venue && p.strategyId === order.strategyId);
        
        if (existing) {
            if (existing.side === order.side) {
                const totalQty = existing.quantity + trade.qty;
                const totalVal = (existing.quantity * existing.avgEntryPrice) + (trade.qty * trade.price);
                existing.quantity = totalQty;
                existing.avgEntryPrice = totalVal / totalQty;
            } else {
                if (trade.qty > existing.quantity) {
                    const flipQty = trade.qty - existing.quantity;
                    existing.side = order.side as any;
                    existing.quantity = flipQty;
                    existing.avgEntryPrice = trade.price;
                } else if (trade.qty === existing.quantity) {
                    this.positions = this.positions.filter(p => p.id !== existing.id);
                } else {
                    existing.quantity -= trade.qty;
                }
            }
        } else {
            const newPos: Position = {
                id: uuidv4(),
                baseAsset: order.symbol.replace('USDT', ''),
                symbol: order.symbol,
                venue: order.venue,
                side: order.side as any,
                quantity: trade.qty,
                avgEntryPrice: trade.price,
                timestamp: Date.now(),
                strategyId: order.strategyId,
                traderId: order.traderId
            };
            this.positions.push(newPos);
        }
    }
}

export default new PaperExecutionService();