
import { StrategyInstance, StrategyLog, StrategyState } from '../types';

class StrategyService {
  private instances: StrategyInstance[] = [
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
    },
    {
      id: 'ETH_FUTURES_HEDGE',
      name: 'ETH Dated Hedge',
      family: 'HEDGE',
      desk: 'MAIN_DESK',
      owner: 'ALICE',
      venues: ['BINANCE_FUTURE'],
      instruments: ['ETHUSDT_250328'],
      state: 'RUNNING',
      rejectRate: 0.0,
      avgSlippageBps: 0.1,
      medianTimeToFillMs: 200,
      lastTickAgeMs: 1200, // Stale?
      pnlDay: 450,
      pnlMtd: -1200,
      hitRate: 100,
      avgTradeSizeUsd: 50000,
      sharpeRatio: 0.5,
      profitFactor: 1.1,
      riskFlags: ['STALE_DATA_FEED']
    }
  ];

  private logs: StrategyLog[] = [];

  public getInstances(): StrategyInstance[] {
    return this.instances;
  }

  public getLogs(): StrategyLog[] {
    return this.logs;
  }

  public updateState(strategyId: string, newState: StrategyState, user: string, reason: string) {
    const strat = this.instances.find(s => s.id === strategyId);
    if (strat) {
      const log: StrategyLog = {
        timestamp: Date.now(),
        strategyId,
        user,
        action: `STATE_CHANGE: ${newState}`,
        oldState: strat.state,
        newState,
        reason
      };
      strat.state = newState;
      this.logs.push(log);
      console.log(`[STRAT] ${strategyId} transitioned to ${newState} by ${user}. Reason: ${reason}`);
    }
  }

  public updateRiskTarget(strategyId: string, param: string, value: string, user: string, reason: string) {
      const log: StrategyLog = {
        timestamp: Date.now(),
        strategyId,
        user,
        action: `PARAM_CHANGE: ${param}=${value}`,
        reason
      };
      this.logs.push(log);
      console.log(`[STRAT] ${strategyId} param ${param} updated to ${value} by ${user}`);
  }
}

export default new StrategyService();
