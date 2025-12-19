
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode, LineStyle } from 'lightweight-charts';
import BinanceService from '../services/binanceService';
import { Kline } from '../types';

interface BasisChartProps {
  symbol: string;
  service: BinanceService;
}

type Timeframe = '1m' | '5m' | '15m';

const BasisChart: React.FC<BasisChartProps> = ({ symbol, service }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');

  const spotSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const perpSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const basisSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const fundingSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Store latest candle data to compute basis in real-time
  const latestRef = useRef<{ spot: any, perp: any }>({ spot: null, perp: null });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#050505' },
        textColor: '#888',
      },
      grid: {
        vertLines: { color: '#111' },
        horzLines: { color: '#111' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      }
    });

    chartRef.current = chart;

    // 2. Add Series

    // A) Spot Price (Standard Candles)
    const spotSeries = chart.addCandlestickSeries({
      upColor: '#16a34a', // Green
      downColor: '#dc2626', // Red
      borderVisible: false,
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      priceScaleId: 'right', // Main scale
    });
    spotSeriesRef.current = spotSeries;

    // B) Perp Price (Hollow Candles / Different Style)
    const perpSeries = chart.addCandlestickSeries({
      upColor: 'rgba(0,0,0,0)', // Transparent body
      downColor: 'rgba(0,0,0,0)',
      borderVisible: true,
      borderUpColor: '#facc15', // Yellow
      borderDownColor: '#3b82f6', // Blue
      wickUpColor: '#facc15',
      wickDownColor: '#3b82f6',
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      priceScaleId: 'right', // Share scale with spot to show divergence
    });
    perpSeriesRef.current = perpSeries;

    // C) Basis (BPS) - Separate Pane
    const basisSeries = chart.addAreaSeries({
      topColor: 'rgba(34, 197, 94, 0.56)', // Greenish
      bottomColor: 'rgba(239, 68, 68, 0.56)', // Reddish
      lineColor: 'rgba(0, 0, 0, 0)',
      lineWidth: 1,
      priceScaleId: 'basis',
      priceFormat: { type: 'custom', formatter: (p: number) => `${p.toFixed(2)} bps` }
    });
    basisSeriesRef.current = basisSeries;
    
    // Configure Basis Pane (Bottom 25%)
    chart.priceScale('basis').applyOptions({
      scaleMargins: {
        top: 0.75, // Occupy bottom 25%
        bottom: 0,
      },
    });
    // Configure Main Price Pane (Top 70%)
    chart.priceScale('right').applyOptions({
        scaleMargins: {
            top: 0.05,
            bottom: 0.3, // Leave space for basis
        }
    });

    // D) Funding Rate
    const fundingSeries = chart.addHistogramSeries({
        color: '#f97316', // Orange
        priceScaleId: 'funding',
        priceFormat: { type: 'custom', formatter: (p: number) => `${p.toFixed(4)}%` }
    });
    fundingSeriesRef.current = fundingSeries;

    chart.priceScale('funding').applyOptions({
        scaleMargins: {
            top: 0.75,
            bottom: 0,
        },
        visible: false // Hide scale axis to avoid clutter, just show bars
    });

    // 3. Load Initial Data & Start Subscription
    let unsubSpot: () => void;
    let unsubFutures: () => void;

    const loadData = async () => {
        try {
            const [spotKlines, perpKlines, fundingHistory] = await Promise.all([
                service.getKlines(symbol, 'SPOT', timeframe, 300),
                service.getKlines(symbol, 'FUTURES', timeframe, 300),
                service.getFundingRateHistory(symbol)
            ]);

            // Format Candles
            const spotData = spotKlines.map(k => ({
                time: k.openTime / 1000 as any,
                open: k.open, high: k.high, low: k.low, close: k.close
            }));
            const perpData = perpKlines.map(k => ({
                time: k.openTime / 1000 as any,
                open: k.open, high: k.high, low: k.low, close: k.close
            }));

            // Sync refs for Basis calculation
            if (spotData.length > 0) latestRef.current.spot = spotData[spotData.length - 1];
            if (perpData.length > 0) latestRef.current.perp = perpData[perpData.length - 1];

            // Format Basis (Perp Close - Spot Close in BPS)
            const basisData: any[] = [];
            const timestampMap = new Map<any, number>();
            spotData.forEach(s => timestampMap.set(s.time, s.close));
            
            perpData.forEach(p => {
                const spotClose = timestampMap.get(p.time);
                if (typeof spotClose === 'number' && spotClose !== 0) {
                    const basisBps = ((p.close - spotClose) / spotClose) * 10000;
                    basisData.push({
                        time: p.time,
                        value: basisBps,
                        topColor: basisBps > 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.0)',
                        bottomColor: basisBps > 0 ? 'rgba(34, 197, 94, 0.0)' : 'rgba(239, 68, 68, 0.4)',
                        lineColor: basisBps > 0 ? '#22c55e' : '#ef4444'
                    });
                }
            });

            // Format Funding
            const fundingData = fundingHistory.map(f => ({
                time: f.fundingTime / 1000 as any,
                value: f.fundingRate * 100, // as percentage
                color: f.fundingRate > 0 ? '#f97316' : '#22d3ee'
            })).sort((a,b) => a.time - b.time);

            spotSeries.setData(spotData);
            perpSeries.setData(perpData);
            basisSeries.setData(basisData);
            fundingSeries.setData(fundingData);

            // --- START WEBSOCKET SUBSCRIPTIONS ---
            
            const handleUpdate = () => {
                // If we have both latest spot and perp for the same timeframe, update Basis
                const s = latestRef.current.spot;
                const p = latestRef.current.perp;
                
                if (s && p) {
                    // Approximate matching of time to update basis real-time
                    // Note: Candle times might drift slightly between exchanges in ms, but usually aligned to second
                    // If times match (same minute start), we update.
                    if (s.time === p.time) {
                        const basisBps = ((p.close - s.close) / s.close) * 10000;
                        basisSeries.update({
                            time: p.time,
                            value: basisBps,
                            topColor: basisBps > 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.0)',
                            bottomColor: basisBps > 0 ? 'rgba(34, 197, 94, 0.0)' : 'rgba(239, 68, 68, 0.4)',
                            lineColor: basisBps > 0 ? '#22c55e' : '#ef4444'
                        });
                    }
                }
            };

            unsubSpot = service.subscribeKline(symbol, 'SPOT', timeframe, (k) => {
                const candle = {
                    time: k.openTime / 1000 as any,
                    open: k.open, high: k.high, low: k.low, close: k.close
                };
                spotSeries.update(candle);
                latestRef.current.spot = candle;
                handleUpdate();
            });

            unsubFutures = service.subscribeKline(symbol, 'FUTURES', timeframe, (k) => {
                const candle = {
                    time: k.openTime / 1000 as any,
                    open: k.open, high: k.high, low: k.low, close: k.close
                };
                perpSeries.update(candle);
                latestRef.current.perp = candle;
                handleUpdate();
            });

        } catch (e) {
            console.error("Failed to load chart data", e);
        }
    };

    loadData();

    // Resize Handler
    const handleResize = () => {
        if (chartContainerRef.current) {
            chart.applyOptions({ 
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight
            });
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (unsubSpot) unsubSpot();
      if (unsubFutures) unsubFutures();
      chart.remove();
    };
  }, [symbol, timeframe]);

  // Keyboard Shortcuts for Timeframe
  useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
          // Only trigger if not typing in an input
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

          if (e.key === '1') setTimeframe('1m');
          if (e.key === '2') setTimeframe('5m');
          if (e.key === '3') setTimeframe('15m');
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex flex-col h-full bg-black border-l border-r border-gray-800 relative">
        <div className="absolute top-2 left-2 z-10 flex gap-2">
             <div className="bg-black/80 px-2 py-1 border border-gray-800 text-[10px] text-gray-400">
                <span className="text-cyan-400 font-bold">{symbol}</span>
                <span className="mx-2">|</span>
                <button onClick={() => setTimeframe('1m')} className={`hover:text-white ${timeframe === '1m' ? 'text-white font-bold' : ''}`}>[1] 1m</button>
                <span className="mx-1"></span>
                <button onClick={() => setTimeframe('5m')} className={`hover:text-white ${timeframe === '5m' ? 'text-white font-bold' : ''}`}>[2] 5m</button>
                <span className="mx-1"></span>
                <button onClick={() => setTimeframe('15m')} className={`hover:text-white ${timeframe === '15m' ? 'text-white font-bold' : ''}`}>[3] 15m</button>
             </div>
        </div>
        
        {/* Legend */}
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end text-[10px] bg-black/50 p-1 pointer-events-none">
            <span className="text-green-500">■ SPOT</span>
            <span className="text-yellow-400 border border-yellow-400/50 px-1 mt-0.5">□ PERP</span>
            <span className="text-gray-400 mt-1">BASIS (BPS)</span>
        </div>

        <div ref={chartContainerRef} className="flex-1 w-full" />
    </div>
  );
};

export default BasisChart;
