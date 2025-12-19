
import { useState, useEffect, useMemo } from 'react';
import { usePortfolioData } from './usePortfolioData';
import strategyService from '../services/strategyService';
import { StrategyInstance, LivePosition } from '../types';

export const useStrategyAnalytics = () => {
  const { groups, loading: portfolioLoading } = usePortfolioData();
  const [instances, setInstances] = useState<StrategyInstance[]>([]);

  useEffect(() => {
    if (portfolioLoading) return;

    const allPositions = groups.flatMap(g => g.positions);
    const baseInstances = strategyService.getInstances();

    const enriched = baseInstances.map(strat => {
        const stratPos = allPositions.filter(p => p.strategyId === strat.id);
        
        const gross = stratPos.reduce((acc, p) => acc + p.notionalUsd, 0);
        const net = stratPos.reduce((acc, p) => acc + (p.side === 'LONG' ? p.notionalUsd : -p.notionalUsd), 0);

        return {
            ...strat,
            grossNotionalUsd: gross,
            netNotionalUsd: net
        };
    });

    setInstances(enriched);
  }, [groups, portfolioLoading]);

  return { instances, loading: portfolioLoading };
};
