import React, { useState } from 'react';
import { Search, MapPin, Car, Sparkles, Navigation } from 'lucide-react';
import use3DTilt from '../hooks/use3DTilt';

export default function SearchForm({ onSearch, isLoading }) {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleType, setVehicleType] = useState('petrol_car');
  const [optimization, setOptimization] = useState('balanced');
  const [fuelPrice, setFuelPrice] = useState('96.70');
  const [isLocating, setIsLocating] = useState(false);

  // Mild 3D tilt effect on the form wrapper
  const tilt = use3DTilt(4, 1.01);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!source.trim() || !destination.trim()) return;
    onSearch({
      source: source.trim(),
      destination: destination.trim(),
      vehicleType,
      optimizationPreference: optimization,
      fuelPrice: parseFloat(fuelPrice) || 96.70
    });
  };

  const handleOptimizationChange = (optId) => {
    setOptimization(optId);
    if (source.trim() && destination.trim()) {
      onSearch({
        source: source.trim(),
        destination: destination.trim(),
        vehicleType,
        optimizationPreference: optId,
        fuelPrice: parseFloat(fuelPrice) || 96.70
      });
    }
  };

  const handleGPSLocate = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setIsLocating(true);
    setSource("Locating GPS position...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse-geocode via Nominatim to get street names
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`);
          if (response.ok) {
            const data = await response.json();
            const displayName = data.display_name.split(',').slice(0, 3).join(',');
            setSource(displayName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } else {
            setSource(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        } catch (err) {
          setSource(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error(error);
        setSource("");
        setIsLocating(false);
        alert("GPS Locate Failed. Please check browser location permissions.");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleLoadDemo = () => {
    setSource('Noida Sector 62');
    setDestination('IGI Airport');
    setVehicleType('petrol_car');
    setOptimization('balanced');
    setFuelPrice('96.70');
    
    onSearch({
      source: 'Noida Sector 62',
      destination: 'IGI Airport',
      vehicleType: 'petrol_car',
      optimizationPreference: 'balanced',
      fuelPrice: 96.70
    });
  };

  return (
    <div
      ref={tilt.ref}
      style={tilt.style}
      className="glass-panel p-6 rounded-2xl border border-[#d8d8d0] relative overflow-hidden glow-earth cursor-default select-none tilt-card"
    >
      {/* Dynamic Glow in soft tones */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#7c7c67]/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none"></div>

      <div className="flex items-center justify-between mb-5" style={{ transform: 'translateZ(20px)' }}>
        <h3 className="text-lg font-bold text-[#1d1d16] font-accent flex items-center gap-2">
          <Navigation className="w-5 h-5 text-[#7c7c67]" />
          Route Planner
        </h3>
        <button
          type="button"
          onClick={handleLoadDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#5b5b4b] bg-[#e8e8e3]/60 hover:bg-[#e8e8e3]/80 border border-[#d8d8d0] hover:border-[#abab9c] transition-all cursor-pointer font-accent"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Load Demo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" style={{ transform: 'translateZ(10px)' }}>
        {/* Starting Point (with GPS Locate button) */}
        <div>
          <label className="block text-xs font-semibold text-[#5b5b4b] mb-1.5 uppercase tracking-wider">Starting Point</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-[#7c7c67]" />
              <input
                type="text"
                placeholder="e.g., Mumbai, Maharashtra"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
                disabled={isLocating}
                className="w-full pl-10 pr-4 py-3 bg-[#fbfbf9] border border-[#d8d8d0] rounded-xl text-sm text-[#1d1d16] placeholder-[#abab9c] focus:outline-none focus:border-[#7c7c67] transition-colors disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={handleGPSLocate}
              disabled={isLocating || isLoading}
              className="px-3.5 py-3 rounded-xl bg-[#fbfbf9] border border-[#d8d8d0] text-xs font-bold text-[#5b5b4b] hover:text-[#1d1d16] hover:border-[#7c7c67] hover:bg-[#e8e8e3] transition-all flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
              title="Locate via GPS"
            >
              GPS
            </button>
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="block text-xs font-semibold text-[#5b5b4b] mb-1.5 uppercase tracking-wider">Destination</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-[#7c7c67]" />
            <input
              type="text"
              placeholder="e.g., Pune, Maharashtra"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 bg-[#fbfbf9] border border-[#d8d8d0] rounded-xl text-sm text-[#1d1d16] placeholder-[#abab9c] focus:outline-none focus:border-[#7c7c67] transition-colors"
            />
          </div>
        </div>

        {/* Vehicle & Fuel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5b5b4b] mb-1.5 uppercase tracking-wider">Vehicle Type</label>
            <div className="relative">
              <Car className="absolute left-3 top-3.5 w-4 h-4 text-[#7c7c67]" />
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full pl-9 pr-2 py-3 bg-[#fbfbf9] border border-[#d8d8d0] rounded-xl text-sm text-[#1d1d16] focus:outline-none focus:border-[#7c7c67] transition-colors appearance-none cursor-pointer"
              >
                <option value="petrol_car" className="bg-[#fbfbf9] text-[#1d1d16]">Petrol Car</option>
                <option value="diesel_car" className="bg-[#fbfbf9] text-[#1d1d16]">Diesel Car</option>
                <option value="bike" className="bg-[#fbfbf9] text-[#1d1d16]">Motorbike</option>
                <option value="ev" className="bg-[#fbfbf9] text-[#1d1d16]">EV (Electric)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5b5b4b] mb-1.5 uppercase tracking-wider">Fuel Cost (₹/L)</label>
            <input
              type="number"
              step="0.01"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
              className="w-full px-4 py-3 bg-[#fbfbf9] border border-[#d8d8d0] rounded-xl text-sm text-[#1d1d16] focus:outline-none focus:border-[#7c7c67] transition-colors"
              placeholder="96.70"
            />
          </div>
        </div>

        {/* Optimization Preference */}
        <div>
          <label className="block text-xs font-semibold text-[#5b5b4b] mb-2 uppercase tracking-wider">Optimization Preference</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'eco', label: 'Eco' },
              { id: 'toll', label: 'Least Toll' },
              { id: 'no_toll', label: 'No Toll' },
              { id: 'balanced', label: 'Balanced' }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleOptimizationChange(opt.id)}
                className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  optimization === opt.id
                    ? 'border-[#7c7c67] bg-[#7c7c67]/15 text-[#1d1d16] font-bold shadow-inner'
                    : 'border-[#d8d8d0] bg-[#e8e8e3]/40 text-[#5b5b4b] hover:bg-[#e8e8e3]/80 hover:text-[#1d1d16]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-[#7c7c67] to-[#5b5b4b] hover:from-[#5b5b4b] hover:to-[#474739] disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-500 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Searching optimal routes...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Calculate Routes</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
