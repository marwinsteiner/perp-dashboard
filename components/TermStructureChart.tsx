import React, { useState, useMemo } from 'react';
import { CurvePoint } from '../types';

interface TermStructureChartProps {
  data: CurvePoint[];
  symbol: string;
}

type MarginFilter = 'ALL' | 'USDT' | 'COIN';

const TermStructureChart: React.FC<TermStructureChartProps> = ({ data, symbol }) => {
  const [hoveredPoint, setHoveredPoint] = useState<CurvePoint | null>(null);
  const [marginFilter, setMarginFilter] = useState<MarginFilter>('ALL');

  // Filter Data
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(d => d.marginType === 'SPOT' || marginFilter === 'ALL' || d.marginType === marginFilter);
  }, [data, marginFilter]);

  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-600 font-mono animate-pulse">LOADING CURVE DATA...</div>;

  // Layout Config
  const padding = { top: 40, right: 60, bottom: 40, left: 60 };
  const width = 1000; // viewBox width
  const height = 400; // viewBox height

  // Scales (Recalculate based on filtered data to zoom nicely)
  const maxDte = Math.max(...filteredData.map(d => d.daysToExpiry)) * 1.1; // Add 10% padding
  const maxYield = Math.max(...filteredData.map(d => d.annualizedBasis), 10);
  const minYield = Math.min(...filteredData.map(d => d.annualizedBasis), -5);
  
  // Normalize Y range centered-ish or fitting data
  const yRange = maxYield - minYield;
  const yMax = maxYield + (yRange * 0.1);
  const yMin = minYield - (yRange * 0.1);

  const getX = (dte: number) => padding.left + (dte / maxDte) * (width - padding.left - padding.right);
  const getY = (apr: number) => height - padding.bottom - ((apr - yMin) / (yMax - yMin)) * (height - padding.top - padding.bottom);

  const zeroY = getY(0);

  // Path Generator
  // Sort by DTE again just in case
  const sorted = [...filteredData].sort((a,b) => a.daysToExpiry - b.daysToExpiry);
  const linePoints = sorted.map(d => `${getX(d.daysToExpiry)},${getY(d.annualizedBasis)}`).join(' L ');
  const pathD = `M ${linePoints}`;

  return (
    <div className="w-full h-full bg-black relative border-l border-gray-800 flex flex-col">
      <div className="absolute top-2 left-4 z-20 pointer-events-none">
        <h3 className="text-cyan-500 font-bold text-sm tracking-wider">FUTURES TERM STRUCTURE: {symbol.replace('USDT','')}</h3>
        <p className="text-[10px] text-gray-500">Y-AXIS: IMPLIED APR % (Basis) | X-AXIS: DAYS TO EXPIRY</p>
      </div>

      {/* Margin Type Toggle */}
      <div className="absolute top-2 right-4 z-20 flex gap-2">
          {(['ALL', 'USDT', 'COIN'] as MarginFilter[]).map(filter => (
              <button
                key={filter}
                onClick={() => setMarginFilter(filter)}
                className={`
                    text-[10px] font-bold px-2 py-0.5 border transition-all uppercase
                    ${marginFilter === filter 
                        ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400' 
                        : 'bg-black border-gray-800 text-gray-600 hover:text-gray-400 hover:border-gray-600'}
                `}
              >
                [{filter}]
              </button>
          ))}
      </div>

      <div className="flex-1 min-h-0">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Grid Lines (Horizontal) */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                const val = yMin + (yMax - yMin) * pct;
                const y = getY(val);
                return (
                    <g key={pct}>
                        <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#222" strokeWidth="1" strokeDasharray="4 4" />
                        <text x={padding.left - 10} y={y + 3} textAnchor="end" fill="#555" fontSize="10" fontFamily="monospace">{val.toFixed(1)}%</text>
                    </g>
                );
            })}

            {/* Zero Line */}
            <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="#444" strokeWidth="1" />

            {/* X-Axis Labels */}
            {sorted.map((d, i) => {
                // Show all labels if data points are few (< 12), else skip odd ones to avoid crowding
                if (sorted.length > 12 && i % 2 !== 0 && i !== sorted.length - 1) return null;
                
                const x = getX(d.daysToExpiry);
                return (
                    <g key={`lbl-${i}`}>
                        <line x1={x} y1={height - padding.bottom} x2={x} y2={height - padding.bottom + 5} stroke="#333" />
                        <text x={x} y={height - padding.bottom + 15} textAnchor="middle" fill="#555" fontSize="10" fontFamily="monospace">
                            {d.type === 'SPOT' ? 'SPOT' : d.type === 'PERP' ? 'PERP' : `${Math.round(d.daysToExpiry)}d`}
                        </text>
                    </g>
                )
            })}

            {/* The Curve Line */}
            <path d={pathD} fill="none" stroke="#555" strokeWidth="2" strokeOpacity="0.5" />

            {/* Data Points */}
            {sorted.map((d, i) => {
                const x = getX(d.daysToExpiry);
                const y = getY(d.annualizedBasis);
                const isContango = d.annualizedBasis >= 0;
                
                // Color Code: Spot=Gray, USDT=Green/Red, Coin=Blue/Orange? Or just standard Green/Red
                // Let's distinguish types slightly if ALL is selected
                let strokeColor = isContango ? '#22c55e' : '#ef4444';
                if (d.type === 'SPOT') strokeColor = '#888';
                else if (d.marginType === 'COIN') strokeColor = isContango ? '#3b82f6' : '#f97316'; // Blue/Orange for Coin-M

                return (
                    <g 
                        key={d.symbol} 
                        onMouseEnter={() => setHoveredPoint(d)}
                        onMouseLeave={() => setHoveredPoint(null)}
                        className="cursor-crosshair"
                    >
                        <circle 
                            cx={x} 
                            cy={y} 
                            r={d.type === 'SPOT' ? 3 : 5} 
                            fill="black" 
                            stroke={strokeColor} 
                            strokeWidth="2"
                            className="transition-all duration-200 hover:r-8"
                        />
                        {/* Value Label above point */}
                        <text x={x} y={y - 10} textAnchor="middle" fill={strokeColor} fontSize="10" fontFamily="monospace" fontWeight="bold">
                            {d.type !== 'SPOT' ? d.annualizedBasis.toFixed(1) + '%' : ''}
                        </text>
                    </g>
                );
            })}
        </svg>
      </div>
      
      {/* Hover Modal */}
      {hoveredPoint && (
        <div 
            className="absolute z-50 bg-neutral-900 border border-gray-700 p-3 shadow-xl text-xs font-mono pointer-events-none rounded-sm"
            style={{ 
                left: `${(getX(hoveredPoint.daysToExpiry) / width) * 100}%`, 
                top: `${(getY(hoveredPoint.annualizedBasis) / height) * 100}%`,
                transform: 'translate(-50%, -120%)'
            }}
        >
            <div className="font-bold text-cyan-400 mb-1 border-b border-gray-800 pb-1 flex justify-between">
                <span>{hoveredPoint.symbol}</span>
                <span className="text-gray-500 text-[9px]">{hoveredPoint.marginType}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-300">
                <span className="text-gray-500">Price:</span>
                <span className="text-right">{hoveredPoint.price.toFixed(2)}</span>
                
                <span className="text-gray-500">Type:</span>
                <span className="text-right">{hoveredPoint.type}</span>
                
                <span className="text-gray-500">Expiry:</span>
                <span className="text-right">{hoveredPoint.expiryDate ? new Date(hoveredPoint.expiryDate).toLocaleDateString() : 'N/A'}</span>
                
                <span className="text-gray-500">DTE:</span>
                <span className="text-right">{hoveredPoint.daysToExpiry.toFixed(1)} days</span>
                
                <div className="col-span-2 border-t border-gray-800 my-1"></div>
                
                <span className="text-gray-500">Basis ($):</span>
                <span className={`text-right ${hoveredPoint.basis >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {hoveredPoint.basis.toFixed(2)}
                </span>
                
                <span className="text-gray-500">APR:</span>
                <span className={`text-right font-bold ${hoveredPoint.annualizedBasis >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {hoveredPoint.annualizedBasis.toFixed(2)}%
                </span>
            </div>
        </div>
      )}
    </div>
  );
};

export default TermStructureChart;