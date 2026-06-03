import React from 'react';
import { Leaf, Navigation, Award, Trees } from 'lucide-react';

export default function Navbar({ greenPoints = 0, treesSaved = 0, onOpenRewardsModal }) {
  // Determine level title based on points using custom developer tones
  let levelTitle = 'Leaf Learner';
  let levelColor = 'text-[#5b5b4b] border-[#d8d8d0] bg-[#e8e8e3]/45';

  if (greenPoints >= 250) {
    levelTitle = 'Carbon Crusader';
    levelColor = 'text-[#1d1d16] border-[#7c7c67]/50 bg-[#7c7c67]/15';
  } else if (greenPoints >= 100) {
    levelTitle = 'Eco Warrior';
    levelColor = 'text-[#1d1d16] border-[#5b5b4b]/50 bg-[#5b5b4b]/15';
  }

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-[#e8e8e3] py-4 px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="relative p-2.5 bg-[#f4f4f0] rounded-xl border border-[#d8d8d0] glow-earth">
          <Leaf className="w-6 h-6 text-[#5b5b4b]" />
          <Navigation className="w-3.5 h-3.5 text-[#7c7c67] absolute bottom-1.5 right-1.5 transform rotate-45" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1d1d16] m-0 flex items-center gap-1.5 font-accent">
            EcoRoute <span className="text-[#7c7c67]">Navigator</span>
          </h1>
          <p className="text-xs text-[#5b5b4b] font-medium tracking-wide flex flex-wrap items-center gap-x-2">
            <span>Intelligent Eco-Friendly &amp; Toll-Optimized Routing</span>
            <span className="text-[#d8d8d0] hidden sm:inline">|</span>
            <span className="text-[#7c7c67] font-semibold tracking-wider font-accent">Dev: Akshat Vats</span>
          </p>
        </div>
      </div>

      {/* Sustainability Rewards Badges */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {/* Level Badge (Clickable) */}
        <button
          onClick={() => onOpenRewardsModal && onOpenRewardsModal('level')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 active:scale-95 transition-all cursor-pointer ${levelColor}`}
          title="Click to view Level & Streak Info"
        >
          <Award className="w-4 h-4 text-[#7c7c67]" />
          <span>{levelTitle}</span>
        </button>

        {/* Green Points Badge (Clickable) */}
        <button
          onClick={() => onOpenRewardsModal && onOpenRewardsModal('points')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d8d8d0] bg-[#e8e8e3]/30 text-[#1d1d16] text-xs font-semibold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
          title="Click to view Green Points Wallet & History"
        >
          <span className="w-2 h-2 rounded-full bg-[#7c7c67] animate-pulse"></span>
          <span>{greenPoints} Green Points</span>
        </button>

        {/* Trees Saved Badge (Clickable) */}
        <button
          onClick={() => onOpenRewardsModal && onOpenRewardsModal('trees')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d8d8d0] bg-[#e8e8e3]/30 text-[#1d1d16] text-xs font-semibold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
          title="Click to view Trees Offset equivalent & Analytics"
        >
          <Trees className="w-4 h-4 text-[#7c7c67]" />
          <span>{treesSaved.toFixed(3)} Trees Offset</span>
        </button>
      </div>
    </header>
  );
}
