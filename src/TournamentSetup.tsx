import React, { useState } from 'react';
import { soundEngine } from './utils/sound';

interface TournamentSetupProps {
  onStart: (teams: string[], name: string) => void;
  onBack: () => void;
}

export const TournamentSetup: React.FC<TournamentSetupProps> = ({ onStart, onBack }) => {
  const [tournamentName, setTournamentName] = useState<string>('My Tournament');
  const [teams, setTeams] = useState<string[]>([
    'Sweden', 'Canada', 'USA', 'Finland', 
    'Czechia', 'Germany', 'Slovakia', 'Switzerland'
  ]);

  const handleChange = (index: number, value: string) => {
    const newTeams = [...teams];
    newTeams[index] = value;
    setTeams(newTeams);
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
        <div className="flex flex-col gap-4 mb-8">
          {teams.map((team, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-slate-500 font-bold w-6">{i + 1}.</span>
              <input 
                type="text" 
                value={team}
                onChange={(e) => handleChange(i, e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                maxLength={15}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => { soundEngine.playClick(); onBack(); }}
            className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
          >
            Back
          </button>
          <button 
            onClick={() => { 
              if (teams.every(t => t.trim().length > 0) && tournamentName.trim().length > 0) {
                soundEngine.playClick(); 
                onStart(teams.map(t => t.trim()), tournamentName.trim()); 
              }
            }}
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
