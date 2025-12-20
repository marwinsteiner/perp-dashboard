
import { Venue, FeedHealth, Quote } from '../types';
import auditLogService from './auditLogService';
import { v4 as uuidv4 } from 'uuid';

class CoreDataService {
  // Fix: Initialize all Venue keys to match the Record<Venue, FeedHealth> type definition
  private health: Record<Venue, FeedHealth> = {
    'BINANCE_SPOT': { venue: 'BINANCE_SPOT', status: 'DISCONNECTED', latencyMs: 0, messageCount: 0, errorCount: 0 },
    'BINANCE_USDT_M': { venue: 'BINANCE_USDT_M', status: 'DISCONNECTED', latencyMs: 0, messageCount: 0, errorCount: 0 },
    'BINANCE_COIN_M': { venue: 'BINANCE_COIN_M', status: 'DISCONNECTED', latencyMs: 0, messageCount: 0, errorCount: 0 },
    'SPOT': { venue: 'SPOT', status: 'DISCONNECTED', latencyMs: 0, messageCount: 0, errorCount: 0 },
    'PERP_USDT': { venue: 'PERP_USDT', status: 'DISCONNECTED', latencyMs: 0, messageCount: 0, errorCount: 0 },
    'FUTURE_USDT': { venue: 'FUTURE_USDT', status: 'DISCONNECTED', latencyMs: 0, messageCount: 0, errorCount: 0 },
    'BINANCE_PERP': { venue: 'BINANCE_PERP', status: 'DISCONNECTED', latencyMs: 0, messageCount: 0, errorCount: 0 },
    'BINANCE_FUTURE': { venue: 'BINANCE_FUTURE', status: 'DISCONNECTED', latencyMs: 0, messageCount: 0, errorCount: 0 },
    'SIM_EXCHANGE': { venue: 'SIM_EXCHANGE', status: 'DISCONNECTED', latencyMs: 0, messageCount: 0, errorCount: 0 }
  };

  private listeners: ((event: any) => void)[] = [];

  public updateHealth(venue: Venue, updates: Partial<FeedHealth>) {
    this.health[venue] = { ...this.health[venue], ...updates };
  }

  public getHealth(): FeedHealth[] {
    return Object.values(this.health);
  }

  public emitEvent(event: any) {
    // Normalization logic would happen here or in specific feed drivers
    // For this simulation, we assume events are already normalized
    this.listeners.forEach(cb => cb(event));
    
    // Periodically log throughput stats to audit
    // Fix: Explicitly cast venue to Venue to ensure it exists in health record
    const venue = event.venue as Venue;
    if (this.health[venue] && this.health[venue].messageCount % 1000 === 0) {
      this.updateHealth(venue, { status: 'CONNECTED' });
    }
  }

  public onEvent(callback: (event: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public generateCorrelationId(): string {
    return uuidv4();
  }
}

export default new CoreDataService();
