import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MarketDataPoint, MarketAnalysis, AnalysisStatus, DataSourceMode, OptionSeries } from './types';
import { generateHistoricalData, fetchLatestDataPoint, generateSimulatedOptions } from './services/marketData';
import { analyzeMarketData, fetchRealTimeMarketData } from './services/geminiService';
import Charts from './components/Charts';
import AnalysisPanel from './components/AnalysisPanel';
import OptionChain from './components/OptionChain';

const StatCard: React.FC<{ label: string; value: string; subValue?: string; color?: string; loading?: boolean }> = ({ label, value, subValue, color = 'text-white', loading }) => (
  <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 shadow-sm relative overflow-hidden">
    {loading && (
       <div className="absolute inset-0 bg-dark-900/50 flex items-center justify-center z-10 backdrop-blur-sm">
         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
       </div>
    )}
    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
    <h3 className={`text-2xl font-bold font-mono ${color}`}>{value}</h3>
    {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
  </div>
);

const App: React.FC = () => {
  const [data, setData] = useState<MarketDataPoint[]>([]);
  const [optionData, setOptionData] = useState<OptionSeries[]>([]);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  // Default to LIVE_SEARCH for real data as requested
  const [dataMode, setDataMode] = useState<DataSourceMode>(DataSourceMode.LIVE_SEARCH);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // User Inputs
  const [apiKey, setApiKey] = useState('');
  const [userQuestion, setUserQuestion] = useState('');

  // Auto-Update State
  const [isAutoUpdate, setIsAutoUpdate] = useState(false);
  const [nextUpdateCountdown, setNextUpdateCountdown] = useState(60);

  // Initialize Historical Data (Background context)
  useEffect(() => {
    const initialData = generateHistoricalData(50);
    setData(initialData);
    setOptionData(generateSimulatedOptions());
  }, []);

  // Simulation Loop (Only runs if in SIMULATION mode)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (dataMode === DataSourceMode.SIMULATION && data.length > 0) {
      interval = setInterval(() => {
        setData(prev => {
          const newData = [...prev.slice(1), fetchLatestDataPoint(prev)];
          return newData;
        });
        // Occasionally update options in simulation
        if (Math.random() > 0.7) setOptionData(generateSimulatedOptions());
      }, 3000); 
    }
    return () => clearInterval(interval);
  }, [dataMode, data.length]);

  // Handle Real-Time Fetch
  const fetchLiveValues = useCallback(async () => {
    setIsDataLoading(true);
    setAnalysisStatus(AnalysisStatus.LOADING);
    try {
      // 1. Fetch real data via Google Search (Targeting Investing.com & CME)
      const { dataPoint, sources, optionSeries } = await fetchRealTimeMarketData(apiKey);
      
      let updatedData: MarketDataPoint[] = [];

      // 2. Update Chart Data & Adjust History
      setData(prev => {
         // Auto-Adjust History:
         // Shift the historical mock data to match the new real price level
         // This prevents massive vertical jumps in the chart when switching from mock (2350) to real (e.g., 2600)
         const lastSimulated = prev[prev.length - 1];
         const priceDiff = dataPoint.spotPrice - lastSimulated.spotPrice;
         
         const adjustedHistory = prev.map(p => ({
            ...p,
            spotPrice: parseFloat((p.spotPrice + priceDiff).toFixed(2)),
            futurePrice: parseFloat((p.futurePrice + priceDiff).toFixed(2)),
         }));

         const newData = [...adjustedHistory.slice(1), dataPoint];
         updatedData = newData; // Capture for analysis
         return newData;
      });

      // Update Options
      if (optionSeries && optionSeries.length > 0) {
        setOptionData(optionSeries);
      }

      // 3. Analyze the new real data (using the captured updatedData)
      const analysisResult = await analyzeMarketData(
          updatedData.length > 0 ? updatedData : [dataPoint], 
          sources,
          apiKey,
          userQuestion
      );
      setAnalysis(analysisResult);
      setAnalysisStatus(AnalysisStatus.SUCCESS);
      setNextUpdateCountdown(60); // Reset countdown

    } catch (e) {
      console.error("Live fetch failed", e);
      setAnalysisStatus(AnalysisStatus.ERROR);
    } finally {
      setIsDataLoading(false);
    }
  }, [apiKey, userQuestion]);

  // Initial Fetch on Mode Change
  useEffect(() => {
    if (dataMode === DataSourceMode.LIVE_SEARCH) {
      fetchLiveValues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMode]);

  // Real-Time Auto Update Interval (Every 60 Seconds)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let countdownInterval: ReturnType<typeof setInterval>;

    if (dataMode === DataSourceMode.LIVE_SEARCH && isAutoUpdate) {
      // Main Fetch Interval
      interval = setInterval(() => {
        fetchLiveValues();
      }, 60000); // 60 seconds

      // Countdown Timer for UI
      countdownInterval = setInterval(() => {
        setNextUpdateCountdown((prev) => (prev > 0 ? prev - 1 : 60));
      }, 1000);
    }

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
      setNextUpdateCountdown(60); // Reset when stopped
    };
  }, [dataMode, isAutoUpdate, fetchLiveValues]);


  const handleManualRefresh = () => {
    if (dataMode === DataSourceMode.LIVE_SEARCH) {
      fetchLiveValues();
    } else {
      setAnalysisStatus(AnalysisStatus.LOADING);
      analyzeMarketData(data, [], apiKey, userQuestion).then(res => {
        setAnalysis(res);
        setAnalysisStatus(AnalysisStatus.SUCCESS);
      });
    }
  };

  const toggleMode = () => {
     setDataMode(prev => prev === DataSourceMode.SIMULATION ? DataSourceMode.LIVE_SEARCH : DataSourceMode.SIMULATION);
     setAnalysis(null);
     setAnalysisStatus(AnalysisStatus.IDLE);
     setIsAutoUpdate(false); // Disable auto update when switching modes
  };

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const previous = data.length > 1 ? data[data.length - 2] : null;
  
  const priceDiff = latest && previous ? latest.spotPrice - previous.spotPrice : 0;
  const oiDiff = latest && previous ? latest.openInterest - previous.openInterest : 0;
  const basis = latest ? latest.futurePrice - latest.spotPrice : 0;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-[1600px] mx-auto pb-20">
      {/* Header */}
      <header className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                <span className="text-gold-500">Gold</span> OI Quant Analyzer
            </h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">
                วิเคราะห์ความสัมพันธ์ราคา Spot และ OI จาก CME แบบเรียลไทม์
            </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                {/* API Key Input */}
                <div className="flex flex-col w-full sm:w-auto">
                    <input 
                        type="password" 
                        placeholder="Google Gemini API Key (Optional)" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-dark-800 border border-dark-600 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-gold-500 w-full sm:w-64"
                    />
                </div>

                {/* Auto Update Toggle */}
                {dataMode === DataSourceMode.LIVE_SEARCH && (
                <button
                    onClick={() => setIsAutoUpdate(!isAutoUpdate)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    isAutoUpdate 
                        ? 'bg-purple-900/40 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                        : 'bg-dark-800 border-dark-600 text-gray-400 hover:border-gray-500'
                    }`}
                >
                    <span className={`w-2 h-2 rounded-full ${isAutoUpdate ? 'bg-purple-400 animate-pulse' : 'bg-gray-500'}`}></span>
                    {isAutoUpdate ? `อัปเดตอัตโนมัติ (${nextUpdateCountdown}s)` : 'เปิดอัปเดตอัตโนมัติ'}
                </button>
                )}

                {/* Mode Indicator */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-300 ${dataMode === DataSourceMode.LIVE_SEARCH ? 'bg-blue-900/30 border-blue-500/50' : 'bg-dark-800 border-dark-700'}`}>
                    <span className={`w-2 h-2 rounded-full ${dataMode === DataSourceMode.LIVE_SEARCH ? 'bg-blue-400 animate-pulse' : 'bg-green-500 animate-pulse'}`}></span>
                    <span className={`text-xs font-mono font-bold ${dataMode === DataSourceMode.LIVE_SEARCH ? 'text-blue-400' : 'text-gray-300'}`}>
                    {dataMode === DataSourceMode.LIVE_SEARCH ? 'LIVE AGENT' : 'SIMULATION'}
                    </span>
                </div>
                
                <button 
                    onClick={toggleMode}
                    className="text-xs text-gray-400 hover:text-white underline whitespace-nowrap ml-auto xl:ml-0"
                >
                    {dataMode === DataSourceMode.SIMULATION ? 'ใช้ข้อมูลจริง' : 'โหมดจำลอง'}
                </button>
            </div>
        </div>
      </header>

      {/* Main Grid */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard 
                label="ราคาทองคำ (Spot)" 
                value={latest.spotPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                subValue={`${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)}`}
                color={priceDiff >= 0 ? 'text-green-400' : 'text-red-400'}
                loading={isDataLoading}
            />
            <StatCard 
                label="ฟิวเจอร์ส (CME GC)" 
                value={latest.futurePrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                subValue={`Basis: $${basis.toFixed(2)}`}
                color="text-gold-400"
                loading={isDataLoading}
            />
            <StatCard 
                label="สถานะคงค้าง (OI)" 
                value={latest.openInterest.toLocaleString()} 
                subValue={`${oiDiff >= 0 ? '+' : ''}${oiDiff} สัญญา`}
                color="text-blue-400"
                loading={isDataLoading}
            />
            <StatCard 
                label="แหล่งข้อมูล" 
                value={dataMode === DataSourceMode.LIVE_SEARCH ? "Live Search" : "Simulated"}
                subValue={dataMode === DataSourceMode.LIVE_SEARCH ? "TradingView / CME" : "Algorithm"}
                color="text-gray-300"
                loading={isDataLoading}
            />
        </div>
      )}

      {/* Content Layout - Use Gap-8 for more separation */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column (Charts + Legend + Options) */}
        <div className="xl:col-span-2 flex flex-col gap-6 min-w-0">
            <Charts data={data} />
            
            {/* Option Series Chart */}
            <OptionChain data={optionData} loading={isDataLoading} />

            {/* Legend Box */}
            <div className="bg-dark-800 border border-dark-700 p-4 rounded-xl shadow-sm z-10 relative">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">คำอธิบายสัญญาณ (Quant Legend)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-3 bg-dark-900/50 p-2 rounded border border-dark-700/50">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <span>ราคา ↑ OI ↑ : ขาขึ้น (Bullish)</span>
                </div>
                <div className="flex items-center gap-3 bg-dark-900/50 p-2 rounded border border-dark-700/50">
                  <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
                  <span>ราคา ↑ OI ↓ : ขาขึ้นอ่อน (Covering)</span>
                </div>
                <div className="flex items-center gap-3 bg-dark-900/50 p-2 rounded border border-dark-700/50">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                  <span>ราคา ↓ OI ↑ : ขาลง (Bearish)</span>
                </div>
                <div className="flex items-center gap-3 bg-dark-900/50 p-2 rounded border border-dark-700/50">
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                  <span>ราคา ↓ OI ↓ : ขาลงอ่อน (Liquidation)</span>
                </div>
              </div>
            </div>
        </div>
        
        {/* Right Column (Analysis) */}
        <div className="xl:col-span-1 min-w-0">
             <AnalysisPanel 
                analysis={analysis} 
                status={analysisStatus} 
                onRefresh={handleManualRefresh} 
                isLiveMode={dataMode === DataSourceMode.LIVE_SEARCH}
                userQuestion={userQuestion}
                onQuestionChange={setUserQuestion}
             />
        </div>
      </div>
      
      <footer className="mt-12 text-center text-xs text-gray-600">
        <p>
          {dataMode === DataSourceMode.LIVE_SEARCH 
             ? "ข้อมูลเรียลไทม์ผ่าน Gemini Google Search Grounding (อ้างอิง TradingView, Investing.com และ CME Group)"
             : "โหมดจำลอง (Simulation Mode) กำลังทำงาน เปลี่ยนเป็นโหมด Live เพื่อดูข้อมูลจริง"}
        </p>
        <p className="mt-1">สำหรับใช้ประกอบการวางแผนเทรด Gold CFD บน MT5 เท่านั้น</p>
      </footer>
    </div>
  );
};

export default App;