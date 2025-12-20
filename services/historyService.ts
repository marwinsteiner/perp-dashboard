
import { Bar, FundingEvent, Venue, Kline } from '../types';

class HistoryService {
  /**
   * Simulates querying DuckDB for historical klines.
   * In a real app, this would use duckdb-wasm or a backend API.
   */
  public async queryBars(
    venue: Venue,
    symbol: string,
    start: number,
    end: number,
    interval: string
  ): Promise<Bar[]> {
    // Generate synthetic historical data
    const bars: Bar[] = [];
    let currentTime = start;
    let lastClose = 50000 + Math.random() * 10000;

    while (currentTime < end) {
      const change = (Math.random() - 0.5) * 100;
      const open = lastClose;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 20;
      const low = Math.min(open, close) - Math.random() * 20;

      // Fix: Added missing type property
      bars.push({
        id: `bar-${currentTime}`,
        venue,
        symbol,
        venueTime: currentTime,
        interval,
        open,
        high,
        low,
        close,
        volume: Math.random() * 100,
        type: 'BAR'
      });

      lastClose = close;
      currentTime += 60000; // 1m increments
    }

    return bars;
  }

  public async queryFunding(symbol: string, start: number, end: number): Promise<FundingEvent[]> {
    const events: FundingEvent[] = [];
    let currentTime = start;
    while (currentTime < end) {
      // Fix: Added missing type property
      events.push({
        id: `funding-${currentTime}`,
        venue: 'BINANCE_USDT_M',
        symbol,
        venueTime: currentTime,
        rate: (Math.random() - 0.2) * 0.0001, // Bias towards positive funding
        nextFundingTime: currentTime + 28800000, // 8h
        type: 'FUNDING'
      });
      currentTime += 28800000;
    }
    return events;
  }
}

export default new HistoryService();
