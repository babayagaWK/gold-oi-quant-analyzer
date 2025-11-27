import React from 'react';
import { OptionSeries } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface OptionChainProps {
  data: OptionSeries[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const callOI = payload.find((p: any) => p.dataKey === 'callOI')?.value || 0;
    const putOI = payload.find((p: any) => p.dataKey === 'putOI')?.value || 0;
    const item = payload[0]?.payload;
    const code = item?.code || '-';
    const type = item?.type || 'MONTHLY';
    const pcr = callOI > 0 ? (putOI / callOI).toFixed(2) : 'N/A';

    let typeColor = 'text-blue-300';
    if (type === 'DAILY') typeColor = 'text-pink-300';
    if (type === 'WEEKLY') typeColor = 'text-purple-300';

    return (
      <div className="bg-dark-800 border border-dark-700 p-3 rounded shadow-xl text-sm z-50">
        <p className="text-gray-200 font-bold mb-1">{label}</p>
        <div className="flex justify-between items-center mb-2 gap-4">
            <span className="text-xs text-gold-400 font-mono">Series: {code}</span>
            <span className={`text-[10px] px-1.5 rounded border border-white/20 ${typeColor} uppercase`}>{type}</span>
        </div>
        <p className="text-green-400 font-mono">Calls: {callOI.toLocaleString()}</p>
        <p className="text-red-400 font-mono">Puts: {putOI.toLocaleString()}</p>
        <div className="mt-2 pt-2 border-t border-gray-700">
           <p className="text-gray-400">Put/Call Ratio: <span className="text-white font-bold">{pcr}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLabel = (props: any) => {
    const { x, y, value, payload } = props;
    // Determine color based on Type inside the data payload if available, else default
    // We can't easily access full payload in standard YAxis tick, so we might need a workaround or just simple color
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={-5} y={0} dy={4} textAnchor="end" fill="#e2e8f0" fontSize={11}>
                {value}
            </text>
        </g>
    )
}

const OptionChain: React.FC<OptionChainProps> = ({ data, loading }) => {
  // If no data or empty, standard simulation state
  const displayData = data.length > 0 ? data.map(d => ({
    ...d,
    displayLabel: d.code ? `${d.expiry}` : d.expiry, // Shorten label, move code to tooltip
    fullLabel: `${d.expiry} (${d.type ? d.type.substring(0,1) : 'M'})`
  })) : [
    { expiry: 'No Data', displayLabel: 'No Data', callOI: 0, putOI: 0, code: '-', type: 'MONTHLY' }
  ];

  return (
    <div className="bg-dark-800 p-5 rounded-xl border border-dark-700 shadow-lg flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Gold Options Series (OI)
            </h3>
            <span className="text-[10px] text-gray-500 ml-7">รวมสัญญา Monthly, Weekly และ Daily</span>
        </div>
        
        {loading && <span className="text-xs text-purple-400 animate-pulse">กำลังโหลด...</span>}
      </div>

      <div className="flex-1 w-full min-h-0 relative">
        {displayData[0].expiry === 'No Data' && !loading && (
             <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                ไม่พบข้อมูล Options
             </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={true} vertical={true} />
            <XAxis type="number" stroke="#94a3b8" tick={{fontSize: 10}} tickFormatter={(val) => (val/1000).toFixed(0) + 'k'} />
            <YAxis 
                dataKey="displayLabel" 
                type="category" 
                stroke="#e2e8f0" 
                tick={{fontSize: 11, fill: '#e2e8f0'}} 
                width={100} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            
            <Bar dataKey="callOI" name="Call OI (Bullish)" fill="#22c55e" barSize={16} radius={[0, 4, 4, 0]} animationDuration={1000} />
            <Bar dataKey="putOI" name="Put OI (Bearish)" fill="#ef4444" barSize={16} radius={[0, 4, 4, 0]} animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-[10px] text-gray-500">
         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/50"></span> Monthly</span>
         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500/50"></span> Weekly</span>
         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500/50"></span> Daily</span>
      </div>
    </div>
  );
};

export default OptionChain;