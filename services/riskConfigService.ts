
import { RiskLimit, RiskOverrideLog } from '../types';

class RiskConfigService {
  private limits: RiskLimit[] = [
    { id: 'l1', type: 'DESK', entityId: 'MAIN_DESK', limitNotionalUsd: 10000000, isHardBlock: true },
    { id: 'l2', type: 'STRATEGY', entityId: 'ARB_DELTA_NEUTRAL', limitNotionalUsd: 5000000, isHardBlock: true },
    { id: 'l3', type: 'STRATEGY', entityId: 'TREND_FOLLOW', limitNotionalUsd: 2000000, isHardBlock: false },
    { id: 'l4', type: 'TRADER', entityId: 'ALICE', limitNotionalUsd: 1000000, isHardBlock: true },
    { id: 'l5', type: 'TRADER', entityId: 'BOB', limitNotionalUsd: 1000000, isHardBlock: true },
    { id: 'l6', type: 'SYMBOL', entityId: 'BTCUSDT', limitNotionalUsd: 4000000, isHardBlock: true },
    { id: 'l7', type: 'SYMBOL', entityId: 'ETHUSDT', limitNotionalUsd: 2000000, isHardBlock: true },
    { id: 'l8', type: 'VENUE', entityId: 'SPOT', limitNotionalUsd: 5000000, isHardBlock: false },
    { id: 'l9', type: 'VENUE', entityId: 'PERP_USDT', limitNotionalUsd: 8000000, isHardBlock: true },
  ];

  private blocks: string[] = ['STRATEGY_TREND_FOLLOW:SOLUSDT']; // Example: Trend Follow strategy blocked from SOL

  private overrideLogs: RiskOverrideLog[] = [];

  public getLimits(): RiskLimit[] {
    return this.limits;
  }

  public getBlocks(): string[] {
    return this.blocks;
  }

  public getLogs(): RiskOverrideLog[] {
    return this.overrideLogs;
  }

  public updateLimit(entityId: string, newLimit: number, user: string, reason: string) {
    const limit = this.limits.find(l => l.entityId === entityId);
    if (limit) {
      const log: RiskOverrideLog = {
        timestamp: Date.now(),
        entityId,
        user,
        oldLimit: limit.limitNotionalUsd,
        newLimit,
        reason
      };
      limit.limitNotionalUsd = newLimit;
      this.overrideLogs.push(log);
      console.log(`[MARS] Limit update: ${entityId} set to ${newLimit} by ${user}. Reason: ${reason}`);
    }
  }

  public isStrategyBlocked(strategyId: string, symbol: string): boolean {
    return this.blocks.includes(`${strategyId}:${symbol}`);
  }
}

export default new RiskConfigService();
