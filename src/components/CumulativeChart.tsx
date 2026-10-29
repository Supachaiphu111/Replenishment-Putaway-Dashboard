import React, { useState } from 'react';
import { HourlyProductivity } from '../types/rp20';
import { TrendingUp } from 'lucide-react';

interface CumulativeChartProps {
  data: HourlyProductivity[];
  totalComplete: number;
  isDarkMode?: boolean;
}

export const CumulativeChart: React.FC<CumulativeChartProps> = ({
  data,
  totalComplete,
  isDarkMode = true,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<HourlyProductivity | null>(null);

  const maxCumulative = Math.max(...data.map(d => d.cumulativeCount), 1);
  const chartHeight = 220;
  const chartWidth = 900;
  const paddingX = 40;
  const paddingY = 35;

  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  // Calculate coordinates for SVG line
  const points = data.map((d, index) => {
    const x = paddingX + (index / 23) * innerWidth;
    const y = paddingY + innerHeight - (d.cumulativeCount / maxCumulative) * innerHeight;
    return { ...d, x, y };
  });

  // Construct SVG path string
  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Construct SVG area string
  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingY + innerHeight} L ${points[0].x} ${paddingY + innerHeight} Z`;

  return (
    <div className={`rounded-2xl p-5 mb-6 border transition-all ${
      isDarkMode
        ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
        : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
    }`} id="cumulative">
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b ${
        isDarkMode ? 'border-white/10' : 'border-slate-200'
      }`}>
        <div>
          <h2 className={`text-sm font-bold flex items-center gap-2 ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>กราฟแสดงยอดสะสมรายชั่วโมง (Cumulative 24-Hour Velocity Curve)</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            ติดตามความคืบหน้ายอดงาน Complete สะสมทีละชั่วโมง พร้อมแสดงตัวเลขจำนวนสะสมกำกับทุกจุด
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span>ยอดสะสมสะท้อนความคืบหน้ารวม</span>
          </div>
          <span className={isDarkMode ? 'text-slate-700' : 'text-slate-300'}>·</span>
          <div className="text-xs font-mono-numbers">
            ยอดสะสมสุทธิ: <span className="font-bold text-emerald-400">{totalComplete.toLocaleString()}</span> งาน
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[840px] relative">
          
          {/* Tooltip */}
          {hoveredPoint && (
            <div
              className={`absolute z-20 px-3 py-1.5 rounded-xl text-xs shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full border backdrop-blur-2xl transition-all ${
                isDarkMode
                  ? 'bg-slate-900/85 text-white border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'bg-white/90 text-slate-900 border-white/80 shadow-md'
              }`}
              style={{
                left: `${(hoveredPoint.hour / 23) * 100}%`,
                top: '25px',
              }}
            >
              <div className="font-semibold text-emerald-400">
                เวลา {hoveredPoint.label} น.
              </div>
              <div className="text-[11px] text-slate-200">
                ยอดสะสม: <span className="font-mono-numbers font-bold text-white">{hoveredPoint.cumulativeCount.toLocaleString()} งาน</span>
              </div>
              <div className="text-[10px] text-slate-400">
                เพิ่มในชม.นี้: +{hoveredPoint.count} งาน
              </div>
            </div>
          )}

          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            {/* Horizontal guide lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const yVal = paddingY + innerHeight - pct * innerHeight;
              const valNum = Math.round(pct * maxCumulative);
              return (
                <g key={pct}>
                  <line
                    x1={paddingX}
                    y1={yVal}
                    x2={chartWidth - paddingX}
                    y2={yVal}
                    stroke={isDarkMode ? '#1E293B' : '#E2E8F0'}
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingX - 8}
                    y={yVal + 3}
                    textAnchor="end"
                    className={`text-[9px] font-mono-numbers ${isDarkMode ? 'fill-slate-500' : 'fill-slate-400'}`}
                  >
                    {valNum}
                  </text>
                </g>
              );
            })}

            {/* Gradient Fill under the line */}
            <defs>
              <linearGradient id="cumulativeGradTech" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={isDarkMode ? 0.35 : 0.2} />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area Path */}
            <path d={areaD} fill="url(#cumulativeGradTech)" />

            {/* Line Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points & Displayed Cumulative Numbers (แสดงตัวเลขกราฟสะสม) */}
            {points.map((pt, idx) => {
              const hasIncrease = pt.count > 0;
              const showNumber = pt.cumulativeCount > 0;

              return (
                <g
                  key={pt.hour}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Outer circle for hover */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hasIncrease ? 4 : 2}
                    className={`transition-all ${
                      hasIncrease
                        ? isDarkMode
                          ? 'fill-slate-900 stroke-emerald-400 stroke-2 group-hover:r-6'
                          : 'fill-white stroke-emerald-600 stroke-2 group-hover:r-6'
                        : isDarkMode
                        ? 'fill-slate-700'
                        : 'fill-slate-300'
                    }`}
                  />

                  {/* DISPLAYED NUMBERS ON CUMULATIVE GRAPH (แสดงตัวเลขกราฟสะสม) */}
                  {showNumber && (
                    <g transform={`translate(${pt.x}, ${pt.y - 11})`}>
                      <rect
                        x="-14"
                        y="-12"
                        width="28"
                        height="13"
                        rx="2"
                        fill={isDarkMode ? '#0F172A' : '#FFFFFF'}
                        fillOpacity="0.95"
                        stroke={isDarkMode ? '#334155' : '#D1D5DB'}
                        strokeWidth="0.5"
                        className="group-hover:stroke-emerald-400"
                      />
                      <text
                        x="0"
                        y="-3"
                        textAnchor="middle"
                        className={`text-[9px] font-bold font-mono-numbers ${
                          isDarkMode ? 'fill-emerald-400' : 'fill-emerald-800'
                        }`}
                      >
                        {pt.cumulativeCount}
                      </text>
                    </g>
                  )}

                  {/* Hour text on X-axis */}
                  <text
                    x={pt.x}
                    y={chartHeight - 6}
                    textAnchor="middle"
                    className={`text-[9px] font-mono-numbers ${
                      isDarkMode ? 'fill-slate-400' : 'fill-slate-500'
                    }`}
                  >
                    {String(pt.hour).padStart(2, '0')}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Footer stats for cumulative chart (24-hour continuous progress) */}
      <div className={`mt-4 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className={`p-2.5 rounded-lg border ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            ยอดสะสมถึง 12:00 น. (ครึ่งวัน)
          </div>
          <div className={`font-mono-numbers font-bold text-sm mt-0.5 ${
            isDarkMode ? 'text-slate-200' : 'text-slate-800'
          }`}>
            {data[12]?.cumulativeCount.toLocaleString() || 0} งาน
          </div>
        </div>

        <div className={`p-2.5 rounded-lg border ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            ยอดสะสมถึง 18:00 น. (ช่วงเย็น)
          </div>
          <div className={`font-mono-numbers font-bold text-sm mt-0.5 ${
            isDarkMode ? 'text-slate-200' : 'text-slate-800'
          }`}>
            {data[18]?.cumulativeCount.toLocaleString() || 0} งาน
          </div>
        </div>

        <div className={`p-2.5 rounded-lg border ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            ยอดสะสมครบ 24 ชั่วโมง (23:00 น.)
          </div>
          <div className="font-mono-numbers font-bold text-emerald-500 text-sm mt-0.5">
            {totalComplete.toLocaleString()} งาน
          </div>
        </div>

        <div className={`p-2.5 rounded-lg border ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            ชั่วโมงงานเดินเร็วที่สุด
          </div>
          <div className={`font-mono-numbers font-bold text-sm mt-0.5 ${
            isDarkMode ? 'text-slate-200' : 'text-slate-800'
          }`}>
            {(() => {
              let maxInc = 0;
              let maxH = 0;
              data.forEach(d => {
                if (d.count > maxInc) {
                  maxInc = d.count;
                  maxH = d.hour;
                }
              });
              return `+${maxInc} งาน (${String(maxH).padStart(2, '0')}:00)`;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
