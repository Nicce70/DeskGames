import React, { useState, useEffect } from 'react';
import { CardHockey } from './CardHockey';
import { TournamentSetup } from './TournamentSetup';

// Types
type TeamStats = {
  name: string;
  gp: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
};

type Match = {
  id: string;
  round: number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
};

// Round Robin Generator for 8 teams
const generateSchedule = (teams: string[]): Match[] => {
  const matches: Match[] = [];
  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const half = numTeams / 2;

  let tournamentTeams = [...teams];

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = round % 2 === 0 ? tournamentTeams[i] : tournamentTeams[numTeams - 1 - i];
      const away = round % 2 === 0 ? tournamentTeams[numTeams - 1 - i] : tournamentTeams[i];
      
      matches.push({
        id: `r${round + 1}-m${i + 1}`,
        round: round + 1,
        homeTeam: home,
        awayTeam: away,
        played: false
      });
    }
    // Rotate teams (keep first team fixed)
    tournamentTeams = [
      tournamentTeams[0],
      tournamentTeams[numTeams - 1],
      ...tournamentTeams.slice(1, numTeams - 1)
    ];
  }
  return matches;
};

export const CardHockeyTournament: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [teams, setTeams] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSetup, setIsSetup] = useState(true);
  const [seasonOver, setSeasonOver] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('cardHockeyTournamentState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed && parsed.teams && parsed.matches) {
          setTeams(parsed.teams);
          setMatches(parsed.matches);
          setCurrentMatchIndex(parsed.currentMatchIndex || 0);
          setIsSetup(parsed.isSetup === undefined ? true : parsed.isSetup);
          setSeasonOver(parsed.seasonOver || false);
        }
      } catch (e) {
        console.error("Failed to parse tournament state", e);
      }
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (teams.length > 0) {
      const stateToSave = {
        teams,
        matches,
        currentMatchIndex,
        isSetup,
        seasonOver
      };
      localStorage.setItem('cardHockeyTournamentState', JSON.stringify(stateToSave));
    }
  }, [teams, matches, currentMatchIndex, isSetup, seasonOver]);

  const handleStart = (teamNames: string[]) => {
    setTeams(teamNames);
    setMatches(generateSchedule(teamNames));
    setIsSetup(false);
    setSeasonOver(false);
    setCurrentMatchIndex(0);
  };

  const handleRestartSeason = () => {
    localStorage.removeItem('cardHockeyTournamentState');
    setTeams([]);
    setMatches([]);
    setCurrentMatchIndex(0);
    setIsSetup(true);
    setSeasonOver(false);
    setShowRestartConfirm(false);
  };

  const handleMatchComplete = (homeScore: number, awayScore: number) => {
    setMatches(prev => {
      const newMatches = [...prev];
      newMatches[currentMatchIndex] = {
        ...newMatches[currentMatchIndex],
        homeScore,
        awayScore,
        played: true
      };
      return newMatches;
    });
  };

  const handleNextMatch = () => {
    if (currentMatchIndex + 1 < matches.length) {
      setCurrentMatchIndex(prev => prev + 1);
    } else {
      setSeasonOver(true);
    }
  };

  // Calculate table
  const table: TeamStats[] = teams.map(name => ({ name, gp: 0, gf: 0, ga: 0, gd: 0, pts: 0 }));
  matches.filter(m => m.played).forEach(m => {
    const home = table.find(t => t.name === m.homeTeam)!;
    const away = table.find(t => t.name === m.awayTeam)!;
    
    home.gp += 1;
    away.gp += 1;
    home.gf += m.homeScore!;
    away.gf += m.awayScore!;
    home.ga += m.awayScore!;
    away.ga += m.homeScore!;
    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (m.homeScore! > m.awayScore!) {
      home.pts += 3;
    } else if (m.homeScore! < m.awayScore!) {
      away.pts += 3;
    } else {
      home.pts += 1;
      away.pts += 1;
    }
  });

  table.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  // Scroll to current round on mount or match change
  useEffect(() => {
    if (isSetup || seasonOver || matches.length === 0) return;
    
    const currentMatch = matches[currentMatchIndex];
    if (!currentMatch) return;

    const container = document.getElementById('schedule-container');
    if (container) {
      const currentRoundEl = container.children[currentMatch.round - 1] as HTMLElement;
      if (currentRoundEl) {
        container.scrollTo({
          top: currentRoundEl.offsetTop - container.offsetTop,
          behavior: 'smooth'
        });
      }
    }
  }, [currentMatchIndex, matches, isSetup, seasonOver]);

  if (isSetup) {
    return <TournamentSetup onStart={handleStart} onBack={onBack} />;
  }

  if (seasonOver) {
    const champion = table[0];
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-amber-600 mb-4">
          SEASON OVER
        </h1>
        <h2 className="text-3xl text-white font-bold mb-8">
          Champion: {champion.name} 🏆
        </h2>
        
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 max-w-2xl w-full mb-8">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">GP</th>
                <th className="px-4 py-3 text-center">GF - GA</th>
                <th className="px-4 py-3 text-center">GD</th>
                <th className="px-4 py-3 text-center font-bold text-white">PTS</th>
              </tr>
            </thead>
            <tbody>
              {table.map((t, i) => (
                <tr key={t.name} className="border-b border-slate-800/50 last:border-0">
                  <td className="px-4 py-3 font-bold">{i + 1}</td>
                  <td className={`px-4 py-3 font-bold ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>{t.name}</td>
                  <td className="px-4 py-3 text-center">{t.gp}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{t.gf} - {t.ga}</td>
                  <td className="px-4 py-3 text-center">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-400">{t.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onBack}
            className="px-8 py-4 bg-slate-800 text-white rounded-full font-black text-xl hover:bg-slate-700 transition-all"
          >
            MENU
          </button>
          <button 
            onClick={handleRestartSeason}
            className="px-8 py-4 bg-emerald-500 text-white rounded-full font-black text-xl hover:bg-emerald-400 transition-all"
          >
            NEW SEASON
          </button>
        </div>
      </div>
    );
  }

  const currentMatch = matches[currentMatchIndex];

  const tournamentTable = (
    <div className="w-full text-sm">
      <h3 className="text-emerald-400 font-black uppercase tracking-widest mb-4 text-center">League Table</h3>
      <table className="w-full text-left text-slate-300">
        <thead className="text-[10px] text-slate-500 uppercase bg-slate-900/50">
          <tr>
            <th className="px-2 py-2">#</th>
            <th className="px-2 py-2">Team</th>
            <th className="px-1 py-2 text-center" title="Games Played">GP</th>
            <th className="px-1 py-2 text-center" title="Goals For - Goals Against">GF - GA</th>
            <th className="px-1 py-2 text-center" title="Goal Difference">GD</th>
            <th className="px-2 py-2 text-center font-bold text-white">PTS</th>
          </tr>
        </thead>
        <tbody>
          {table.map((t, i) => (
            <tr key={t.name} className="border-b border-slate-800/50 last:border-0">
              <td className="px-2 py-2 font-bold text-slate-500">{i + 1}</td>
              <td className={`px-2 py-2 font-bold truncate max-w-[80px] ${t.name === currentMatch.homeTeam ? 'text-emerald-400' : t.name === currentMatch.awayTeam ? 'text-cyan-400' : 'text-white'}`}>
                {t.name}
              </td>
              <td className="px-1 py-2 text-center text-slate-400">{t.gp}</td>
              <td className="px-1 py-2 text-center text-slate-400 whitespace-nowrap">{t.gf} - {t.ga}</td>
              <td className="px-1 py-2 text-center text-slate-400">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
              <td className="px-2 py-2 text-center font-bold text-emerald-400">{t.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const tournamentSchedule = (
    <div className="w-full mt-6">
      <h3 className="text-cyan-400 font-black uppercase tracking-widest mb-4 text-center">Schedule</h3>
      <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar" id="schedule-container">
        {Array.from({ length: 7 }).map((_, roundIndex) => {
          const roundMatches = matches.filter(m => m.round === roundIndex + 1);
          const isCurrentRound = currentMatch.round === roundIndex + 1;
          
          return (
            <div key={roundIndex} className={`mb-4 ${isCurrentRound ? 'opacity-100' : 'opacity-60'}`}>
              <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${isCurrentRound ? 'text-white' : 'text-slate-500'}`}>
                Round {roundIndex + 1}
              </div>
              <div className="flex flex-col gap-2">
                {roundMatches.map(m => {
                  const isThisMatch = m.id === currentMatch.id;
                  return (
                    <div key={m.id} className={`flex flex-col p-2 rounded-lg text-xs ${isThisMatch ? 'bg-slate-800 border border-slate-600' : 'bg-slate-900/50'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`truncate w-[45%] text-right ${m.homeTeam === currentMatch.homeTeam && isThisMatch ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                          {m.homeTeam}
                        </span>
                        <span className="w-[10%] text-center font-mono font-bold text-slate-500">
                          {m.played ? '-' : 'vs'}
                        </span>
                        <span className={`truncate w-[45%] text-left ${m.awayTeam === currentMatch.awayTeam && isThisMatch ? 'text-cyan-400 font-bold' : 'text-slate-300'}`}>
                          {m.awayTeam}
                        </span>
                      </div>
                      {m.played && (
                        <div className="text-center font-mono font-bold text-white mt-1.5 bg-slate-950/30 rounded py-1">
                          {m.homeScore} - {m.awayScore}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <CardHockey 
        onBack={onBack} 
        isTournament={true}
        homeTeamName={currentMatch.homeTeam}
        awayTeamName={currentMatch.awayTeam}
        onMatchComplete={handleMatchComplete}
        onNextMatch={handleNextMatch}
        tournamentTable={tournamentTable}
        tournamentSchedule={tournamentSchedule}
        nextMatchLabel={currentMatchIndex + 1 < matches.length ? 'NEXT MATCH' : 'VIEW STANDINGS'}
        onRestartSeason={() => setShowRestartConfirm(true)}
      />

      {showRestartConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center">
            <h2 className="text-2xl font-black text-white mb-4">Restart Season?</h2>
            <p className="text-slate-300 mb-8">
              Are you sure you want to restart the season? All progress will be lost and this action cannot be undone.
            </p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={() => setShowRestartConfirm(false)}
                className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRestartSeason}
                className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-400 transition-colors"
              >
                Yes, Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
