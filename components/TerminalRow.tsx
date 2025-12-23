import React, { memo } from 'react';
import { CombinedMarketData } from '../types';

interface TerminalRowProps {
  data: CombinedMarketData;
  isSelected: boolean;
  innerRef?: React.Ref<HTMLTableRowElement>;
}

const formatPrice = (price: number | undefined) => {
  if (price === undefined) return '---';
  if (price > 1000) return price.toFixed(2);
  if (price > 1) return price.toFixed(4);
  return price.toFixed(6);
};

const TerminalRow: React.FC<TerminalRowProps> = memo(({ data, isSelected, innerRef }) => {
  // Fix: Destructure properties that actually exist on CombinedMarketData
  const { symbol, quote, markPrice, fundingRate } = data;

  const bid = quote?.bidPrice;
  const ask = quote?.askPrice;
  const mark = markPrice;
  const funding = fundingRate;

  const spreadBps = (bid && ask && bid > 0) ? ((ask - bid) / bid) * 10000 : 0;
  const basis = (mark && bid && ask) ? mark - ((bid + ask) / 2) : 0;
  const basisPercent = (mark && bid && ask) ? (basis / ((bid + ask) / 2)) * 100 : 0;
  const fundingRatePercent = funding ? funding * 100 : 0;
  const fundingAnnual = funding ? funding * 3 * 365 * 100 : 0;

  return (
    <tr 
      ref={innerRef}
      className={`
        border-b border-gray-800 font-mono text-sm cursor-pointer
        transition-colors duration-75
        ${isSelected ? 'bg-cyan-900/30' : 'hover:bg-gray-900'}
      `}
    >
      <td className={`px-4 py-1 font-bold border-r border-gray-800 ${isSelected ? 'text-white' : 'text-cyan-300'}`}>
        {isSelected && <span className="text-cyan-500 mr-1">▶</span>}
        {symbol.replace('USDT', '')}
      </td>
      
      <td className="px-4 py-1 text-right text-green-400 border-r border-gray-800">
        {formatPrice(bid)}
      </td>

      <td className="px-4 py-1 text-right text-red-400 border-r border-gray-800">
        {formatPrice(ask)}
      </td>

      <td className={`px-4 py-1 text-right border-r border-gray-800 ${spreadBps > 5 ? 'text-yellow-500' : 'text-fuchsia-400'}`}>
        {spreadBps.toFixed(2)}
      </td>

      <td className="px-4 py-1 text-right text-yellow-300 border-r border-gray-800">
        {formatPrice(mark)}
      </td>

      <td className={`px-4 py-1 text-right border-r border-gray-800 ${basis > 0 ? 'text-green-400' : 'text-red-400'}`}>
         {basisPercent.toFixed(4)}%
      </td>

      <td className={`px-4 py-1 text-right ${fundingRatePercent > 0 ? 'text-green-500' : 'text-red-500'}`}>
        {fundingRatePercent.toFixed(4)}%
        <span className="text-xs text-gray-500 ml-2">
           {fundingAnnual.toFixed(1)}%
        </span>
      </td>
    </tr>
  );
});

export default TerminalRow;