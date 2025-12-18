import React from 'react';
import { FocusMetrics } from '../types';

const MetricBox = ({ label, v1m, v5m, format }: { label: string, v1m: number, v5m: number, format: 'pct' | 'bps' }) => {
  const getColor = (val: number) => {
      if (Math.abs(val) < 0.01) return 'text-gray-400';
      return val > 0 ? 'text-green-400' : 'text-red-400';
  };
  
  // Opacity based on magnitude
  const getIntensity = (val: number) => {
    const abs = Math.abs(val);
    if (format === 'pct') return abs > 1 ? 'font-bold' : 'font-normal';
    return abs > 10 ? 'font-bold' : 'font-normal';
  };

  const str = (v: number) => format === 'pct' ? `${v > 0 ? '+' : ''}${v.toFixed(3)}%` : `${v > 0 ? '+' : ''}${v.toFixed(1)}`;

  return (
    <div className="flex flex-col bg-gray-900/50 p-2 border border-gray-800">
      <span className="text-[9px] text-gray-500 uppercase mb-1">{label}</span>
      <div className="flex justify-between items-baseline text-[10px]">
        <span className="text-gray-600">1m</span>
        <span className={`${getColor(v1m)} ${getIntensity(v1m)} font-mono`}>{str(v1m)}</span>
      </div>
      <div className="flex justify-between items-baseline text-[10px]">
        <span className="text-gray-600">5m</span>
        <span className={`${getColor(v5m)} ${getIntensity(v5m)} font-mono`}>{str(v5m)}</span>
      </div>
    </div>
  );
};

const MetricsPanel: React.FC<{ metrics: FocusMetrics | null }> = ({ metrics }) => {
  if (!metrics) return <div className="p-2 text-[10px] text-gray-600 text-center">Loading Metrics...</div>;

  // Basis Change Calculation (Approximate derived from stored refs + current implied prices is handled in hook, but let's assume hook provides raw deltas)
  // Actually, hook provides simple deltas.
  // We need to calculate basis change. 
  // Spot Change % approx ~ S_delta. Perp Change % approx ~ P_delta.
  // Basis approx change ~ P_delta - S_delta. 
  // Let's use that approximation for display if the hook doesn't provide exact bps.
  // The hook provides {spotChange1m, ...}
  
  const b1m = (metrics.perpChange1m - metrics.spotChange1m) * 100; // rough bps approx
  const b5m = (metrics.perpChange5m - metrics.spotChange5m) * 100;

  return (
    <div className="grid grid-cols-3 gap-2 p-2">
      <MetricBox label="Spot Move" v1m={metrics.spotChange1m} v5m={metrics.spotChange5m} format="pct" />
      <MetricBox label="Mark Move" v1m={metrics.perpChange1m} v5m={metrics.perpChange5m} format="pct" />
      <MetricBox label="Basis Δ (bps)" v1m={b1m} v5m={b5m} format="bps" />
    </div>
  );
};

export default MetricsPanel;
