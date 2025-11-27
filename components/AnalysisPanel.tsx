import React from 'react';
import { MarketAnalysis, AnalysisStatus } from '../types';

interface AnalysisPanelProps {
  analysis: MarketAnalysis | null;
  status: AnalysisStatus;
  onRefresh: () => void;
  isLiveMode: boolean;
  userQuestion: string;
  onQuestionChange: (q: string) => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  analysis, 
  status, 
  onRefresh, 
  isLiveMode,
  userQuestion,
  onQuestionChange
}) => {
  const isBullish = analysis?.sentiment === 'BULLISH';
  const isBearish = analysis?.sentiment === 'BEARISH';
  
  const sentimentColor = isBullish ? 'text-green-400' : isBearish ? 'text-red-400' : 'text-yellow-400';
  const borderColor = isBullish ? 'border-green-500/30' : isBearish ? 'border-red-500/30' : 'border-yellow-500/30';
  const bgColor = isBullish ? 'bg-green-500/10' : isBearish ? 'bg-red-500/10' : 'bg-yellow-500/10';

  const getThaiSentiment = (s: string) => {
    switch(s) {
        case 'BULLISH': return 'ขาขึ้น (Bullish)';
        case 'BEARISH': return 'ขาลง (Bearish)';
        case 'NEUTRAL': return 'ไซด์เวย์ (Neutral)';
        default: return s;
    }
  };

  const getThaiTrend = (t: string) => {
    switch(t) {
        case 'RISING': return 'กำลังขึ้น ↗';
        case 'FALLING': return 'กำลังลง ↘';
        case 'STABLE': return 'ทรงตัว ↔';
        default: return t;
    }
  };

  return (
    // Changed h-full to h-auto on mobile to prevent layout stretching/overlapping. xl:h-full allows it to match chart height on desktop.
    <div className={`p-5 rounded-xl border ${analysis ? borderColor : 'border-dark-700'} ${analysis ? bgColor : 'bg-dark-800'} transition-all duration-500 h-auto xl:h-full flex flex-col`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 border-b border-white/5 pb-4">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white leading-tight">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <div className="flex flex-col">
             <span>วิเคราะห์ Intraday</span>
             <span className="text-[10px] font-normal text-gray-400">Powered by Gemini 2.5</span>
          </div>
        </h2>
      </div>

      {/* User Input Section */}
      <div className="mb-4">
        <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">คำถามเสริม AI (Optional)</label>
        <div className="flex flex-col gap-2">
            <textarea
                value={userQuestion}
                onChange={(e) => onQuestionChange(e.target.value)}
                placeholder="เช่น กราฟทรงนี้มีโอกาส Breakout ไหม?, ควรเข้า Buy ตรงไหน?"
                className="w-full bg-dark-900/50 border border-dark-600 rounded-lg p-3 text-sm text-gray-200 focus:border-purple-500 focus:outline-none resize-none h-16"
            />
            <button 
            onClick={onRefresh}
            disabled={status === AnalysisStatus.LOADING}
            className={`w-full py-2 text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors border border-white/20 shadow-sm whitespace-nowrap ${status === AnalysisStatus.LOADING ? 'opacity-50 cursor-not-allowed' : 'bg-purple-900/20 text-purple-200'}`}
            >
            {status === AnalysisStatus.LOADING ? (isLiveMode ? 'กำลังสแกน...' : 'กำลังคิด...') : (isLiveMode ? 'อัปเดตข้อมูล & วิเคราะห์' : 'วิเคราะห์ใหม่')}
            </button>
        </div>
      </div>

      {/* Empty State */}
      {!analysis && status !== AnalysisStatus.LOADING && (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-center text-sm p-4 border border-dashed border-dark-700 rounded-lg min-h-[150px]">
          {isLiveMode ? 'กดปุ่ม "อัปเดตข้อมูล" ด้านบนเพื่อเริ่ม' : 'พร้อมวิเคราะห์'}
        </div>
      )}

      {/* Loading State */}
      {status === AnalysisStatus.LOADING && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8 min-h-[200px]">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-purple-300 animate-pulse text-center text-sm">
            {isLiveMode ? 'กำลังค้นหาราคาและแนวรับแนวต้าน...' : 'กำลังวิเคราะห์แนวโน้ม Intraday...'}
          </p>
        </div>
      )}

      {/* Result State */}
      {analysis && status !== AnalysisStatus.LOADING && (
        <div className="flex flex-col gap-5 animate-fade-in h-full">
          
          {/* Main Sentiment Badge */}
          <div className="flex items-center justify-between bg-dark-900/40 p-3 rounded-lg border border-dark-700/50">
             <div className="flex flex-col">
                <span className="text-xs text-gray-400">มุมมองตลาด (Intraday)</span>
                <span className={`text-xl font-bold ${sentimentColor} tracking-tight`}>
                    {getThaiSentiment(analysis.sentiment)}
                </span>
             </div>
             <div className="text-right">
                <span className="text-xs text-gray-400 block mb-1">ความมั่นใจ</span>
                <span className="text-lg font-bold text-white">{analysis.confidence}%</span>
             </div>
          </div>

          {/* Support / Resistance Grid */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-red-900/20 border border-red-500/20 p-3 rounded-lg text-center">
                <span className="text-[10px] text-red-300 uppercase tracking-wider block mb-1">แนวต้าน (Resistance)</span>
                <span className="text-lg font-mono font-bold text-red-100">{analysis.resistance || '-'}</span>
             </div>
             <div className="bg-green-900/20 border border-green-500/20 p-3 rounded-lg text-center">
                <span className="text-[10px] text-green-300 uppercase tracking-wider block mb-1">แนวรับ (Support)</span>
                <span className="text-lg font-mono font-bold text-green-100">{analysis.support || '-'}</span>
             </div>
          </div>

          {/* Analysis Text */}
          <div className="bg-dark-900/60 p-4 rounded-lg border border-dark-700 shadow-inner">
            <h4 className="text-xs text-blue-300 uppercase tracking-wider mb-2 font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                วิเคราะห์แนวโน้มราคา (Price Trend)
            </h4>
            <p className="text-gray-200 text-sm leading-7">
              {analysis.summary}
            </p>
          </div>

          {/* Recommendation Box */}
          <div className={`p-4 rounded-lg border-l-4 shadow-lg ${isBullish ? 'border-green-500 bg-green-900/20' : isBearish ? 'border-red-500 bg-red-900/20' : 'border-yellow-500 bg-yellow-900/20'}`}>
            <h4 className={`text-xs uppercase tracking-wider mb-2 font-bold ${isBullish ? 'text-green-400' : isBearish ? 'text-red-400' : 'text-yellow-400'}`}>
                คำแนะนำสำหรับ MT5 (Intraday)
            </h4>
            <p className="text-sm text-gray-100 font-medium leading-7">
              {analysis.recommendation}
            </p>
          </div>

          {/* Trend Meters */}
          <div className="grid grid-cols-3 gap-2 mt-auto pt-2 border-t border-white/5">
            <div className="text-center">
               <span className="block text-[10px] text-gray-500 mb-1">Trend ราคา</span>
               <span className={`text-xs font-bold ${analysis.priceTrend === 'RISING' ? 'text-green-400' : analysis.priceTrend === 'FALLING' ? 'text-red-400' : 'text-yellow-400'}`}>
                   {getThaiTrend(analysis.priceTrend)}
               </span>
            </div>
            <div className="text-center border-l border-white/10">
               <span className="block text-[10px] text-gray-500 mb-1">Trend OI</span>
               <span className={`text-xs font-bold ${analysis.oiTrend === 'RISING' ? 'text-blue-400' : analysis.oiTrend === 'FALLING' ? 'text-orange-400' : 'text-gray-400'}`}>
                   {getThaiTrend(analysis.oiTrend)}
               </span>
            </div>
            <div className="text-center border-l border-white/10">
               <span className="block text-[10px] text-gray-500 mb-1">Basis</span>
               <span className="text-xs font-bold text-gold-400">${analysis.basis.toFixed(2)}</span>
            </div>
          </div>

          {/* Sources Footer */}
          {analysis.sourceUrls && analysis.sourceUrls.length > 0 && (
            <div className="pt-3 border-t border-dark-700/30">
               <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">ข้อมูลอ้างอิง</span>
               <div className="flex flex-wrap gap-2">
                 {analysis.sourceUrls.map((source, idx) => (
                   <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 bg-dark-900 px-3 py-1 rounded border border-dark-700 hover:border-blue-500/50 truncate max-w-[120px] transition-colors"
                   >
                     {source.title}
                   </a>
                 ))}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;