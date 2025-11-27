import { MarketDataPoint, OptionSeries, MOCK_START_PRICE, MOCK_START_OI } from '../types';

/**
 * SIMULATION NOTE:
 * Because CME and Investing.com do not provide public, free, CORS-enabled APIs for 
 * frontend-only applications, this service generates realistic simulated market data
 * using Random Walk theory with correlation between Price and OI to mimic real market dynamics.
 */

const generateTimeLabels = (count: number): string[] => {
  const labels = [];
  const now = new Date();
  for (let i = count; i > 0; i--) {
    const d = new Date(now.getTime() - i * 15 * 60000); // 15 min candles
    labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }
  return labels;
};

// Initial state for simulation
let lastSpot = MOCK_START_PRICE;
let lastFuture = MOCK_START_PRICE + 15; // Contango
let lastOI = MOCK_START_OI;

export const generateHistoricalData = (count: number = 50): MarketDataPoint[] => {
  const data: MarketDataPoint[] = [];
  const labels = generateTimeLabels(count);

  for (let i = 0; i < count; i++) {
    // Random walk
    const change = (Math.random() - 0.5) * 5;
    const futurePremium = 12 + (Math.random() * 5); // Basis usually fluctuates
    
    // Simulate correlation: If price moves up significantly, OI might increase (Trend following)
    const oiChange = (Math.random() - 0.5) * 1000 + (change > 1 ? 500 : change < -1 ? -500 : 0);

    lastSpot += change;
    lastFuture = lastSpot + futurePremium;
    lastOI += oiChange;

    data.push({
      timestamp: Date.now() - (count - i) * 900000,
      timeLabel: labels[i],
      spotPrice: parseFloat(lastSpot.toFixed(2)),
      futurePrice: parseFloat(lastFuture.toFixed(2)),
      openInterest: Math.floor(lastOI),
      volume: Math.floor(Math.random() * 5000 + 1000),
    });
  }
  return data;
};

export const fetchLatestDataPoint = (previousData: MarketDataPoint[]): MarketDataPoint => {
  const lastPoint = previousData[previousData.length - 1];
  
  const change = (Math.random() - 0.5) * 3;
  const futurePremium = 12 + (Math.random() * 4);
  const oiChange = (Math.random() - 0.5) * 500;

  const newSpot = lastPoint.spotPrice + change;
  const newFuture = newSpot + futurePremium;
  const newOI = lastPoint.openInterest + oiChange;

  return {
    timestamp: Date.now(),
    timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    spotPrice: parseFloat(newSpot.toFixed(2)),
    futurePrice: parseFloat(newFuture.toFixed(2)),
    openInterest: Math.floor(newOI),
    volume: Math.floor(Math.random() * 2000 + 500),
  };
};

export const generateSimulatedOptions = (): OptionSeries[] => {
  // Simulate Mix of Monthly, Weekly, Daily
  const series: OptionSeries[] = [
    // Monthly
    { expiry: "Dec 24", code: "OGZ24", type: 'MONTHLY', callOI: Math.floor(15000 + Math.random() * 2000), putOI: Math.floor(12000 + Math.random() * 2000) },
    { expiry: "Feb 25", code: "OGG25", type: 'MONTHLY', callOI: Math.floor(8000 + Math.random() * 1000), putOI: Math.floor(6000 + Math.random() * 1000) },
    
    // Weekly
    { expiry: "Oct W4", code: "OGV4", type: 'WEEKLY', callOI: Math.floor(3000 + Math.random() * 500), putOI: Math.floor(2500 + Math.random() * 500) },
    
    // Daily
    { expiry: "Today (Mon)", code: "1GO", type: 'DAILY', callOI: Math.floor(1200 + Math.random() * 300), putOI: Math.floor(1500 + Math.random() * 300) },
    { expiry: "Tmrw (Tue)", code: "2GO", type: 'DAILY', callOI: Math.floor(900 + Math.random() * 200), putOI: Math.floor(800 + Math.random() * 200) },
  ];
  
  return series;
};