import React from 'react';
import { Route, Clock, Trees, DollarSign, Fuel, Star } from 'lucide-react';
import use3DTilt from '../hooks/use3DTilt';

export default function RouteCard({ route, isSelected, isRecommended, onClick, isLowestCO2, isLowestToll }) {
  const { name, distance, time, co2, toll, ecoScore, fuelCost } = route;

  // 3D Tilt Effect on hover
  const tilt = use3DTilt(6, 1.02);

  // Determine border styles based on selection/recommendation using custom colors
  const cardBorderClass = isSelected
    ? 'border-[#7c7c67] bg-[#f4f4f0] shadow-md glow-earth'
    : 'border-[#d8d8d0]/60 bg-[#fbfbf9]/40 hover:border-[#abab9c] hover:bg-[#e8e8e3]/30';

  // Determine Eco Score Color in soft warm tones (avoiding green, yellow, red)
  let scoreColorClass = 'text-[#abab9c] stroke-[#abab9c]';
  if (ecoScore >= 80) {
    scoreColorClass = 'text-[#5b5b4b] stroke-[#5b5b4b]';
  } else if (ecoScore >= 60) {
    scoreColorClass = 'text-[#7c7c67] stroke-[#7c7c67]';
  }

  // Calculate SVGs for Radial Progress Ring
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (ecoScore / 100) * circumference;

  return (
    <div
      ref={tilt.ref}
      style={tilt.style}
      onClick={onClick}
      className={`glass-panel p-5 rounded-2xl border ${cardBorderClass} cursor-pointer select-none relative group overflow-hidden tilt-card`}
    >
      {/* Badges container */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end" style={{ transform: 'translateZ(15px)' }}>
        {isRecommended && (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-[#1d1d16] bg-[#7c7c67]/15 border border-[#7c7c67]/40 uppercase font-accent animate-pulse">
            <Star className="w-3 h-3 fill-[#1d1d16] text-[#1d1d16]" /> Recommended
          </span>
        )}
        {isLowestCO2 && !isRecommended && (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-[#5b5b4b] bg-[#e8e8e3] border border-[#abab9c]/30 uppercase font-accent">
            Eco Champion
          </span>
        )}
        {isLowestToll && !isRecommended && (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-[#5b5b4b] bg-[#e8e8e3] border border-[#abab9c]/30 uppercase font-accent">
            Toll Saver
          </span>
        )}
      </div>

      <div className="flex gap-4" style={{ transform: 'translateZ(10px)' }}>
        {/* Left: Info details */}
        <div className="flex-1 space-y-3.5">
          <div>
            <h4 className="text-sm font-bold text-[#1d1d16] group-hover:text-[#5b5b4b] transition-colors flex items-center gap-1.5 font-accent">
              <Route className="w-4 h-4 text-[#7c7c67]" />
              {name}
            </h4>
            <p className="text-[11px] text-[#5b5b4b] font-semibold uppercase mt-0.5">Primary Route Segment</p>
          </div>

          {/* Quick numbers bar */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#1d1d16]">
              <Clock className="w-3.5 h-3.5 text-[#7c7c67]" />
              <span>
                <strong>{time}</strong> mins
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[#1d1d16]">
              <Route className="w-3.5 h-3.5 text-[#7c7c67]" />
              <span>
                <strong>{distance}</strong> km
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[#1d1d16]">
              <Trees className="w-3.5 h-3.5 text-[#7c7c67]" />
              <span>
                <strong>{co2}</strong> kg CO₂
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[#1d1d16]">
              <DollarSign className="w-3.5 h-3.5 text-[#7c7c67]" />
              <span>
                <strong>₹{toll}</strong> Toll
              </span>
            </div>
          </div>

          {/* Fuel cost line */}
          <div className="pt-2 border-t border-[#d8d8d0]/60 flex items-center gap-1.5 text-xs text-[#5b5b4b] font-medium">
            <Fuel className="w-3.5 h-3.5 text-[#7c7c67]" />
            <span>Est. Fuel Cost: <strong className="text-[#1d1d16]">₹{fuelCost}</strong></span>
          </div>
        </div>

        {/* Right: Eco Score Radial Indicator */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r={radius}
                className="stroke-[#e8e8e3]"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                className={scoreColorClass}
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xs font-bold text-[#1d1d16]">{ecoScore}</span>
            </div>
          </div>
          <span className="text-[10px] text-[#5b5b4b] font-bold uppercase mt-1 tracking-wider">Eco Score</span>
        </div>
      </div>
    </div>
  );
}
