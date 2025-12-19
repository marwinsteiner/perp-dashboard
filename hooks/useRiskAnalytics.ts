

import { useState, useEffect, useMemo } from 'react';
import { usePortfolioData } from './usePortfolioData';
import riskConfigService from '../services/riskConfigService';
import { RiskNode, LivePosition, RiskLimit } from '../types';

export const useRiskAnalytics = () => {
  const { groups, loading: portfolioLoading } = usePortfolioData();
  const [nodes, setNodes] = useState<RiskNode[]>([]);
  const [limits, setLimits] = useState<RiskLimit[]>([]);

  useEffect(() => {
    if (portfolioLoading) return;

    const allPositions = groups.flatMap(g => g.positions);
    const currentLimits = riskConfigService.getLimits();
    setLimits(currentLimits);

    const getLimit = (type: string, entityId: string) => 
        currentLimits.find(l => l.type === type && l.entityId === entityId)?.limitNotionalUsd || 1000000;

    // --- Aggregate Hierarchy ---
    // Desk (Root) -> Strategy -> Trader -> Asset -> Venue

    const buildTree = (): RiskNode[] => {
      // Fix: Added explicit <string> generic to Set to ensure 'strategies' is string[] and not unknown[]
      const strategies = Array.from(new Set<string>(allPositions.map(p => p.strategyId || 'UNASSIGNED')));
      
      const strategyNodes: RiskNode[] = strategies.map(stratId => {
        const stratPositions = allPositions.filter(p => (p.strategyId || 'UNASSIGNED') === stratId);
        // Fix: Added explicit <string> generic to Set
        const traders = Array.from(new Set<string>(stratPositions.map(p => p.traderId || 'HOUSE')));

        const traderNodes: RiskNode[] = traders.map(traderId => {
          const traderPositions = stratPositions.filter(p => (p.traderId || 'HOUSE') === traderId);
          // Fix: Added explicit <string> generic to Set
          const assets = Array.from(new Set<string>(traderPositions.map(p => p.baseAsset)));

          const assetNodes: RiskNode[] = assets.map(base => {
            const assetPositions = traderPositions.filter(p => p.baseAsset === base);
            // Fix: Added explicit <string> generic to Set
            const venues = Array.from(new Set<string>(assetPositions.map(p => p.venue)));

            const venueNodes: RiskNode[] = venues.map(venue => {
              const pos = assetPositions.filter(p => p.venue === venue);
              const gross = pos.reduce((acc, p) => acc + p.notionalUsd, 0);
              const net = pos.reduce((acc, p) => acc + (p.side === 'LONG' ? p.notionalUsd : -p.notionalUsd), 0);
              const long = pos.reduce((acc, p) => acc + (p.side === 'LONG' ? p.notionalUsd : 0), 0);
              const short = pos.reduce((acc, p) => acc + (p.side === 'SHORT' ? p.notionalUsd : 0), 0);
              const limit = getLimit('VENUE', venue);
              
              return {
                id: `${stratId}-${traderId}-${base}-${venue}`,
                name: venue,
                type: 'VENUE',
                grossExposureUsd: gross,
                netExposureUsd: net,
                longExposureUsd: long,
                shortExposureUsd: short,
                limitUsd: limit,
                utilization: gross / limit,
                isBreached: gross > limit,
                isBlocked: riskConfigService.isStrategyBlocked(stratId, venue)
              };
            });

            const assetGross = venueNodes.reduce((acc, n) => acc + n.grossExposureUsd, 0);
            const assetLimit = getLimit('SYMBOL', `${base}USDT`);
            return {
              id: `${stratId}-${traderId}-${base}`,
              name: base,
              type: 'SYMBOL',
              grossExposureUsd: assetGross,
              netExposureUsd: venueNodes.reduce((acc, n) => acc + n.netExposureUsd, 0),
              longExposureUsd: venueNodes.reduce((acc, n) => acc + n.longExposureUsd, 0),
              shortExposureUsd: venueNodes.reduce((acc, n) => acc + n.shortExposureUsd, 0),
              limitUsd: assetLimit,
              utilization: assetGross / assetLimit,
              isBreached: assetGross > assetLimit,
              children: venueNodes,
              isBlocked: riskConfigService.isStrategyBlocked(stratId, `${base}USDT`)
            };
          });

          const traderGross = assetNodes.reduce((acc, n) => acc + n.grossExposureUsd, 0);
          const traderLimit = getLimit('TRADER', traderId);
          return {
            id: `${stratId}-${traderId}`,
            name: traderId,
            type: 'TRADER',
            grossExposureUsd: traderGross,
            netExposureUsd: assetNodes.reduce((acc, n) => acc + n.netExposureUsd, 0),
            longExposureUsd: assetNodes.reduce((acc, n) => acc + n.longExposureUsd, 0),
            shortExposureUsd: assetNodes.reduce((acc, n) => acc + n.shortExposureUsd, 0),
            limitUsd: traderLimit,
            utilization: traderGross / traderLimit,
            isBreached: traderGross > traderLimit,
            children: assetNodes
          };
        });

        const stratGross = traderNodes.reduce((acc, n) => acc + n.grossExposureUsd, 0);
        const stratLimit = getLimit('STRATEGY', stratId);
        return {
          id: stratId,
          name: stratId.replace(/_/g, ' '),
          type: 'STRATEGY',
          grossExposureUsd: stratGross,
          netExposureUsd: traderNodes.reduce((acc, n) => acc + n.netExposureUsd, 0),
          longExposureUsd: traderNodes.reduce((acc, n) => acc + n.longExposureUsd, 0),
          shortExposureUsd: traderNodes.reduce((acc, n) => acc + n.shortExposureUsd, 0),
          limitUsd: stratLimit,
          utilization: stratGross / stratLimit,
          isBreached: stratGross > stratLimit,
          children: traderNodes
        };
      });

      const deskGross = strategyNodes.reduce((acc, n) => acc + n.grossExposureUsd, 0);
      const deskLimit = getLimit('DESK', 'MAIN_DESK');
      
      const deskNode: RiskNode = {
        id: 'MAIN_DESK',
        name: 'GLOBAL DESK',
        type: 'DESK',
        grossExposureUsd: deskGross,
        netExposureUsd: strategyNodes.reduce((acc, n) => acc + n.netExposureUsd, 0),
        longExposureUsd: strategyNodes.reduce((acc, n) => acc + n.longExposureUsd, 0),
        shortExposureUsd: strategyNodes.reduce((acc, n) => acc + n.shortExposureUsd, 0),
        limitUsd: deskLimit,
        utilization: deskGross / deskLimit,
        isBreached: deskGross > deskLimit,
        children: strategyNodes
      };

      return [deskNode];
    };

    setNodes(buildTree());
  }, [groups, portfolioLoading]);

  return { nodes, limits, loading: portfolioLoading };
};
