
import React, { useEffect, useState, useRef } from 'react';

interface PriceTileProps {
  label: string;
  price: number;
  size: number;
  side: 'BID' | 'ASK';
}

const PriceTile: React.FC<PriceTileProps> = ({ label, price, size, side }) => {
  const [flash, setFlash] = useState<'GREEN' | 'RED' | null>(null);
  const prevPriceRef = useRef(price);

  useEffect(() => {
    if (price > prevPriceRef.current) {
      setFlash('GREEN');
    } else if (price < prevPriceRef.current) {
      setFlash('RED');
    }
    prevPriceRef.current = price;

    const t = setTimeout(() => setFlash(null), 200);
    return () => clearTimeout(t);
  }, [price]);

  const bgClass = flash === 'GREEN' ? 'bg-green-900/60' : flash === 'RED' ? 'bg-red-900/60' : 'bg-gray-900/20';
  const textClass = side === 'BID' ? 'text-green-500' : 'text-red-500';

  return (
    <div className={`flex flex-col flex-1 p-2 border border-gray-800 rounded-sm transition-colors duration-200 ${bgClass}`}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[9px] text-gray-500 uppercase font-bold">{label}</span>
        <span className="text-[9px] text-gray-400 font-mono">{size.toFixed(4)}</span>
      </div>
      <div className={`text-xl font-bold font-mono tracking-tighter ${textClass}`}>
        {price > 0 ? price.toFixed(2) : '---'}
      </div>
    </div>
  );
};

export default PriceTile;
