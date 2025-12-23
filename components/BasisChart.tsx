
import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CrosshairMode } from 'lightweight-charts';
import marketDataHub from '../services/marketDataHub';
import VenueSelector from './VenueSelector';
import { Venue } from '../types';

interface BasisChartProps {
  symbol: string;
  venue: Venue;
}

const BasisChart: React.FC<BasisChartProps> = ({ symbol, venue: initialVenue }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const [venue, setVenue] = useState<Venue>(initialVenue);
  const [timeframe, setTimeframe] = useState('1m');

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#000' }, textColor: '#888' },
      grid: { vertLines: { color: '#111' }, horzLines: { color: '#111' } },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: { mode: CrosshairMode.Normal }
    });

    const series = chart.addCandlestickSeries({
      upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444'
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const loadData = async () => {
        const bars = await marketDataHub.getKlines(venue, symbol, timeframe, 200);
        series.setData(bars.map(b => ({ time: b.venueTime / 1000 as any, open: b.open, high: b.high, low: b.low, close: b.close })));
        chart.timeScale().fitContent();
    };

    loadData();

    const handleResize = () => {
        if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, venue, timeframe]);

  return (
    <div className="flex flex-col h-full bg-black">
        <div className="bg-neutral-900 border-b border-gray-800 p-1 px-3 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-cyan-500 uppercase">{symbol} CHART</span>
                <VenueSelector activeVenue={venue} onSelect={setVenue} />
             </div>
             <div className="flex gap-2 text-[9px]">
                {['1m', '5m', '15m'].map(t => (
                    <button key={t} onClick={() => setTimeframe(t)} className={`px-2 py-0.5 border ${timeframe === t ? 'border-cyan-500 text-cyan-400 bg-cyan-900/20' : 'border-gray-800 text-gray-600'}`}>
                        {t.toUpperCase()}
                    </button>
                ))}
             </div>
        </div>
        <div ref={chartContainerRef} className="flex-1 w-full" />
    </div>
  );
};

export default BasisChart;
