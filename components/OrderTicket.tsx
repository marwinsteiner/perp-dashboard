
import React, { useState, useEffect, useRef } from 'react';
import paperExecutionService from '../services/paperExecutionService';
import riskConfigService from '../services/riskConfigService';
import BinanceService from '../services/binanceService';
import { usePortfolioData } from '../hooks/usePortfolioData';
import PriceTile from './PriceTile';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface OrderTicketProps {
    contextData?: any;
    onPopOut?: () => void;
    isPoppedOut?: boolean;
}

const OrderTicket: React.FC<OrderTicketProps> = ({ contextData, onPopOut, isPoppedOut }) => {
    // Ticket State
    const [symbol, setSymbol] = useState(contextData?.symbol || 'BTCUSDT');
    const [venue, setVenue] = useState(contextData?.venue || 'PERP_USDT');
    const [side, setSide] = useState<'BUY' | 'SELL'>(contextData?.side || 'BUY');
    const [type, setType] = useState<'MARKET' | 'LIMIT'>('LIMIT');
    const [price, setPrice] = useState<string>('');
    const [qty, setQty] = useState<string>('');
    const [strategyId, setStrategyId] = useState(contextData?.strategyId || 'ARB_DELTA_NEUTRAL');
    const [traderId, setTraderId] = useState(contextData?.traderId || 'ALICE');
    const [tif, setTif] = useState<'GTC' | 'IOC' | 'FOK'>('GTC');

    // Market Data
    const [markPrice, setMarkPrice] = useState<number>(0);
    const [bestBid, setBestBid] = useState<{price: number, size: number}>({price:0, size:0});
    const [bestAsk, setBestAsk] = useState<{price: number, size: number}>({price:0, size:0});
    const serviceRef = useRef<BinanceService | null>(null);

    // Risk State
    const { allPositions } = usePortfolioData();
    const [riskCheck, setRiskCheck] = useState<{ passed: boolean, warning?: string, hardBlock?: boolean, details?: string } | null>(null);

    // Init Logic
    useEffect(() => {
        serviceRef.current = new BinanceService([symbol]);
        serviceRef.current.connect();
        
        let sub;
        if (venue.includes('SPOT')) {
             sub = serviceRef.current.onSpotUpdate((t) => { 
                if(t.symbol===symbol) {
                    const mid = (t.bidPrice+t.askPrice)/2;
                    setMarkPrice(mid);
                    setBestBid({ price: t.bidPrice, size: t.bidQty });
                    setBestAsk({ price: t.askPrice, size: t.askQty });
                }
            });
        } else {
            // For perps, we use futures ticker for mark, but Book Ticker for Bid/Ask
            // BinanceService separates these. We need to manually subscribe to bookTicker for perp if we want tiles.
            // The default BinanceService only subscribes to Mark Price for futures list passed in constructor.
            // We need to upgrade the service or handle a dedicated subscription here.
            // Let's assume BinanceService handles bookticker via a dedicated method we can use.
            
            // Re-using the logic from useFuturesCurve which subscribes to tickers
            serviceRef.current.subscribeCurveTickers([symbol], (d) => {
                 // The callback in service returns simplified {symbol, price(mid)}.
                 // We need raw bid/ask. Let's patch locally or assume best effort mid price for now if strictly adhering to interface,
                 // BUT to satisfy "Best Bid/Ask" requirement, we really need the depth or book ticker.
                 // We will use `subscribeSpotTicker` which actually connects to bookTicker stream, works for Futures if URL is swapped? 
                 // No, BinanceService `subscribeSpotTicker` is hardcoded to spot.
                 
                 // Fallback: Use `subscribeFocus` for full depth/ticker if available or extend service.
                 // For now, we will simulate Bid/Ask around the Mark Price if specific stream unavailable, 
                 // OR better: use `subscribeFocus` which is designed for single symbol drill down.
            });
            
            // Actually, `subscribeFocus` does exactly what we need (Depth/Trade).
            // Let's use `subscribeFocus` to get depth and take top of book.
             serviceRef.current.subscribeFocus(symbol, 
                (depth) => {
                     // Check type
                     if (depth.bids.length > 0) setBestBid({ price: parseFloat(depth.bids[0][0]), size: parseFloat(depth.bids[0][1]) });
                     if (depth.asks.length > 0) setBestAsk({ price: parseFloat(depth.asks[0][0]), size: parseFloat(depth.asks[0][1]) });
                },
                (depth) => {
                    if (depth.bids.length > 0) setBestBid({ price: parseFloat(depth.bids[0][0]), size: parseFloat(depth.bids[0][1]) });
                    if (depth.asks.length > 0) setBestAsk({ price: parseFloat(depth.asks[0][0]), size: parseFloat(depth.asks[0][1]) });
                },
                (trade) => {
                    setMarkPrice(trade.price);
                }
            );
        }

        return () => {
            serviceRef.current?.disconnect();
        };
    }, [symbol, venue]);

    // Update Context
    useEffect(() => {
        if(contextData?.symbol) setSymbol(contextData.symbol);
        if(contextData?.venue) setVenue(contextData.venue);
        if(contextData?.strategyId) setStrategyId(contextData.strategyId);
        if(contextData?.side) setSide(contextData.side);
    }, [contextData]);

    // Risk Check
    useEffect(() => {
        if (!qty || !markPrice) {
            setRiskCheck(null);
            return;
        }
        const notional = parseFloat(qty) * (type === 'MARKET' ? markPrice : (parseFloat(price) || markPrice));
        const check = riskConfigService.checkPreTrade(strategyId, traderId, symbol, venue, notional, allPositions);
        setRiskCheck(check);
    }, [qty, price, type, markPrice, strategyId, traderId, symbol, venue, allPositions]);

    const handleSubmit = () => {
        if (riskCheck?.hardBlock) return;
        const q = parseFloat(qty);
        const p = parseFloat(price);
        if (!q) return;
        const base = symbol.replace('USDT', '');
        
        paperExecutionService.placeOrder(
            symbol, base, venue as any, side, q, type === 'LIMIT' ? p : 0, type, strategyId, traderId, tif
        );
        setQty('');
    };

    const handleQuickSize = (pct: number) => {
        const currentPos = allPositions
            .filter(p => p.symbol === symbol && p.strategyId === strategyId)
            .reduce((acc, p) => acc + (p.side === 'LONG' ? p.quantity : -p.quantity), 0);
        
        if (currentPos === 0) return;
        const closingSide = currentPos > 0 ? 'SELL' : 'BUY';
        setSide(closingSide);
        setQty(Math.abs(currentPos * pct).toString());
    };

    const notional = (parseFloat(qty) || 0) * (parseFloat(price) || markPrice || 0);
    const sideColor = side === 'BUY' ? 'bg-green-600 hover:bg-green-500 border-green-500' : 'bg-red-600 hover:bg-red-500 border-red-500';
    const textColor = side === 'BUY' ? 'text-green-500' : 'text-red-500';

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] min-w-[320px]">
            <div className="p-3 border-b border-gray-800 bg-neutral-900/50 flex justify-between items-start">
                <div>
                    <h3 className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-2">Order Ticket</h3>
                    <div className="flex gap-2 mb-2">
                        <input 
                            value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}
                            className="bg-black border border-gray-700 text-cyan-400 font-bold px-2 py-1 w-24 text-sm outline-none focus:border-cyan-500"
                        />
                        <div className="flex-1 flex items-center justify-end gap-2 text-gray-500">
                                <span className="text-[9px] bg-gray-800 px-1 rounded">{venue}</span>
                        </div>
                    </div>
                </div>
                {onPopOut && !isPoppedOut && (
                    <button onClick={onPopOut} className="text-[9px] text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-0.5 rounded-sm uppercase">
                        Pop Out ⇱
                    </button>
                )}
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* BEST BID/ASK TILES */}
                <div className="flex gap-2 mb-2">
                    <PriceTile label="BEST BID" price={bestBid.price} size={bestBid.size} side="BID" />
                    <PriceTile label="BEST ASK" price={bestAsk.price} size={bestAsk.size} side="ASK" />
                </div>

                <div className="flex bg-gray-900 rounded-sm p-0.5 border border-gray-800">
                    <button 
                        onClick={() => setSide('BUY')}
                        className={`flex-1 py-1 font-bold transition-all ${side === 'BUY' ? 'bg-green-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        BUY
                    </button>
                    <button 
                        onClick={() => setSide('SELL')}
                        className={`flex-1 py-1 font-bold transition-all ${side === 'SELL' ? 'bg-red-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        SELL
                    </button>
                </div>

                {/* Size */}
                <div>
                    <div className="flex justify-between mb-1 text-[9px] text-gray-500 uppercase">
                        <span>Quantity ({symbol.replace('USDT','')})</span>
                        <div className="flex gap-1">
                            <button onClick={() => handleQuickSize(0.25)} className="hover:text-white">25%</button>
                            <button onClick={() => handleQuickSize(0.50)} className="hover:text-white">50%</button>
                            <button onClick={() => handleQuickSize(1.0)} className="hover:text-white">FLAT</button>
                        </div>
                    </div>
                    <input 
                        type="number" value={qty} onChange={e => setQty(e.target.value)}
                        className={`w-full bg-black border border-gray-700 font-bold text-sm px-3 py-2 outline-none focus:border-white ${textColor}`}
                        placeholder="0.00" autoFocus
                    />
                    <div className="text-right text-[10px] text-gray-500 mt-1">
                        Est. Notional: <span className="text-gray-300">{formatUSD(notional)}</span>
                    </div>
                </div>

                {/* Price Type */}
                <div className="flex gap-2">
                        <div className="flex-1">
                        <label className="block text-[9px] text-gray-500 uppercase mb-1">Type</label>
                        <select 
                            value={type} onChange={e => setType(e.target.value as any)}
                            className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1.5 outline-none"
                        >
                            <option value="LIMIT">LIMIT</option>
                            <option value="MARKET">MARKET</option>
                        </select>
                        </div>
                        <div className="w-20">
                        <label className="block text-[9px] text-gray-500 uppercase mb-1">TIF</label>
                        <select 
                            value={tif} onChange={e => setTif(e.target.value as any)}
                            className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1.5 outline-none"
                        >
                            <option value="GTC">GTC</option>
                            <option value="IOC">IOC</option>
                            <option value="FOK">FOK</option>
                        </select>
                        </div>
                </div>

                {/* Price Input */}
                {type === 'LIMIT' && (
                    <div>
                        <label className="block text-[9px] text-gray-500 uppercase mb-1">Limit Price</label>
                        <input 
                            type="number" value={price} onChange={e => setPrice(e.target.value)}
                            className="w-full bg-black border border-gray-700 text-white font-mono px-3 py-2 outline-none focus:border-amber-500"
                        />
                    </div>
                )}

                {/* Attribution */}
                <div className="pt-2 border-t border-gray-800">
                    <div className="mb-2">
                            <label className="block text-[9px] text-gray-500 uppercase mb-1">Strategy</label>
                            <select value={strategyId} onChange={e => setStrategyId(e.target.value)} className="w-full bg-black border border-gray-800 text-xs px-1 py-1 text-gray-300 outline-none">
                            <option value="ARB_DELTA_NEUTRAL">ARB_DELTA_NEUTRAL</option>
                            <option value="TREND_FOLLOW">TREND_FOLLOW</option>
                            <option value="ETH_FUTURES_HEDGE">ETH_FUTURES_HEDGE</option>
                            <option value="MANUAL_DISCRETIONARY">MANUAL_DISCRETIONARY</option>
                            </select>
                    </div>
                    <div>
                            <label className="block text-[9px] text-gray-500 uppercase mb-1">Trader</label>
                            <select value={traderId} onChange={e => setTraderId(e.target.value)} className="w-full bg-black border border-gray-800 text-xs px-1 py-1 text-gray-300 outline-none">
                            <option value="ALICE">ALICE</option>
                            <option value="BOB">BOB</option>
                            <option value="CHARLIE">CHARLIE</option>
                            </select>
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <div className="p-3 border-t border-gray-800 bg-black">
                {riskCheck && !riskCheck.passed && (
                    <div className="mb-2 p-2 bg-red-900/20 border border-red-800 text-[10px] text-red-400">
                        <div className="font-bold flex items-center gap-1">
                            <span>{riskCheck.hardBlock ? '⛔ BLOCKED' : '⚠️ WARNING'}</span>
                        </div>
                        <div>{riskCheck.details}</div>
                    </div>
                )}
                
                <button 
                    onClick={() => handleSubmit()}
                    disabled={riskCheck?.hardBlock || !qty}
                    className={`w-full py-3 text-sm font-bold text-white uppercase shadow-lg transition-all border ${riskCheck?.hardBlock ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : sideColor}`}
                >
                    SUBMIT {side}
                </button>
            </div>
        </div>
    );
};

export default OrderTicket;
