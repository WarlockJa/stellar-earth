
import React, { useState, useCallback } from 'react';
import DotGlobe from './components/DotGlobe';
import { getLocationInsight, searchLocation } from './services/geminiService';
import { LocationInsight } from './types';
import { Search, Info, Globe, Loader2, X, Navigation2 } from 'lucide-react';

const App: React.FC = () => {
  const [insight, setInsight] = useState<LocationInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetRotation, setTargetRotation] = useState<[number, number] | undefined>();

  const handleGlobeClick = async (lat: number, lng: number) => {
    setLoading(true);
    setInsight(null);
    const data = await getLocationInsight(lat, lng);
    setInsight(data);
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    const result = await searchLocation(searchQuery);
    if (result) {
      setTargetRotation([-result.lng, -result.lat]);
      await handleGlobeClick(result.lat, result.lng);
    }
    setLoading(false);
  };

  return (
    <div className="relative w-full h-screen bg-[#020205] text-white overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      </div>

      {/* Header / Search */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-xl px-4">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-400 group-focus-within:text-blue-300 transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any place on Earth..."
            className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all text-sm backdrop-blur-md"
          />
          {loading && (
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <Loader2 size={18} className="animate-spin text-blue-400" />
            </div>
          )}
        </form>
      </div>

      {/* Globe Component */}
      <div className="w-full h-full">
        <DotGlobe onDotClick={handleGlobeClick} targetRotation={targetRotation} />
      </div>

      {/* Insight Panel */}
      {insight && (
        <div className="absolute right-6 top-24 z-30 w-80 max-h-[70vh] glass rounded-3xl p-6 shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto">
          <button 
            onClick={() => setInsight(null)}
            className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Navigation2 size={20} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
              {insight.name}
            </h2>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2">Overview</h3>
              <p className="text-sm leading-relaxed text-gray-300">
                {insight.description}
              </p>
            </section>

            <section className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <h3 className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-2 flex items-center gap-1">
                <Info size={10} /> Did You Know?
              </h3>
              <p className="text-xs italic leading-relaxed text-gray-300">
                "{insight.funFact}"
              </p>
            </section>

            <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500 font-mono">
              <span>LAT: {insight.coordinates.lat.toFixed(4)}</span>
              <span>LNG: {insight.coordinates.lng.toFixed(4)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-blue-400/80 font-medium">
          <Globe size={14} />
          <span>STELLAR DOT MATRIX</span>
        </div>
        <p className="text-[10px] text-gray-500 tracking-wider">
          Drag to rotate • Click to explore with Gemini AI
        </p>
      </div>

      {/* Controls / Tips */}
      {!insight && !loading && (
        <div className="absolute bottom-6 right-6 glass px-4 py-2 rounded-full text-[10px] text-gray-400 animate-pulse pointer-events-none">
          Click any landmass to discover insights
        </div>
      )}
    </div>
  );
};

export default App;
