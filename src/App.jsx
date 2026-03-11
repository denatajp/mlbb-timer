import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw, Timer, Search, ChevronDown, Check, Zap, Clock } from 'lucide-react';
import { LANES, SPELL_LIST } from './constants';

// --- Custom Searchable Dropdown Component ---
const HeroSelector = ({ heroes, selectedHero, onSelect, selectedInOtherLanes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Fitur 1: Filter hero agar tidak bisa dipilih jika sudah ada di lane lain
  const filteredHeroes = heroes.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!selectedInOtherLanes.includes(h.name) || selectedHero?.name === h.name)
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl border transition-all duration-300 ${
          selectedHero ? 'bg-accent/10 border-accent/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-900/50 border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedHero ? (
            <>
              <img src={selectedHero.image} className="w-7 h-7 rounded-full object-cover border border-accent/50" alt="" />
              <span className="truncate text-sm font-bold text-white uppercase tracking-wider">{selectedHero.name}</span>
            </>
          ) : (
            <span className="text-slate-500 text-xs uppercase font-bold tracking-widest">Select Hero</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-800 flex items-center gap-2 bg-slate-900/80">
            <Search size={14} className="text-accent" />
            <input 
              autoFocus
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600"
              placeholder="Cari hero..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
            {filteredHeroes.length > 0 ? (
              filteredHeroes.map(h => (
                <div 
                  key={h.name}
                  onClick={() => { onSelect(h); setIsOpen(false); setSearchTerm(""); }}
                  className="flex items-center justify-between p-2 hover:bg-accent/20 rounded-lg cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <img src={h.image} className="w-10 h-10 rounded-full object-cover group-hover:scale-110 transition-transform border border-slate-700" alt="" />
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white">{h.name}</span>
                  </div>
                  {selectedHero?.name === h.name && <Check size={16} className="text-accent" />}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-600 italic">Hero tidak tersedia</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [heroes, setHeroes] = useState([]);
  const [step, setStep] = useState('setup');
  const [draft, setDraft] = useState(
    LANES.map(lane => ({ 
      lane, 
      hero: null, 
      spell: lane === "JUNGLE" ? SPELL_LIST[1] : (SPELL_LIST[9] || SPELL_LIST[0]),
      hasEmblem: false 
    }))
  );
  
  const [gameTime, setGameTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [cooldowns, setCooldowns] = useState({}); // Menyimpan timestamp kapan spell ready
  const [manualMin, setManualMin] = useState(0);
  const [manualSec, setManualSec] = useState(0);

  const cleanImageUrl = (url) => url ? url.split('/revision')[0] : "";

  useEffect(() => {
    fetch('/hero-list.json')
      .then(res => res.json())
      .then(response => {
        const mappedHeroes = response.data.records.map(item => ({
          name: item.data.hero.data.name,
          image: item.data.hero.data.smallmap || item.data.hero.data.head,
        }));
        setHeroes(mappedHeroes.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(err => console.error("Gagal load hero:", err));
  }, []);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => setGameTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSetTime = () => {
    const total = (parseInt(manualMin || 0) * 60) + parseInt(manualSec || 0);
    setGameTime(total);
  };

  const triggerCooldown = (idx) => {
    // Fitur 3: Antisipasi agar timer tidak terganggu jika sedang cooldown
    if (!isRunning || (cooldowns[idx] && cooldowns[idx] > gameTime)) return;

    const baseCd = draft[idx].spell.cd;
    const finalCd = draft[idx].hasEmblem ? Math.floor(baseCd * 0.80) : baseCd;
    setCooldowns(prev => ({ ...prev, [idx]: gameTime + finalCd }));
  };

  // Helper untuk Fitur 1
  const getSelectedHeroNames = () => draft.map(d => d.hero?.name).filter(Boolean);

  if (step === 'setup') {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black tracking-tighter text-white italic mb-2 uppercase">KISS TOOLS <span className="text-accent not-italic">v2.2</span></h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {draft.map((slot, idx) => (
            <div key={idx} className="glass-card p-6 rounded-[2.2rem] flex flex-col items-center border-white/5 h-full">
              <div className="mb-6 flex flex-col items-center">
                 <div className="text-[10px] font-black text-accent tracking-[0.2em] uppercase mb-1">{slot.lane}</div>
                 <div className="h-1 w-8 bg-accent rounded-full"></div>
              </div>
              
              <div className="w-full space-y-6">
                <HeroSelector 
                  heroes={heroes} 
                  selectedHero={slot.hero} 
                  selectedInOtherLanes={getSelectedHeroNames()} // Fitur 1
                  onSelect={(h) => {
                    const newDraft = [...draft];
                    newDraft[idx].hero = h;
                    setDraft(newDraft);
                  }}
                />

                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {slot.lane === "JUNGLE" ? (
                      <div className="col-span-4 flex items-center justify-center p-2 bg-slate-900/80 rounded-xl border border-accent/30 gap-3">
                         <img src={cleanImageUrl(SPELL_LIST[1].url)} className="w-8 h-8 rounded-lg" alt="" />
                         <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Locked: Retri</span>
                      </div>
                    ) : (
                      SPELL_LIST.filter(s => s.id !== 'r').map(s => (
                        <button 
                          key={s.id}
                          onClick={() => {
                            const newDraft = [...draft];
                            newDraft[idx].spell = s;
                            setDraft(newDraft);
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                            slot.spell.id === s.id ? 'border-accent scale-110 z-10' : 'border-transparent grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                          }`}
                        >
                          <img src={cleanImageUrl(s.url)} alt={s.name} className="w-full aspect-square object-cover" />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    const newDraft = [...draft];
                    newDraft[idx].hasEmblem = !newDraft[idx].hasEmblem;
                    setDraft(newDraft);
                  }}
                  className={`w-full flex items-center justify-between gap-2 py-3 px-4 rounded-xl border-2 transition-all duration-300 ${
                    slot.hasEmblem ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-900/50 border-slate-800 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap size={14} className={slot.hasEmblem ? 'fill-blue-400' : ''} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">CD -20%</span>
                  </div>
                  <div className={`w-3 h-3 rounded-full border-2 ${slot.hasEmblem ? 'bg-blue-400 border-blue-400' : 'border-slate-700'}`}></div>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button 
            disabled={draft.some(d => !d.hero)}
            onClick={() => setStep('tracker')}
            className="group relative px-16 py-5 bg-accent disabled:bg-slate-800 rounded-2xl transition-all duration-300 active:scale-95"
          >
            <span className="relative text-dark font-black uppercase tracking-[0.3em] text-sm">Deploy Tracker</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Clock Card */}
        <div className="glass-card p-6 rounded-3xl border-white/5">
          <div className="text-6xl font-black text-white font-mono mb-6 text-center tabular-nums tracking-tighter">
            {formatTime(gameTime)}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex justify-center gap-2">
              <input type="number" placeholder="MM" className="input-field w-16 text-center font-bold" onChange={e => setManualMin(e.target.value)} />
              <input type="number" placeholder="SS" className="input-field w-16 text-center font-bold" onChange={e => setManualSec(e.target.value)} />
              <button onClick={handleSetTime} className="bg-slate-800 hover:bg-slate-700 px-4 rounded-xl text-[10px] font-black text-slate-300">SET</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setIsRunning(!isRunning)} className={`py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all ${isRunning ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50' : 'bg-accent text-dark'}`}>
                {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />} {isRunning ? 'STOP' : 'START'}
              </button>
              <button onClick={() => { setIsRunning(false); setGameTime(0); setCooldowns({}); }} className="py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700">
                <RotateCcw size={16} className="mx-auto text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 rounded-3xl lg:col-span-2 flex flex-col justify-center border-white/5">
          <h3 className="text-accent font-bold text-xs uppercase tracking-[0.3em] mb-4">Live Intelligence</h3>
          <p className="text-slate-300 italic text-xl font-light leading-relaxed">
            "Info spell lawan adalah koentji kemenangan. Fokus objektif, <span className="text-white font-bold underline decoration-accent">tutup mulut</span> yang banyak yapping."
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {draft.map((slot, idx) => {
          const readyTimestamp = cooldowns[idx] || 0;
          const timeLeft = readyTimestamp - gameTime;
          const isCooldown = timeLeft > 0;

          return (
            <div key={idx} className={`glass-card rounded-[2.5rem] p-5 flex flex-col items-center relative transition-all duration-500 border-white/5 ${isCooldown ? 'scale-95 opacity-60' : 'scale-100 opacity-100 shadow-lg shadow-accent/10 border-accent/20'}`}>
              <div className="text-[10px] text-slate-500 font-black mb-4 tracking-widest uppercase">{slot.lane}</div>
              
              <div className="relative w-28 h-28 cursor-pointer mb-5" onClick={() => triggerCooldown(idx)}>
                <div className={`absolute inset-0 rounded-full border-4 transition-all duration-700 ${isCooldown ? 'border-rose-500/20' : 'border-accent shadow-[0_0_20px_rgba(16,185,129,0.3)]'}`}></div>
                <img 
                  src={slot.hero?.image} 
                  className={`w-full h-full object-cover rounded-full p-1.5 transition-all duration-500 ${isCooldown ? 'grayscale blur-[2px] opacity-20' : 'grayscale-0'}`}
                  alt=""
                />
                
                <div className="absolute -bottom-1 -right-1 bg-[#0f1724] rounded-full p-1 border-2 border-slate-800 shadow-2xl">
                  <img src={cleanImageUrl(slot.spell.url)} className={`w-10 h-10 rounded-full ${isCooldown ? 'grayscale opacity-50' : ''}`} alt="" />
                </div>

                {isCooldown && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-white font-mono drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">{timeLeft}</span>
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter bg-rose-500/10 px-2 rounded">Cooldown</span>
                  </div>
                )}
              </div>

              <div className="text-center space-y-1">
                <div className="text-sm font-black text-white tracking-wide truncate max-w-[120px] uppercase italic">{slot.hero?.name}</div>
                
                {/* Fitur 2: Info Ready Kembali */}
                {isCooldown ? (
                  <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full animate-pulse">
                    <Clock size={10} className="text-rose-400" />
                    <span className="text-[11px] font-bold text-rose-400">Ready at {formatTime(readyTimestamp)}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                     <span className="text-[10px] text-accent font-bold uppercase">{slot.spell.name}</span>
                     {slot.hasEmblem && <span className="text-[9px] text-blue-400 font-black italic">(-20%)</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}