
import React, { useState, useMemo } from 'react';
import { useFuturesCurve } from '../hooks/useFuturesCurve';
import VenueSelector from './VenueSelector';
import { Venue } from '../types';

interface TermStructureChartProps {
  symbol: string;
  venue: Venue;
}

const TermStructureChart: React.FC<TermStructureChartProps> = ({ symbol, venue: initialVenue }) => {
  const [venue, setVenue] = useState<Venue>(initialVenue);
  const { curveData, loading } = useFuturesCurve(symbol, venue);

  const padding = { top: 60, right: 60, bottom: 40, left: 60 };
  const width = 1000, height = 400;

  const maxDte = Math.max(...curveData.map(d => d.daysToExpiry), 1);
  const maxYield = Math.max(...curveData.map(d => d.annualizedBasis), 5);
  const minYield = Math.min(...curveData.map(d => d.annualizedBasis), -2);
  
  const getX = (dte: number) => padding.left + (dte / maxDte) * (width - padding.left - padding.right);
  const getY = (apr: number) => height - padding.bottom - ((apr - minYield) / (maxYield - minYield)) * (height - padding.top - padding.bottom);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      <div className="bg-neutral-900 border-b border-gray-800 p-1 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
            <h3 className="text-cyan-500 font-bold text-xs tracking-wider uppercase">CURVE: {symbol.replace('USDT','')}</h3>
            <VenueSelector activeVenue={venue} onSelect={setVenue} />
        </div>
        {loading && <span className="text-[9px] text-cyan-600 animate-pulse uppercase">Syncing Curve...</span>}
      </div>

      <div className="flex-1 relative min-h-0 bg-black/40">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <line x1={padding.left} y1={getY(0)} x2={width - padding.right} y2={getY(0)} stroke="#222" />
            {curveData.map((d, i) => (
                <circle key={i} cx={getX(d.daysToExpiry)} cy={getY(d.annualizedBasis)} r="4" fill={d.annualizedBasis >= 0 ? '#10b981' : '#ef4444'} />
            ))}
            {curveData.length > 1 && (
                <path d={`M ${curveData.map(d => `${getX(d.daysToExpiry)},${getY(d.annualizedBasis)}`).join(' L ')}`} fill="none" stroke="#333" strokeWidth="1" />
            )}
        </svg>
      </div>
    </div>
  );
};

export default TermStructureChart;
