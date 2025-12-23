
import { RiskLimit, RiskOverrideLog } from '../types';
import configService from './configService';

const SEED_LIMITS: RiskLimit[] = [
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

const SEED_BLOCKS = ['STRATEGY_TREND_FOLLOW:SOLUSDT'];

class RiskConfigService {
  private limits: RiskLimit[] = [];
  private blocks: string[] = [];
  private overrideLogs: RiskOverrideLog[] = [];

  constructor() {
    this.init();
  }

  public reset() {
      this.limits = [];
      this.blocks = [];
      this.overrideLogs = [];
      this.init();
  }

  private init() {
    if (configService.isDemoMode) {
      this.limits = JSON.parse(JSON.stringify(SEED_LIMITS));
      this.blocks = [...SEED_BLOCKS];
    } else {
      // Production: Start with empty or fetch from risk engine
      this.limits = [];
      this.blocks = [];
    }
  }

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
