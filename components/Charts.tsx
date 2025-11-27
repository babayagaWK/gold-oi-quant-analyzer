import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar
} from 'recharts';
import { MarketDataPoint } from '../types';

interface ChartsProps {
  data: MarketDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-800 border border-dark-700 p-3 rounded shadow-xl text-sm z-50">
        <p className="text-gray-400 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="font-mono">
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Charts: React.FC<ChartsProps> = ({ data }) => {
  if (data.length === 0) return null;

  const minPrice = Math.min(...data.map(d => d.spotPrice)) - 5;
  const maxPrice = Math.max(...data.map(d => d.spotPrice)) + 5;
  const minOI = Math.min(...data.map(d => d.openInterest)) - 1000;
  const maxOI = Math.max(...data.map(d => d.openInterest)) + 1000;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Primary Correlation Chart */}
      <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 shadow-lg flex flex-col h-[400px]">
        <h3 className="text-lg font-semibold text-gray-200 mb-2 ml-2">ราคาทองคำ vs สถานะคงค้าง (OI)</h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
              <XAxis 
                dataKey="timeLabel" 
                stroke="#94a3b8" 
                tick={{fontSize: 10}} 
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis 
                yAxisId="left" 
                domain={[minPrice, maxPrice]} 
                stroke="#eab308" 
                tick={{fontSize: 10, fill: '#eab308'}}
                tickFormatter={(val) => val.toFixed(0)}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                domain={[minOI, maxOI]} 
                stroke="#60a5fa"
                tick={{fontSize: 10, fill: '#60a5fa'}}
                tickFormatter={(val) => (val/1000).toFixed(0) + 'k'}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }}/>
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="spotPrice" 
                stroke="#eab308" 
                fill="url(#colorSpot)" 
                fillOpacity={0.1}
                strokeWidth={2}
                name="ราคาทองคำ (Spot)"
                animationDuration={500}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="openInterest" 
                stroke="#60a5fa" 
                strokeWidth={2}
                dot={false}
                name="สถานะคงค้าง (OI)"
                animationDuration={500}
              />
              <defs>
                <linearGradient id="colorSpot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Basis & Volume Chart */}
      <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 shadow-lg flex flex-col h-[400px]">
        <h3 className="text-lg font-semibold text-gray-200 mb-2 ml-2">ส่วนต่างราคา (Basis) & ปริมาณซื้อขาย</h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
              <XAxis 
                dataKey="timeLabel" 
                stroke="#94a3b8" 
                tick={{fontSize: 10}} 
                minTickGap={30}
              />
              <YAxis 
                yAxisId="left" 
                stroke="#a78bfa" 
                tick={{fontSize: 10, fill: '#a78bfa'}}
                label={{ value: 'Basis ($)', angle: -90, position: 'insideLeft', fill: '#a78bfa', fontSize: 10 }}
              />
               <YAxis 
                yAxisId="right" 
                orientation="right"
                stroke="#94a3b8" 
                tick={{fontSize: 10, fill: '#94a3b8'}}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '10px' }}/>
              <Line 
                yAxisId="left"
                type="step"
                dataKey="futurePrice"
                data={data.map(d => ({...d, basis: d.futurePrice - d.spotPrice}))}
                name="Basis ($)"
                strokeKey="basis"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
              />
              <Bar 
                yAxisId="right"
                dataKey="volume" 
                barSize={20}
                fill="#475569" 
                name="Volume"
                opacity={0.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Charts;