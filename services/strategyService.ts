
import { StrategyInstance, StrategyLog, StrategyState } from '../types';
import auditLogService from './auditLogService';
import configService from './configService';

const SEED_STRATEGIES: StrategyInstance[] = [
  {
    id: 'ARB_DELTA_NEUTRAL',
    name: 'Basis Arb Delta Neutral',
    family: 'ARBITRAGE',
    desk: 'MAIN_DESK',
    owner: 'ALICE',
    venues: ['BINANCE_SPOT', 'BINANCE_PERP'],
    instruments: ['BTCUSDT', 'ETHUSDT'],
    state: 'RUNNING',
    rejectRate: 0.02,
    avgSlippageBps: 0.5,
    medianTimeToFillMs: 45,
    lastTickAgeMs: 12,
    pnlDay: 12450,
    pnlMtd: 84200,
    hitRate: 64,
    avgTradeSizeUsd: 25000,
    sharpeRatio: 3.2,
    profitFactor: 2.1,
    riskFlags: []
  },
  {
    id: 'TREND_FOLLOW',
    name: 'Trend Following V2',
    family: 'DIRECTIONAL',
    desk: 'MAIN_DESK',
    owner: 'BOB',
    venues: ['BINANCE_PERP'],
    instruments: ['SOLUSDT', 'ETHUSDT'],
    state: 'PAUSED',
    rejectRate: 1.5,
    avgSlippageBps: 2.1,
    medianTimeToFillMs: 120,
    lastTickAgeMs: 85,
    pnlDay: -2400,
    pnlMtd: 42000,
    hitRate: 48,
    avgTradeSizeUsd: 12000,
    sharpeRatio: 1.8,
    profitFactor: 1.4,
    riskFlags: ['HIGH_REJECT_RATE']
  }
];

class StrategyService {
  private instances: StrategyInstance[] = [];
  private logs: StrategyLog[] = [];

  constructor() {
    this.init();
  }

  public reset() {
      this.instances = [];
      this.logs = [];
      this.init();
  }

  private init() {
    if (configService.isDemoMode) {
      this.instances = JSON.parse(JSON.stringify(SEED_STRATEGIES));
    } else {
      // In Production, this would fetch from a backend API
      this.instances = [];
    }
  }

  public getInstances(): StrategyInstance[] {
    return this.instances;
  }

  public getLogs(): StrategyLog[] {
    return this.logs;
  }

  public updateState(strategyId: string, newState: StrategyState, user: string, reason: string) {
    const strat = this.instances.find(s => s.id === strategyId);
    if (strat) {
      const oldState = strat.state;
      strat.state = newState;
      
      const log: StrategyLog = {
        timestamp: Date.now(),
        strategyId,
        user,
        action: `STATE_TRANSITION`,
        oldState,
        newState,
        reason
      };
      this.logs.push(log);
      auditLogService.log('STRATEGY_ENGINE', 'COMMAND', `Strategy ${strategyId} moved ${oldState} -> ${newState}: ${reason}`, user);
    }
  }

  public kill(strategyId: string, user: string, reason: string) {
    this.updateState(strategyId, 'ERROR', user, `EMERGENCY_KILL: ${reason}`);
  }

  public softKill(strategyId: string, user: string, reason: string) {
    this.updateState(strategyId, 'DRAINING', user, `SOFT_KILL: ${reason}`);
  }

  public halt(strategyId: string, user: string, reason: string) {
    this.updateState(strategyId, 'PAUSED', user, `HALT: ${reason}`);
  }

  public updateParams(strategyId: string, params: Record<string, any>, user: string) {
      const strat = this.instances.find(s => s.id === strategyId);
      if (strat) {
          auditLogService.log('STRATEGY_ENGINE', 'COMMAND', `Parameters updated for ${strategyId}`, user, params);
      }
  }
}

export default new StrategyService();
