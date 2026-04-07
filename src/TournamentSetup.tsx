import React, { useState } from 'react';
import { soundEngine } from './utils/sound';

interface TournamentSetupProps {
  onStart: (teams: string[], name: string, doubleRoundRobin: boolean, showRankings: boolean, previousRankings: Record<string, number>) => void;
  onBack: () => void;
  initialTeams?: string[];
  initialName?: string;
  initialDoubleRoundRobin?: boolean;
}

export const TournamentSetup: React.FC<TournamentSetupProps> = ({ 
  onStart, 
  onBack,
  initialTeams,
  initialName,
  initialDoubleRoundRobin
}) => {
  const [tournamentName, setTournamentName] = useState<string>(initialName || 'My Tournament');
  const [doubleRoundRobin, setDoubleRoundRobin] = useState<boolean>(initialDoubleRoundRobin || false);
  const [showRankings, setShowRankings] = useState<boolean>(!!initialTeams);
  const [teams, setTeams] = useState<string[]>(initialTeams || [
    'Sweden', 'Canada', 'USA', 'Finland', 
    'Czechia', 'Germany', 'Slovakia', 'Switzerland'
  ]);

  const handleChange = (index: number, value: string) => {
    const newTeams = [...teams];
    newTeams[index] = value;
    setTeams(newTeams);
  };

  const handleStart = () => {
    if (teams.every(t => t.trim().length > 0) && tournamentName.trim().length > 0) {
      soundEngine.playClick(); 
      
      const prevRanks: Record<string, number> = {};
      if (showRankings && initialTeams) {
        initialTeams.forEach((t, i) => {
          if (teams.includes(t)) {
            prevRanks[t] = i + 1;
          }
        });
      }
      
      onStart(teams.map(t => t.trim()), tournamentName.trim(), doubleRoundRobin, showRankings, prevRanks); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center py-12 px-4">
      <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-500 mb-8">
        Tournament Setup
      </h1>
      <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-xl w-full max-w-md">
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-center text-slate-300">Tournament Name</h2>
          <input 
            type="text" 
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-center font-bold focus:outline-none focus:border-emerald-500 transition-colors"
            placeholder="Enter tournament name"
            maxLength={30}
          />
        </div>
        
        <h2 className="text-xl font-bold mb-6 text-center text-slate-300">Enter 8 Teams</h2>
        <div className="flex flex-col gap-4 mb-6">
          {teams.map((team, i) => {
            const isOriginal = initialTeams && initialTeams[i] === team;
            const rank = i + 1;
            const rankBadge = rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}th`;
            return (
              <div key={i} className="flex items-center gap-4">
                <div className="flex items-center justify-end w-14 gap-1">
                  {initialTeams && isOriginal && showRankings && (
                    <span className="text-[10px] text-slate-400" title={`Ranked ${rank} last season`}>{rankBadge}</span>
                  )}
                  <span className="text-slate-500 font-bold">{i + 1}.</span>
                </div>
                <input 
                  type="text" 
                  value={team}
                  onChange={(e) => handleChange(i, e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  maxLength={15}
                />
              </div>
            );
          })}
        </div>

        {initialTeams && (
          <div className="mb-4 flex items-center justify-center gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <input 
              type="checkbox" 
              id="showRankings"
              checked={showRankings}
              onChange={(e) => setShowRankings(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
            />
            <label htmlFor="showRankings" className="text-slate-300 font-bold cursor-pointer select-none">
              Show ranking from last season
            </label>
          </div>
        )}

        <div className="mb-8 flex items-center justify-center gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <input 
            type="checkbox" 
            id="doubleRoundRobin"
            checked={doubleRoundRobin}
            onChange={(e) => setDoubleRoundRobin(e.target.checked)}
            className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
          />
          <label htmlFor="doubleRoundRobin" className="text-slate-300 font-bold cursor-pointer select-none">
            Double Round Robin (Home & Away)
          </label>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => { soundEngine.playClick(); onBack(); }}
            className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
          >
            Back
          </button>
          <button 
            onClick={handleStart}
            disabled={!teams.every(t => t.trim().length > 0) || !tournamentName.trim()}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
          >
            Start Season
          </button>
        </div>
      </div>
    </div>
  );
};
