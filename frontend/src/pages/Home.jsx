import React, { useState, useEffect, useRef } from 'react';
import SearchForm from '../components/SearchForm';
import RouteCard from '../components/RouteCard';
import RecommendationCard from '../components/RecommendationCard';
import RouteMap from '../components/RouteMap';
import use3DTilt from '../hooks/use3DTilt';
import { 
  Compass, CloudSun, AlertTriangle, BarChart3, 
  Trees, Trophy, BookOpen, Info, Navigation, Play, StopCircle, Award, CheckCircle, RefreshCw,
  Leaf
} from 'lucide-react';

// Helper to calculate geodesic distance (in km) between two points
function getGeodesicDistance(coord1, coord2) {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Sub-component for a 3D-tilting statistics card
function StatCard({ title, value, subtitle, icon: Icon, colorClass, delayClass }) {
  const tilt = use3DTilt(10, 1.05);
  
  return (
    <div
      ref={tilt.ref}
      style={tilt.style}
      className={`glass-panel p-4 rounded-xl border border-[#d8d8d0] bg-[#fbfbf9] flex flex-col justify-between tilt-card cursor-default select-none animate-fade-slide-up ${delayClass || ''}`}
    >
      <div className="flex justify-between items-start" style={{ transform: 'translateZ(15px)' }}>
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#5b5b4b]">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg bg-[#f4f4f0] border border-[#d8d8d0] ${colorClass}`}>
            <Icon className="w-3.5 h-3.5 text-[#5b5b4b]" />
          </div>
        )}
      </div>
      <div className="mt-3.5" style={{ transform: 'translateZ(20px)' }}>
        <h4 className="text-xl font-bold font-accent text-[#1d1d16]">{value}</h4>
        <p className="text-[10px] text-[#7c7c67] font-semibold mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default function Home({ onUpdateRewards }) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [error, setError] = useState(null);
  const [activeInfoTab, setActiveInfoTab] = useState('carbon');

  // Driving & Tracking States
  const [isDriving, setIsDriving] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [driveDistance, setDriveDistance] = useState(0);
  const [driveCO2, setDriveCO2] = useState(0);
  const [drivePoints, setDrivePoints] = useState(0);
  const lastGPSPosRef = useRef(null);
  const [watchId, setWatchId] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const mapTilt = use3DTilt(2, 1.002);

  const handleSearch = async (params) => {
    // If driving, cancel it first
    cancelDriving();
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned status ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      setSelectedRouteId(data.recommendation.recommendedRouteId);
      
      if (data.stats) {
        onUpdateRewards(data.stats.greenPoints, data.stats.treeOffset, `${params.source} to ${params.destination} (Calculated)`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message && !err.message.includes('fetch') && !err.message.includes('Fetch')
        ? err.message 
        : 'Could not connect to routing server. Please ensure the backend is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRoute = results?.routes.find(r => r.id === selectedRouteId);
  const recommendedRoute = results?.routes.find(r => r.id === results.recommendation?.recommendedRouteId);

  // Clean up watchers on unmount
  useEffect(() => {
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);



  // Start Real Driving Location Tracing (HTML5 Geolocation watchPosition)
  const startGPSTracking = () => {
    if (!selectedRoute) return;
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsDriving(true);
    setDriveDistance(0);
    setDriveCO2(0);
    setDrivePoints(0);
    setSpeed(0);
    setShowSummaryModal(false);
    lastGPSPosRef.current = null;
    const startTime = Date.now();

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed: gpsSpeed } = pos.coords;
        const newPos = [latitude, longitude];
        
        setUserLocation(newPos);
        setSpeed(gpsSpeed ? Math.round(gpsSpeed * 3.6) : 0);

        // Stabilize Geolocation for the first 3 seconds of tracking to ignore calibration jumps
        if (Date.now() - startTime < 3000) {
          lastGPSPosRef.current = newPos;
          return;
        }

        // Accumulate distance between successive GPS ticks to avoid starting with false offset
        if (lastGPSPosRef.current) {
          const tickDist = getGeodesicDistance(lastGPSPosRef.current, newPos);
          if (tickDist > 0.005) { // 5 meter jitter threshold
            setDriveDistance((prev) => {
              const updatedDist = parseFloat((prev + tickDist).toFixed(2));
              const fraction = Math.min(1, updatedDist / selectedRoute.distance);
              setDriveCO2(parseFloat((fraction * selectedRoute.co2).toFixed(2)));
              setDrivePoints(Math.round(fraction * results.stats.greenPoints));
              return updatedDist;
            });
          }
        }
        lastGPSPosRef.current = newPos;

        // Check if user is within 150 meters of destination bounds
        const distToDest = getGeodesicDistance(newPos, results.endCoords);
        if (distToDest < 0.15) {
          finishDriving(id);
        }
      },
      (err) => {
        console.error(err);
        cancelDriving();
        alert("GPS Signal lost. Location tracking cancelled.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    setWatchId(id);
  };

  // Finish Driving
  const finishDriving = (watcherId) => {
    setIsDriving(false);
    setShowSummaryModal(true);
    setSpeed(0);
    
    // Clear geolocation watch if real GPS was active
    const activeWatchId = watcherId || watchId;
    if (activeWatchId) {
      navigator.geolocation.clearWatch(activeWatchId);
      setWatchId(null);
    }
  };

  // Cancel Driving / Reset Odometer
  const cancelDriving = () => {
    setIsDriving(false);
    setUserLocation(null);
    setSpeed(0);
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  if (!results) {
    return (
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center justify-center text-center relative space-y-16 animate-fade-slide-up">
        
        {/* Animated App Name in the Middle */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[#7c7c67]/10 rounded-2xl border border-[#7c7c67]/30 mb-2 animate-bounce">
            <Leaf className="w-8 h-8 text-[#7c7c67]" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tight text-[#1d1d16] font-accent leading-none shimmer-text select-none">
            EcoRoute Navigator
          </h1>
        </div>

        {/* Centered Search Box */}
        <div className="w-full max-w-2xl glass-panel p-6 md:p-8 rounded-3xl border border-[#d8d8d0] shadow-2xl relative">
          <div className="absolute -top-3 left-6 px-3 py-0.5 rounded bg-[#7c7c67] text-[#fbfbf9] text-[9px] font-bold uppercase tracking-wider font-accent shadow-md">
            National Router Console
          </div>
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
          {error && (
            <div className="mt-4 p-4 bg-[#7c7c67]/10 border border-[#7c7c67]/20 text-[#5b5b4b] rounded-2xl text-sm flex gap-2.5 items-start text-left">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Connection Error</strong>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* About Section (Extensive Overview) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch text-left">
          <div className="md:col-span-7 glass-panel p-8 rounded-3xl border border-[#e8e8e3] flex flex-col justify-center space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#7c7c67] font-accent">Corporate Paradigm</span>
            <h2 className="text-xl md:text-2xl font-bold text-[#1d1d16] font-accent flex items-center gap-2">
              <Compass className="w-6 h-6 text-[#7c7c67]" />
              About EcoRoute Navigator
            </h2>
            <div className="text-xs md:text-sm text-[#5b5b4b] space-y-3 leading-relaxed">
              <p>
                EcoRoute Navigator is a premium, multi-billion-dollar intelligent logistics platform designed to optimize travel routes across India. Combining state-of-the-art geodesic geocoding with real-time dynamic EV grids, ambient wind speeds, and toll-avoidance algorithms, we empower fleet drivers and commuters to calculate and travel along paths that represent the absolute minimum carbon and expenditure footprint.
              </p>
              <p>
                Under the hood, the application queries location addresses and transforms them into geographical coordinates. It then evaluates and ranks candidate route coordinates based on vehicle specifications, highway tolls, and weather parameters. By calculating real-time carbon indices and tree absorption equivalents, the platform provides actionable routes aligned with global ESG accounting parameters.
              </p>
            </div>
          </div>
          <div className="md:col-span-5 glass-panel p-2 rounded-3xl border border-[#e8e8e3] overflow-hidden relative shadow-lg aspect-[4/3] md:aspect-auto">
            <img src="/eco_route_banner.png" alt="Eco route navigation visualization" className="w-full h-full object-cover rounded-2xl" />
          </div>
        </div>

        {/* Detailed Features & How to Use Guide */}
        <div className="w-full glass-panel p-8 rounded-3xl border border-[#e8e8e3] text-left space-y-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#7c7c67] font-accent">Interactive Guide</span>
          <h2 className="text-xl md:text-2xl font-bold text-[#1d1d16] font-accent flex items-center gap-2">
            <Info className="w-6 h-6 text-[#7c7c67]" />
            How to Use &amp; Features in Detail
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7c7c67]/15 border border-[#7c7c67]/30 text-[#7c7c67] flex items-center justify-center shrink-0 font-bold font-accent text-xs">1</div>
                <div>
                  <strong className="text-[#1d1d16] block font-accent">Plan Your Trip</strong>
                  <span className="text-[#5b5b4b] leading-normal block mt-0.5">
                    Input your Starting Point and Destination in the console. You can also click the <strong>GPS</strong> locator button to reverse-geocode your active browser position automatically.
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7c7c67]/15 border border-[#7c7c67]/30 text-[#7c7c67] flex items-center justify-center shrink-0 font-bold font-accent text-xs">2</div>
                <div>
                  <strong className="text-[#1d1d16] block font-accent">Select Vehicle &amp; Fuel Specifications</strong>
                  <span className="text-[#5b5b4b] leading-normal block mt-0.5">
                    Choose from Petrol, Diesel, Motorbike, or EV vehicle classes. Customize the active fuel price parameter (in ₹/L) to calibrate exact fuel expenditure estimates for all candidate routes.
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7c7c67]/15 border border-[#7c7c67]/30 text-[#7c7c67] flex items-center justify-center shrink-0 font-bold font-accent text-xs">3</div>
                <div>
                  <strong className="text-[#1d1d16] block font-accent">Choose Optimization Profile</strong>
                  <span className="text-[#5b5b4b] leading-normal block mt-0.5">
                    Select from <strong>Eco</strong> (minimum CO₂ emissions), <strong>Least Toll</strong> (minimal toll costs), <strong>No Toll</strong> (strict avoidance of highway tolls), or <strong>Balanced</strong> (optimal mix of cost and carbon savings).
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7c7c67]/15 border border-[#7c7c67]/30 text-[#7c7c67] flex items-center justify-center shrink-0 font-bold font-accent text-xs">4</div>
                <div>
                  <strong className="text-[#1d1d16] block font-accent">Analyze Evaluated Routes</strong>
                  <span className="text-[#5b5b4b] leading-normal block mt-0.5">
                    Once calculated, compare alternative paths side-by-side on the sidebar. View distances, expected time intervals, estimated fuel costs, and carbon ratings dynamically mapped on the screen.
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7c7c67]/15 border border-[#7c7c67]/30 text-[#7c7c67] flex items-center justify-center shrink-0 font-bold font-accent text-xs">5</div>
                <div>
                  <strong className="text-[#1d1d16] block font-accent">Start GPS Odometer Tracing</strong>
                  <span className="text-[#5b5b4b] leading-normal block mt-0.5">
                    Click <strong>Start GPS Odometer</strong> to go live. The console switches to HUD driving mode, tracking coordinates, speed, and real-time carbon savings relative to standard high-emitting transits.
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#7c7c67]/15 border border-[#7c7c67]/30 text-[#7c7c67] flex items-center justify-center shrink-0 font-bold font-accent text-xs">6</div>
                <div>
                  <strong className="text-[#1d1d16] block font-accent">Claim Carbon Rewards</strong>
                  <span className="text-[#5b5b4b] leading-normal block mt-0.5">
                    Click badges in the header to view streak records, Green Points logs, and trees saved. Collect rewards upon arriving at your destination to increment streaks and build your sustainability rank.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Capabilities & Infrastructure Section (Alternating Left-Right Layout) */}
        <div className="w-full space-y-16 text-left">
          <h2 className="text-xs font-bold text-[#7c7c67] uppercase tracking-widest font-accent text-center">
            System Capabilities &amp; Infrastructure
          </h2>
          
          <div className="space-y-16">
            {/* Capability 1: EV Logistics (Image Left, Text Right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-5 glass-panel p-2 rounded-3xl border border-[#e8e8e3] overflow-hidden relative shadow-lg aspect-[4/3] md:aspect-auto hover:border-[#abab9c] transition-colors duration-300">
                <img src="/ev_charging_hub.png" alt="Futuristic EV Charging Station" className="w-full h-full object-cover rounded-2xl" />
              </div>
              <div className="md:col-span-7 glass-panel p-8 rounded-3xl border border-[#e8e8e3] flex flex-col justify-center space-y-4 hover:border-[#abab9c] transition-colors duration-300">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#7c7c67] font-accent">EV Logistics Core</span>
                <h3 className="text-lg md:text-xl font-bold text-[#1d1d16] font-accent">
                  Intelligent Grid &amp; Weather Adaptation
                </h3>
                <div className="text-xs md:text-sm text-[#5b5b4b] space-y-3 leading-relaxed">
                  <p>
                    EcoRoute Navigator integrates a deep meteorological adaptation engine that adjusts route recommendations in real-time. By overlaying public DC Fast-Charging stations across the national highway grid, the platform calculates safe charging stop intervals based on active battery levels and vehicle range.
                  </p>
                  <p>
                    The routing core computes wind resistance coordinates and thermal effects on batteries. Extreme cold (below 10°C) or hot waves (above 35°C) activate heating and cooling cycles, lowering electric vehicle battery efficiency by up to 12%. This reduces the relative Eco Score and automatically triggers recommendations for routes with optimal topography and thermal stability.
                  </p>
                </div>
              </div>
            </div>

            {/* Capability 2: Carbon Accounting (Text Left, Image Right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 order-2 md:order-1 glass-panel p-8 rounded-3xl border border-[#e8e8e3] flex flex-col justify-center space-y-4 hover:border-[#abab9c] transition-colors duration-300">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#7c7c67] font-accent">Carbon Accounting</span>
                <h3 className="text-lg md:text-xl font-bold text-[#1d1d16] font-accent">
                  Reward Ledgers &amp; ESG Multipliers
                </h3>
                <div className="text-xs md:text-sm text-[#5b5b4b] space-y-3 leading-relaxed">
                  <p>
                    Our carbon accounting core implements exact carbon combustion factors calibrated by vehicle class. The system evaluates emission values: Petrol Cars produce 0.12 kg/km, Diesel Cars produce 0.14 kg/km, Motorbikes produce 0.08 kg/km, and Electric Vehicles yield a grid-equivalent of 0.03 kg/km.
                  </p>
                  <p>
                    Commuters who select eco-optimal segments receive Green Points mapped directly to CO₂ reduction indices, where every tree offset equivalent represents 20kg of carbon dioxide saved per year. Completed trips update active streaks, incrementing experience scores and building your overall level rank.
                  </p>
                </div>
              </div>
              <div className="md:col-span-5 order-1 md:order-2 glass-panel p-2 rounded-3xl border border-[#e8e8e3] overflow-hidden relative shadow-lg aspect-[4/3] md:aspect-auto hover:border-[#abab9c] transition-colors duration-300">
                <img src="/carbon_savings_graph.png" alt="Carbon Analytics Visualization" className="w-full h-full object-cover rounded-2xl" />
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative animate-fade-slide-up">
      
      {/* Centered Celebration Summary Modal Overlay */}
      {showSummaryModal && selectedRoute && (
        <div className="fixed inset-0 bg-[#0c0c09]/60 backdrop-blur-md z-[5000] flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-[#7c7c67]/40 relative text-center space-y-6 glow-earth animate-fade-slide-up">
            <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#7c7c67]/10 border border-[#abab9c]/30 text-[9px] font-bold text-[#5b5b4b] uppercase tracking-widest font-accent">
              HUD Core by Akshat Vats
            </div>

            <div className="flex justify-center">
              <div className="p-4 bg-[#7c7c67]/10 rounded-full border border-[#abab9c]/30 glow-earth">
                <CheckCircle className="w-12 h-12 text-[#5b5b4b]" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#1d1d16] font-accent">Destination Reached!</h2>
              <p className="text-xs text-[#5b5b4b]">
                You completed your transit along <strong className="text-[#1d1d16]">{selectedRoute.name.split('(')[0]}</strong>.
              </p>
            </div>

            {/* Final Stats Summary Card Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-[#fbfbf9] rounded-xl border border-[#d8d8d0]">
                <span className="text-[9px] text-[#5b5b4b] font-bold uppercase block tracking-wider">Distance</span>
                <span className="text-sm font-bold text-[#1d1d16] mt-1 font-accent">{selectedRoute.distance} km</span>
              </div>
              <div className="p-3 bg-[#fbfbf9] rounded-xl border border-[#d8d8d0]">
                <span className="text-[9px] text-[#5b5b4b] font-bold uppercase block tracking-wider">CO₂ Savings</span>
                <span className="text-sm font-bold text-[#1d1d16] mt-1 font-accent">
                  {results.stats.co2Reduction > 0 ? `${results.stats.co2Reduction}%` : '0%'}
                </span>
              </div>
              <div className="p-3 bg-[#fbfbf9] rounded-xl border border-[#d8d8d0]">
                <span className="text-[9px] text-[#5b5b4b] font-bold uppercase block tracking-wider">XP Reward</span>
                <span className="text-sm font-bold text-[#1d1d16] mt-1 font-accent">+{results.stats.greenPoints}</span>
              </div>
            </div>

            <div className="text-xs text-[#5b5b4b] leading-relaxed py-2 bg-[#f4f4f0] rounded-xl px-4 border border-[#d8d8d0]">
              Environmental Impact added: Offset equivalent to <strong className="text-[#1d1d16]">{(results.stats.treeOffset).toFixed(3)}</strong> Trees/year.
            </div>

            <button
              onClick={() => {
                setShowSummaryModal(false);
                setUserLocation(null);
                onUpdateRewards(results.stats.greenPoints, results.stats.treeOffset, selectedRoute.name.split('(')[0].trim());
              }}
              className="w-full py-3 bg-gradient-to-r from-[#7c7c67] to-[#5b5b4b] hover:from-[#5b5b4b] hover:to-[#474739] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Collect Rewards &amp; Exit HUD
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar: Search Inputs & Route listing (Col-span 5) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="glass-panel p-4 rounded-2xl border border-[#e8e8e3] space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#7c7c67] font-accent">Active Query</span>
            <button
              onClick={() => {
                setResults(null);
                setSelectedRouteId(null);
              }}
              className="px-2.5 py-1 bg-[#1d1d16]/5 hover:bg-[#1d1d16]/10 border border-[#1d1d16]/20 text-[#1d1d16] rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 font-accent"
            >
              <RefreshCw className="w-3 h-3" /> New Search
            </button>
          </div>
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </div>
        
        {error && (
          <div className="p-4 bg-[#7c7c67]/10 border border-[#7c7c67]/20 text-[#5b5b4b] rounded-2xl text-sm flex gap-2.5 items-start">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Connection Error</strong>
              {error}
            </div>
          </div>
        )}

        {/* Route Options List */}
        {!isDriving && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#5b5b4b] uppercase tracking-wider font-accent">
              Evaluated Routes ({results.routes.length})
            </h3>
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {results.routes.map((route, index) => {
                const maxCO2 = Math.max(...results.routes.map(r => r.co2));
                const minToll = Math.min(...results.routes.map(r => r.toll));
                
                const delayClass = index === 0 ? 'animate-fade-slide-up delay-100' : index === 1 ? 'animate-fade-slide-up delay-200' : 'animate-fade-slide-up delay-300';
                
                return (
                  <div key={route.id} className={delayClass}>
                    <RouteCard
                      route={route}
                      isSelected={route.id === selectedRouteId}
                      isRecommended={route.id === results.recommendation.recommendedRouteId}
                      isLowestCO2={route.co2 === Math.min(...results.routes.map(r => r.co2))}
                      isLowestToll={route.toll === minToll}
                      onClick={() => setSelectedRouteId(route.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Optimal Recommendation Summary */}
        {!isDriving && (
          <RecommendationCard
            recommendation={results.recommendation}
            route={recommendedRoute}
          />
        )}
      </div>

      {/* Right Dashboard Area: Maps, HUD stats, Methodology (Col-span 7) */}
      <div className="lg:col-span-7 space-y-6">
        {results && (
          <>
            {/* Weather / Alert header bar */}
            {results.weather && !isDriving && (
              <div className="p-4 rounded-2xl border border-[#e8e8e3] bg-[#e8e8e3]/30 text-[#1d1d16] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-slide-up">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#7c7c67]/10 rounded-xl text-[#7c7c67]">
                    <CloudSun className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5b5b4b] uppercase tracking-wider font-bold">Ambient Weather Forecast</span>
                    <h4 className="text-sm font-bold text-[#1d1d16] mt-0.5">
                      {results.weather.temperature}°C — {results.weather.condition}
                    </h4>
                  </div>
                </div>
                {results.weather.isSevere && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-[#7c7c67]/10 border border-[#7c7c67]/20 text-[#7c7c67] rounded-lg text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Travel delay incorporated (+15%)</span>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Mapbox Map with 3D Driving HUD perspective */}
            <div
              ref={mapTilt.ref}
              style={mapTilt.style}
              className="tilt-card animate-fade-slide-up delay-100"
            >
              <RouteMap
                routes={results.routes}
                selectedRouteId={selectedRouteId}
                startCoords={results.startCoords}
                endCoords={results.endCoords}
                chargingStations={results.chargingStations}
                onSelectRoute={setSelectedRouteId}
                userLocation={userLocation}
                isTracking={isDriving}
              />
            </div>

            {/* DRIVING MODE ACTIVE: Render live HUD screen (Tesla-style console) */}
            {isDriving && selectedRoute && (
              <div className="glass-panel p-6 rounded-2xl border border-[#7c7c67]/20 bg-gradient-to-br from-[#fbfbf9]/95 via-[#f4f4f0]/95 to-[#e8e8e3]/95 space-y-6 animate-fade-slide-up relative">
                
                {/* HUD Header Title */}
                <div className="flex justify-between items-center border-b border-[#e8e8e3] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#7c7c67] rounded-full animate-ping"></span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7c7c67] font-accent">
                      Live GPS Geotrack Active
                    </h4>
                  </div>
                  <button
                    onClick={cancelDriving}
                    className="flex items-center gap-1 px-3 py-1 bg-[#1d1d16]/5 hover:bg-[#1d1d16]/10 border border-[#1d1d16]/20 text-[#1d1d16] rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer"
                  >
                    <StopCircle className="w-3.5 h-3.5" /> Cancel Drive
                  </button>
                </div>

                {/* Speedometer & Progress Section */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  
                  {/* Digital Speedometer Ring */}
                  <div className="w-32 h-32 rounded-full border-4 border-dashed border-[#7c7c67]/30 flex flex-col items-center justify-center relative shrink-0">
                    <span className="text-[9px] font-bold text-[#5b5b4b] uppercase tracking-widest">Odometer</span>
                    <span className="text-3xl font-black font-accent text-[#1d1d16] mt-0.5">{speed}</span>
                    <span className="text-[10px] text-[#7c7c67] font-bold uppercase mt-0.5">km/h</span>
                  </div>

                  {/* Trip Progress Bar details */}
                  <div className="flex-1 w-full space-y-3.5">
                    <div>
                      <h4 className="text-sm font-bold text-[#1d1d16] truncate font-accent">{selectedRoute.name.split('(')[0]}</h4>
                      <p className="text-[10px] text-[#5b5b4b] font-medium">Tracing location coordinates to destination</p>
                    </div>

                    {/* Horizontal progress bar */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-[#e8e8e3] h-2.5 rounded-full overflow-hidden border border-[#d8d8d0]/60">
                        <div 
                          className="bg-gradient-to-r from-[#7c7c67] to-[#5b5b4b] h-full rounded-full transition-all duration-300"
                          style={{ width: `${(driveDistance / selectedRoute.distance) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-[#5b5b4b] font-bold">
                        <span>0 km (Start)</span>
                        <span className="text-[#7c7c67]">
                          {Math.round((driveDistance / selectedRoute.distance) * 100)}% Completed
                        </span>
                        <span>{selectedRoute.distance} km (End)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Ticking Counters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3.5 bg-[#fbfbf9]/60 border border-[#e8e8e3] rounded-xl text-center">
                    <span className="text-[9px] text-[#5b5b4b] font-bold uppercase tracking-wider block">Odometer</span>
                    <h5 className="text-base font-bold text-[#1d1d16] font-accent mt-1">{driveDistance} km</h5>
                  </div>
                  <div className="p-3.5 bg-[#fbfbf9]/60 border border-[#e8e8e3] rounded-xl text-center">
                    <span className="text-[9px] text-[#5b5b4b] font-bold uppercase tracking-wider block">CO₂ Emitted</span>
                    <h5 className="text-base font-bold text-[#1d1d16] font-accent mt-1">{driveCO2.toFixed(2)} kg</h5>
                  </div>
                  <div className="p-3.5 bg-[#fbfbf9]/60 border border-[#e8e8e3] rounded-xl text-center">
                    <span className="text-[9px] text-[#7c7c67] font-bold uppercase tracking-wider block">Green XP</span>
                    <h5 className="text-base font-bold text-[#7c7c67] font-accent mt-1">+{drivePoints} pts</h5>
                  </div>
                  <div className="p-3.5 bg-[#fbfbf9]/60 border border-[#e8e8e3] rounded-xl text-center">
                    <span className="text-[9px] text-[#7c7c67] font-bold uppercase tracking-wider block">Rem. Dist</span>
                    <h5 className="text-base font-bold text-[#7c7c67] font-accent mt-1">
                      {Math.max(0, parseFloat((selectedRoute.distance - driveDistance).toFixed(1)))} km
                    </h5>
                  </div>
                </div>
              </div>
            )}

            {/* NORMAL MODE ACTIVE: Render driving actions panel and statistics */}
            {!isDriving && (
              <div className="glass-panel p-4 rounded-xl border border-[#e8e8e3] bg-[#f4f4f0]/50 flex flex-wrap gap-3 items-center justify-between animate-fade-slide-up">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#7c7c67]" />
                  <span className="text-xs font-bold text-[#1d1d16]">Live Driving Console</span>
                </div>
                <div>
                  {/* Start real GPS tracing */}
                  <button
                    onClick={startGPSTracking}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#5b5b4b]/10 hover:bg-[#5b5b4b]/20 border border-[#5b5b4b]/30 hover:border-[#5b5b4b]/55 text-[#5b5b4b] text-xs font-bold uppercase rounded-lg transition-all cursor-pointer font-accent"
                  >
                    <Play className="w-3.5 h-3.5" /> Start GPS Odometer
                  </button>
                </div>
              </div>
            )}

            {/* NORMAL MODE: Dashboard Statistics Grid */}
            {!isDriving && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#5b5b4b] uppercase tracking-wider font-accent flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#7c7c67]" />
                  Live Trip Analysis
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 perspective-1000">
                  <StatCard 
                    title="Routes Compared"
                    value={results.stats.routesCompared}
                    subtitle="Alternatives Evaluated"
                    icon={Compass}
                    colorClass="text-slate-400"
                    delayClass="delay-100"
                  />
                  
                  <StatCard 
                    title="CO₂ Saved"
                    value={`${results.stats.co2Reduction}%`}
                    subtitle="vs. Highest Footprint"
                    icon={Trees}
                    colorClass="text-[#7c7c67]"
                    delayClass="delay-200"
                  />

                  <StatCard 
                    title="Toll Saved"
                    value={`₹${results.stats.tollSavings}`}
                    subtitle="Avoided Toll Fees"
                    icon={Trophy}
                    colorClass="text-[#7c7c67]"
                    delayClass="delay-300"
                  />

                  <StatCard 
                    title="Points Earned"
                    value={`+${results.stats.greenPoints} XP`}
                    subtitle="Added to Wallet"
                    icon={BookOpen}
                    colorClass="text-[#7c7c67] font-accent"
                    delayClass="delay-400"
                  />

                  <StatCard 
                    title="Trees Planted"
                    value={`+${results.stats.treeOffset.toFixed(3)}`}
                    subtitle="Equivalent Absorption"
                    icon={Trees}
                    colorClass="text-[#7c7c67]"
                    delayClass="delay-500"
                  />

                  <StatCard 
                    title="Optimal Route"
                    value={results.stats.bestRoute.split('(')[0]}
                    subtitle="Best Recommendation"
                    icon={Info}
                    colorClass="text-[#7c7c67]"
                    delayClass="delay-500"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Professional Sustainability & Methodological Ledger */}
        {!isDriving && results && (
          <div className="glass-panel p-6 rounded-2xl border border-[#e8e8e3] space-y-4">
            <div className="flex items-center gap-2 border-b border-[#e8e8e3] pb-3">
              <BookOpen className="w-5 h-5 text-[#7c7c67]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1d1d16] font-accent">
                Sustainability &amp; Methodology Ledger
              </h3>
            </div>

            {/* Ledger Navigation Tabs */}
            <div className="flex gap-2 text-xs font-semibold overflow-x-auto pb-1">
              {[
                { id: 'carbon', label: 'Carbon Factors' },
                { id: 'score', label: 'Eco Scoring' },
                { id: 'tips', label: 'Eco-Driving Tips' },
                { id: 'ev', label: 'EV &amp; Weather Curves' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveInfoTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg border shrink-0 transition-all cursor-pointer ${
                    activeInfoTab === tab.id 
                      ? 'border-[#7c7c67] bg-[#7c7c67]/10 text-[#7c7c67] font-accent' 
                      : 'border-[#e8e8e3] bg-[#e8e8e3]/30 text-[#5b5b4b] hover:text-[#1d1d16]'
                  }`}
                  dangerouslySetInnerHTML={{ __html: tab.label }}
                />
              ))}
            </div>

            {/* Tab Contents */}
            <div className="text-xs text-[#5b5b4b] leading-relaxed bg-[#fbfbf9]/60 p-4 rounded-xl border border-[#e8e8e3]">
              {activeInfoTab === 'carbon' && (
                <div className="space-y-3">
                  <p>
                    Carbon dioxide emissions are computed by multiplying the route distance by vehicle-specific combustion multipliers.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 text-center">
                    <div className="p-2 bg-[#f4f4f0]/90 rounded border border-[#e8e8e3]">
                      <span className="font-bold text-[#1d1d16]">Petrol Car</span>
                      <p className="text-[#7c7c67] mt-0.5 font-semibold">0.12 kg/km</p>
                    </div>
                    <div className="p-2 bg-[#f4f4f0]/90 rounded border border-[#e8e8e3]">
                      <span className="font-bold text-[#1d1d16]">Diesel Car</span>
                      <p className="text-[#7c7c67] mt-0.5 font-semibold">0.14 kg/km</p>
                    </div>
                    <div className="p-2 bg-[#f4f4f0]/90 rounded border border-[#e8e8e3]">
                      <span className="font-bold text-[#1d1d16]">Motorbike</span>
                      <p className="text-[#7c7c67] mt-0.5 font-semibold">0.08 kg/km</p>
                    </div>
                    <div className="p-2 bg-[#f4f4f0]/90 rounded border border-[#e8e8e3]">
                      <span className="font-bold text-[#1d1d16]">EV (Grid)</span>
                      <p className="text-[#7c7c67] mt-0.5 font-semibold">0.03 kg/km</p>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#e8e8e3]/20 border-l-2 border-[#7c7c67] text-[11px] text-[#5b5b4b] flex gap-2">
                    <span className="font-bold">Tree Offset Calculation:</span>
                    <span>1 virtual tree offset represents 20kg of CO₂ absorbed per year. Commuters are awarded Green Points corresponding directly to carbon savings vs alternative paths.</span>
                  </div>
                </div>
              )}

              {activeInfoTab === 'score' && (
                <div className="space-y-2.5">
                  <p>
                    The system evaluates route efficiency by calculating a primary **Eco Score** and a **Balanced Score** depending on user preferences:
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5 text-[#5b5b4b]">
                    <li>
                      <strong className="text-[#1d1d16]">Eco Score formula:</strong> 
                      <code className="px-1.5 py-0.5 bg-[#e8e8e3]/50 rounded text-[#7c7c67] mx-1 font-mono">100 - (CO₂ × 5) - (Toll / 10)</code>
                      clamped between 0 and 100.
                    </li>
                    <li>
                      <strong className="text-[#1d1d16]">Balanced Mode formula:</strong>
                      <code className="px-1.5 py-0.5 bg-[#e8e8e3]/50 rounded text-[#7c7c67] mx-1 font-mono">70% Eco + 30% Toll scores</code>. This calculates the optimal intersection between lower emissions and minimal expenditures.
                    </li>
                    <li>
                      <strong className="text-[#1d1d16]">Least Toll Mode:</strong> Prioritizes routes with minimal highway toll costs, using travel duration as a secondary tie-breaker.
                    </li>
                    <li>
                      <strong className="text-[#1d1d16]">No Toll Mode:</strong> Enforces a strict filter to select only routes that contain exactly <code className="px-1.5 py-0.5 bg-[#e8e8e3]/50 rounded text-[#7c7c67] font-mono">₹0 Toll</code> charges, falling back to Least Toll only if unavoidable.
                    </li>
                  </ul>
                </div>
              )}

              {activeInfoTab === 'tips' && (
                <div className="space-y-2.5">
                  <p>
                    By applying simple adjustments to your driving behavior, you can reduce fuel consumption and CO₂ emissions by up to <strong className="text-[#7c7c67]">15-20%</strong>:
                  </p>
                  <ul className="list-decimal pl-4 space-y-1.5 text-[#5b5b4b]">
                    <li><strong className="text-[#1d1d16]">Maintain steady speeds:</strong> Avoid aggressive acceleration and heavy braking. Use cruise control on highways where safe.</li>
                    <li><strong className="text-[#1d1d16]">Avoid unnecessary idling:</strong> If idling for more than 30 seconds (such as at traffic lights), turn off your engine.</li>
                    <li><strong className="text-[#1d1d16]">Monitor tire pressures:</strong> Under-inflated tires increase rolling resistance, wasting up to 3% of fuel.</li>
                    <li><strong className="text-[#1d1d16]">De-clutter your trunk:</strong> Extra weight demands higher torque, resulting in proportional emission spikes.</li>
                  </ul>
                </div>
              )}

              {activeInfoTab === 'ev' && (
                <div className="space-y-2.5">
                  <p>
                    EV performance and route calculations adjust dynamically to accommodate meteorological conditions:
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5 text-[#5b5b4b]">
                    <li>
                      <strong className="text-[#1d1d16]">Severe Weather Delay:</strong> Rainy, snowy, or stormy weather triggers a 15% increase in transit times on highway segments to account for low visibility and safe stopping distance.
                    </li>
                    <li>
                      <strong className="text-[#1d1d16]">EV Battery Efficiency:</strong> Cold conditions below 10°C or heatwaves above 35°C lower EV battery performance by up to 12% due to active heating/cooling cycles, lowering the route's relative Eco Score.
                    </li>
                    <li>
                      <strong className="text-[#1d1d16]">EV Charging Hubs:</strong> Automatically calculates and plots optimal public DC fast-chargers along routes to ensure range safety.
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
