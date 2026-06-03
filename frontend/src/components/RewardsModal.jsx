import React from 'react';
import { X, Award, Flame, Calendar, History, Trees, ShieldAlert, Sparkles, Check, ChevronRight } from 'lucide-react';

export default function RewardsModal({ 
  activeTab = 'level', 
  onClose, 
  greenPoints = 0, 
  treesSaved = 0, 
  streak = 3,
  history = [] 
}) {
  const [tab, setTab] = React.useState(activeTab);

  // Sync state with activeTab prop changes
  React.useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  // Determine Level Title, next rank, and threshold
  let levelTitle = 'Leaf Learner';
  let nextRank = 'Eco Warrior';
  let threshold = 100;
  let prevThreshold = 0;
  let levelColor = 'text-[#5b5b4b] border-[#d8d8d0] bg-[#e8e8e3]/45';

  if (greenPoints >= 250) {
    levelTitle = 'Carbon Crusader';
    nextRank = 'Eco Overlord';
    threshold = 500;
    prevThreshold = 250;
    levelColor = 'text-[#1d1d16] border-[#7c7c67]/50 bg-[#7c7c67]/15';
  } else if (greenPoints >= 100) {
    levelTitle = 'Eco Warrior';
    nextRank = 'Carbon Crusader';
    threshold = 250;
    prevThreshold = 100;
    levelColor = 'text-[#1d1d16] border-[#5b5b4b]/50 bg-[#5b5b4b]/15';
  }

  const progressPct = Math.min(100, Math.max(0, ((greenPoints - prevThreshold) / (threshold - prevThreshold)) * 100));

  // Calendar days mock
  const calendarDays = [
    { day: 'Mon', active: true, label: 'May 31' },
    { day: 'Tue', active: true, label: 'Jun 01' },
    { day: 'Wed', active: true, label: 'Jun 02' },
    { day: 'Thu', active: true, label: 'Jun 03 (Today)' },
    { day: 'Fri', active: false, label: 'Jun 04' },
    { day: 'Sat', active: false, label: 'Jun 05' },
    { day: 'Sun', active: false, label: 'Jun 06' }
  ];

  return (
    <div className="fixed inset-0 bg-[#0c0c09]/60 backdrop-blur-md z-[5500] flex items-center justify-center p-4">
      {/* Modal Card */}
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-[#7c7c67]/40 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden animate-fade-slide-up">
        
        {/* Header decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#7c7c67]/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="p-6 border-b border-[#e8e8e3] flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#7c7c67]/10 rounded-xl border border-[#abab9c]/30 text-[#7c7c67]">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#1d1d16] font-accent">Sustainability Rewards</h2>
              <p className="text-[10px] text-[#5b5b4b] uppercase font-bold tracking-wider font-accent">Eco Ledger Console</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1d1d16]/5 hover:bg-[#1d1d16]/10 border border-[#1d1d16]/10 text-[#1d1d16] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs switcher */}
        <div className="px-6 py-3 bg-[#f4f4f0]/60 border-b border-[#e8e8e3] flex gap-2 overflow-x-auto shrink-0 z-10">
          {[
            { id: 'level', label: 'Level & Streak', icon: Award },
            { id: 'points', label: 'Green Points Ledger', icon: History },
            { id: 'trees', label: 'Trees Offset History', icon: Trees }
          ].map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  active 
                    ? 'border-[#7c7c67] bg-[#7c7c67]/15 text-[#1d1d16] font-bold shadow-inner'
                    : 'border-[#d8d8d0] bg-[#fbfbf9]/60 text-[#5b5b4b] hover:bg-[#e8e8e3] hover:text-[#1d1d16]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
          
          {/* TAB 1: LEVEL & STREAK */}
          {tab === 'level' && (
            <div className="space-y-6 animate-fade-slide-up">
              {/* Level summary block */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div className="md:col-span-4 flex flex-col items-center p-5 bg-[#fbfbf9] rounded-2xl border border-[#d8d8d0] text-center">
                  <div className={`p-4 rounded-full border mb-3 ${levelColor}`}>
                    <Award className="w-10 h-10 text-[#7c7c67]" />
                  </div>
                  <h3 className="text-base font-bold text-[#1d1d16] font-accent">{levelTitle}</h3>
                  <span className="text-[10px] text-[#5b5b4b] mt-1 font-semibold uppercase tracking-wider">Current Tier</span>
                </div>

                <div className="md:col-span-8 space-y-4">
                  <div>
                    <div className="flex justify-between items-end text-xs font-bold mb-1">
                      <span className="text-[#5b5b4b]">Level Progression</span>
                      <span className="text-[#1d1d16]">{greenPoints} / {threshold} XP</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-[#e8e8e3] h-3.5 rounded-full overflow-hidden border border-[#d8d8d0]">
                      <div 
                        className="bg-gradient-to-r from-[#7c7c67] to-[#5b5b4b] h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-[#5b5b4b] mt-1.5 font-semibold">
                      Earn <strong className="text-[#1d1d16]">{threshold - greenPoints} more XP</strong> to achieve <strong className="text-[#1d1d16] font-accent">{nextRank}</strong> tier status.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-[#7c7c67]/5 border border-[#7c7c67]/20 rounded-xl flex items-center gap-3">
                      <Flame className="w-8 h-8 text-[#7c7c67]" />
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#5b5b4b] tracking-wider block">Eco Streak</span>
                        <span className="text-lg font-black text-[#1d1d16] font-accent">{streak} Days</span>
                      </div>
                    </div>
                    <div className="p-3 bg-[#7c7c67]/5 border border-[#7c7c67]/20 rounded-xl flex items-center gap-3">
                      <Sparkles className="w-8 h-8 text-[#7c7c67]" />
                      <div>
                        <span className="text-[9px] uppercase font-bold text-[#5b5b4b] tracking-wider block">Multiplier</span>
                        <span className="text-lg font-black text-[#1d1d16] font-accent">1.2x XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Streak Calendar representation */}
              <div className="p-5 bg-[#fbfbf9] rounded-2xl border border-[#d8d8d0] space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#e8e8e3] pb-2.5">
                  <h4 className="text-xs font-bold text-[#1d1d16] uppercase tracking-wider font-accent flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#7c7c67]" /> Weekly Commute Streak Logger
                  </h4>
                  <span className="text-[9px] text-[#5b5b4b] font-bold uppercase tracking-wider">Calibrated Daily</span>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {calendarDays.map((cd, index) => (
                    <div 
                      key={index} 
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-between transition-all duration-300 ${
                        cd.active 
                          ? 'bg-[#7c7c67]/15 border-[#7c7c67]/50 text-[#1d1d16]' 
                          : 'bg-[#e8e8e3]/10 border-[#d8d8d0]/40 text-slate-400'
                      }`}
                      title={cd.label}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider block">{cd.day}</span>
                      {cd.active ? (
                        <div className="w-6 h-6 rounded-full bg-[#7c7c67] text-white flex items-center justify-center mt-2 shadow-sm">
                          <Check className="w-3.5 h-3.5 font-bold" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center mt-2 text-[10px]">
                          -
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#5b5b4b] leading-relaxed mt-2.5">
                  <strong className="text-[#1d1d16]">Streak Rule:</strong> Complete at least one low-emission route calculation or real-time drive daily. Streaks multiply XP point gains and speed up your leveling path.
                </p>
              </div>

              {/* Achievements Perks list */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#5b5b4b] uppercase tracking-wider font-accent">Level Perks & Achievements</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { title: 'Level 1: Leaf Learner', desc: 'Baseline carbon-neutral scoring system.', unlocked: true },
                    { title: 'Level 2: Eco Warrior', desc: '1.2x Point Multiplier & Streak Tracker.', unlocked: greenPoints >= 100 },
                    { title: 'Level 3: Carbon Crusader', desc: '1.5x Point Multiplier & Certified Badges.', unlocked: greenPoints >= 250 },
                    { title: 'Level 4: Eco Overlord', desc: 'Advanced analytics & custom dashboard themes.', unlocked: greenPoints >= 500 }
                  ].map((p, index) => (
                    <div 
                      key={index}
                      className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                        p.unlocked 
                          ? 'bg-[#fbfbf9] border-[#d8d8d0] text-[#1d1d16]' 
                          : 'bg-slate-50 border-slate-100 opacity-60 text-slate-400'
                      }`}
                    >
                      <div className={`p-1 rounded-full border mt-0.5 ${p.unlocked ? 'bg-[#7c7c67]/10 border-[#7c7c67]/30 text-[#7c7c67]' : 'bg-slate-200 border-slate-300 text-slate-400'}`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold font-accent block">{p.title}</span>
                        <p className="text-[10px] mt-0.5 leading-relaxed">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GREEN POINTS LEDGER */}
          {tab === 'points' && (
            <div className="space-y-5 animate-fade-slide-up">
              {/* Wallet Summary Card */}
              <div className="p-5 bg-gradient-to-r from-[#7c7c67]/10 to-[#5b5b4b]/5 rounded-2xl border border-[#7c7c67]/35 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#5b5b4b] tracking-wider block">Wallet Balance</span>
                  <h3 className="text-2xl font-black text-[#1d1d16] font-accent mt-0.5">{greenPoints} Green Points</h3>
                  <span className="text-[9px] text-[#7c7c67] font-semibold uppercase tracking-wider block mt-1">1 Point = 0.20kg of CO₂ reduction</span>
                </div>
                <div className="p-3 bg-[#fbfbf9] border border-[#d8d8d0] rounded-xl text-center">
                  <span className="text-[8px] uppercase font-bold text-[#5b5b4b] tracking-widest block">Daily Cap</span>
                  <span className="text-sm font-bold text-[#1d1d16] font-accent">500 XP</span>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-[#e8e8e3] pb-2.5">
                  <h4 className="text-xs font-bold text-[#1d1d16] uppercase tracking-wider font-accent flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#7c7c67]" /> Rewards Activity Log
                  </h4>
                  <span className="text-[10px] text-slate-500 font-semibold">{history.length} Record(s)</span>
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-10 bg-[#fbfbf9] rounded-2xl border border-[#d8d8d0] border-dashed">
                    <p className="text-xs text-[#5b5b4b]">No points transaction records found. Compute a route or complete a drive to earn XP!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1.5">
                    {history.map((log, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-[#fbfbf9] hover:bg-[#f4f4f0]/50 border border-[#d8d8d0] rounded-xl flex justify-between items-center transition-all animate-fade-slide-up"
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-[#1d1d16] font-accent block">{log.description}</span>
                          <span className="text-[9px] text-[#5b5b4b]">{log.timestamp}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-[#7c7c67] font-accent">+{log.points} XP</span>
                          <p className="text-[9px] text-[#5b5b4b] font-semibold">Processed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* How points work panel */}
              <div className="p-4 bg-[#fbfbf9] rounded-2xl border border-[#d8d8d0] space-y-2 text-[11px] text-[#5b5b4b] leading-relaxed">
                <span className="font-bold text-xs text-[#1d1d16] font-accent flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-[#7c7c67]" /> Points Distribution Algorithm
                </span>
                <p>
                  Green Points are awarded for choices that optimize fuel and avoid congestion. Completing a physical trip via the **Start GPS Odometer** dashboard tracks relative carbon savings versus the maximum emitting options, yielding XP rewards dynamically sync'd back to your account.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: TREES OFFSET */}
          {tab === 'trees' && (
            <div className="space-y-5 animate-fade-slide-up">
              {/* Carbon saved metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4.5 bg-[#fbfbf9] border border-[#d8d8d0] rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-[#7c7c67]/10 text-[#7c7c67] rounded-xl border border-[#7c7c67]/20">
                    <Trees className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#5b5b4b] tracking-wider block">Trees Offset</span>
                    <h3 className="text-xl font-black text-[#1d1d16] font-accent mt-0.5">{treesSaved.toFixed(4)} Trees</h3>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Equivalent absorption/year</p>
                  </div>
                </div>

                <div className="p-4.5 bg-[#fbfbf9] border border-[#d8d8d0] rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-[#7c7c67]/10 text-[#7c7c67] rounded-xl border border-[#7c7c67]/20">
                    <History className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-[#5b5b4b] tracking-wider block">CO₂ Savings</span>
                    <h3 className="text-xl font-black text-[#1d1d16] font-accent mt-0.5">{(treesSaved * 20).toFixed(2)} kg</h3>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Total emissions avoided</p>
                  </div>
                </div>
              </div>

              {/* Equivalence calculator grid */}
              <div className="p-5 bg-[#fbfbf9] rounded-2xl border border-[#d8d8d0] space-y-3.5">
                <h4 className="text-xs font-bold text-[#1d1d16] uppercase tracking-wider font-accent border-b border-[#e8e8e3] pb-2.5">
                  Equivalent Environmental Impacts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-[#f4f4f0]/80 rounded-xl border border-[#e8e8e3]">
                    <span className="text-[9px] uppercase font-bold text-[#5b5b4b] tracking-wider block mt-1">Smartphones</span>
                    <span className="text-sm font-extrabold text-[#1d1d16] font-accent mt-0.5 block">
                      {Math.round(treesSaved * 2430)} Charged
                    </span>
                  </div>
                  <div className="p-3 bg-[#f4f4f0]/80 rounded-xl border border-[#e8e8e3]">
                    <span className="text-[9px] uppercase font-bold text-[#5b5b4b] tracking-wider block mt-1">Car Mileage</span>
                    <span className="text-sm font-extrabold text-[#1d1d16] font-accent mt-0.5 block">
                      {Math.round(treesSaved * 51.5)} km Avoided
                    </span>
                  </div>
                  <div className="p-3 bg-[#f4f4f0]/80 rounded-xl border border-[#e8e8e3]">
                    <span className="text-[9px] uppercase font-bold text-[#5b5b4b] tracking-wider block mt-1">LED Bulb Hours</span>
                    <span className="text-sm font-extrabold text-[#1d1d16] font-accent mt-0.5 block">
                      {Math.round(treesSaved * 1250)} Hours
                    </span>
                  </div>
                </div>
              </div>

              {/* Tree offsets record log */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#5b5b4b] uppercase tracking-wider font-accent border-b border-[#e8e8e3] pb-2">
                  Carbon-Offset Log
                </h4>
                
                {history.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#5b5b4b]">
                    Calculate carbon-neutral routes to start saving trees!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {history.map((log, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-[#fbfbf9] border border-[#d8d8d0] rounded-xl flex justify-between items-center text-xs"
                      >
                        <div>
                          <strong className="text-[#1d1d16] font-accent font-bold block truncate max-w-[320px]">{log.description}</strong>
                          <span className="text-[9px] text-[#5b5b4b] block mt-0.5">{log.timestamp}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#7c7c67] font-accent">{log.trees.toFixed(4)} Trees</span>
                          <p className="text-[9px] text-[#5b5b4b] mt-0.5">Offset Equivalent</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-[#e8e8e3] bg-[#f4f4f0]/40 flex justify-end shrink-0 z-10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#7c7c67] hover:bg-[#5b5b4b] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Acknowledge &amp; Return
          </button>
        </div>

      </div>
    </div>
  );
}
