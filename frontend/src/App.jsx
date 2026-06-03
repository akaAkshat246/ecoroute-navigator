import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RewardsModal from './components/RewardsModal';

function App() {
  const [greenPoints, setGreenPoints] = useState(0);
  const [treesSaved, setTreesSaved] = useState(0);
  const [streak, setStreak] = useState(0);
  const [activeModalTab, setActiveModalTab] = useState(null);
  const [rewardsHistory, setRewardsHistory] = useState([]);

  const handleUpdateRewards = (points, trees, routeName) => {
    // Only update and log if actual values are present
    if (points === 0 && trees === 0) return;

    setGreenPoints(prev => prev + points);
    setTreesSaved(prev => prev + trees);

    // Format local date string
    const now = new Date();
    const formatTime = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setRewardsHistory(prev => [
      {
        description: routeName || 'Eco Segment Visited',
        points,
        trees,
        timestamp: formatTime(now)
      },
      ...prev
    ]);

    // If it's a completed trip (not search calculation), increment the commute streak
    if (routeName && !routeName.includes('Calculated')) {
      setStreak(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-[#1d1d16] flex flex-col antialiased relative">
      <Navbar 
        greenPoints={greenPoints} 
        treesSaved={treesSaved} 
        onOpenRewardsModal={setActiveModalTab} 
      />
      
      <main className="flex-1 flex flex-col">
        <Home onUpdateRewards={handleUpdateRewards} />
      </main>

      {/* Sustainability Rewards Modal Overlay */}
      {activeModalTab && (
        <RewardsModal
          activeTab={activeModalTab}
          onClose={() => setActiveModalTab(null)}
          greenPoints={greenPoints}
          treesSaved={treesSaved}
          streak={streak}
          history={rewardsHistory}
        />
      )}

      <footer className="w-full border-t border-[#e8e8e3] py-5 text-center text-xs text-[#5b5b4b] font-semibold tracking-wider uppercase font-accent space-y-1.5">
        <div>
          &copy; {new Date().getFullYear()} EcoRoute Navigator. All Rights Reserved.
        </div>
        <div className="text-[10px] text-[#5b5b4b]">
          Designed &amp; Developed by <span className="text-[#1d1d16] font-bold tracking-wider">Akshat Vats</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
