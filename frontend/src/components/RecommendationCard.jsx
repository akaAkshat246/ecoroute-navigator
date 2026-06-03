import React from 'react';
import { Award, Zap, ShieldCheck } from 'lucide-react';

export default function RecommendationCard({ recommendation, route }) {
  if (!recommendation || !route) return null;

  const { reason, savings } = recommendation;
  const { name } = route;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-[#7c7c67]/30 bg-gradient-to-br from-[#7c7c67]/5 via-[#f4f4f0]/60 to-[#f4f4f0]/60 relative overflow-hidden glow-earth animate-fade-slide-up delay-300">
      {/* Background Grid */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#7c7c67]/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div>

      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-[#7c7c67]/15 rounded-lg border border-[#7c7c67]/30">
          <Award className="w-5 h-5 text-[#5b5b4b]" />
        </div>
        <h4 className="text-sm font-bold uppercase tracking-wider text-[#5b5b4b] font-accent">
          Optimal Selection Details
        </h4>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-[#1d1d16] leading-snug font-accent">{name}</h3>
          <p className="text-xs text-[#5b5b4b] mt-1 font-medium">{reason}</p>
        </div>

        {/* Savings Grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* CO2 Saved */}
          <div className="p-3 bg-[#fbfbf9] border border-[#d8d8d0] rounded-xl flex items-center gap-3">
            <div className="p-2 bg-[#7c7c67]/10 text-[#5b5b4b] rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#5b5b4b] font-bold uppercase tracking-wider">CO₂ Saved</p>
              <h5 className="text-sm font-bold text-[#1d1d16] font-accent">{savings.co2Saved > 0 ? `${savings.co2Saved} kg` : '0 kg'}</h5>
              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">vs. Max Emitting</p>
            </div>
          </div>

          {/* Money Saved */}
          <div className="p-3 bg-[#fbfbf9] border border-[#d8d8d0] rounded-xl flex items-center gap-3">
            <div className="p-2 bg-[#7c7c67]/10 text-[#5b5b4b] rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#5b5b4b] font-bold uppercase tracking-wider">Toll Savings</p>
              <h5 className="text-sm font-bold text-[#1d1d16] font-accent">₹{savings.moneySaved}</h5>
              <p className="text-[9px] text-slate-500 font-semibold mt-0.5">vs. Max Toll Route</p>
            </div>
          </div>
        </div>

        {/* Quick summary alert */}
        {savings.co2Saved > 0 || savings.moneySaved > 0 ? (
          <div className="p-3 bg-[#7c7c67]/10 border border-[#7c7c67]/20 rounded-xl text-xs text-[#5b5b4b] font-medium">
            Choosing this route is equivalent to offsetting{' '}
            <strong className="text-[#1d1d16]">{(savings.co2Saved / 20).toFixed(3)}</strong> trees per year!
          </div>
        ) : (
          <div className="p-3 bg-[#fbfbf9] border border-[#d8d8d0] rounded-xl text-xs text-[#5b5b4b] font-medium">
            This is the only available route option or alternatives present similar impacts.
          </div>
        )}
      </div>
    </div>
  );
}
