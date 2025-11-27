export interface MarketDataPoint {
  timestamp: number;
  timeLabel: string;
  spotPrice: number; // XAUUSD
  futurePrice: number; // Gold Futures (GC)
  openInterest: number; // Total Open Interest
  volume: number;
}

export interface OptionSeries {
  expiry: string; // e.g., "Dec 24", "Oct W4"
  code?: string; // e.g., "OGZ24", "OGV4"
  callOI: number;
  putOI: number;
  maxPain?: number;
  type?: 'MONTHLY' | 'WEEKLY' | 'DAILY'; // Type of option series
}

export interface MarketFetchResult {
  dataPoint: MarketDataPoint;
  optionSeries: OptionSeries[];
  sources: Array<{title: string, uri: string}>;
}

export interface MarketAnalysis {
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  summary: string;
  recommendation: string;
  basis: number; // Difference between Future and Spot
  oiTrend: 'RISING' | 'FALLING' | 'STABLE';
  priceTrend: 'RISING' | 'FALLING' | 'STABLE';
  support: string; // Intraday Support Level
  resistance: string; // Intraday Resistance Level
  sourceUrls?: Array<{ title: string; uri: string }>; // To display grounding sources
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export enum DataSourceMode {
  SIMULATION = 'SIMULATION',
  LIVE_SEARCH = 'LIVE_SEARCH'
}

export const MOCK_START_PRICE = 2350.00;
export const MOCK_START_OI = 450000;