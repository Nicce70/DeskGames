import React, { useState, useEffect } from 'react';
import { CardHockey } from './CardHockey';
import { TournamentSetup } from './TournamentSetup';

// Types
type TeamStats = {
  name: string;
  gp: number;
  w: number;
  d: number;
  l: number;
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

type SavedTournament = {
  id: string;
  name: string;
  date: string;
  state: {
    teams: string[];
    matches: Match[];
    currentMatchIndex: number;
    isSetup: boolean;
    seasonOver: boolean;
  };
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
  const [tournamentName, setTournamentName] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isSetup, setIsSetup] = useState(true);
  const [seasonOver, setSeasonOver] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveConfirmMessage, setSaveConfirmMessage] = useState<string | null>(null);
  const [pendingSaveName, setPendingSaveName] = useState<string | null>(null);
  const [savedTournaments, setSavedTournaments] = useState<SavedTournament[]>([]);
  const [tournamentToRestore, setTournamentToRestore] = useState<SavedTournament | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<SavedTournament | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('cardHockeyTournamentState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed && parsed.teams && parsed.matches) {
          setTeams(parsed.teams);
          setTournamentName(parsed.tournamentName || 'My Tournament');
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
        tournamentName,
        matches,
        currentMatchIndex,
        isSetup,
        seasonOver
      };
      localStorage.setItem('cardHockeyTournamentState', JSON.stringify(stateToSave));
    }
  }, [teams, tournamentName, matches, currentMatchIndex, isSetup, seasonOver]);

  const handleStart = (teamNames: string[], name: string) => {
    setTeams(teamNames);
    setTournamentName(name);
    setMatches(generateSchedule(teamNames));
    setIsSetup(false);
    setSeasonOver(false);
    setCurrentMatchIndex(0);
  };

  const handleRestartSeason = () => {
    localStorage.removeItem('cardHockeyTournamentState');
    setTeams([]);
    setTournamentName('');
    setMatches([]);
    setCurrentMatchIndex(0);
    setIsSetup(true);
    setSeasonOver(false);
    setShowRestartConfirm(false);
  };

  const handleSaveTournament = () => {
    if (!saveName.trim()) return;
    
    const savedList = localStorage.getItem('cardHockeySavedTournaments');
    const parsedList: SavedTournament[] = savedList ? JSON.parse(savedList) : [];
    
    const newName = saveName.trim();
    
    // Check if we are renaming
    if (newName !== tournamentName) {
      setSaveConfirmMessage(`Do you want to rename the tournament to "${newName}" and save?`);
      setPendingSaveName(newName);
      return;
    } else {
      // Check if it already exists to overwrite
      const existingIndex = parsedList.findIndex(t => t.name === newName);
      if (existingIndex !== -1) {
        setSaveConfirmMessage(`Do you want to overwrite the existing tournament "${newName}"?`);
        setPendingSaveName(newName);
        return;
      }
    }
    
    executeSave(newName, parsedList);
  };

  const executeSave = (newName: string, parsedList: SavedTournament[]) => {
    if (newName !== tournamentName) {
      setTournamentName(newName);
    }
    
    // Remove the old one so we can push the new one
    const filteredList = parsedList.filter(t => t.name !== newName);
    
    const newSave: SavedTournament = {
      id: Date.now().toString(),
      name: newName,
      date: new Date().toLocaleString(),
      state: {
        teams,
        tournamentName: newName,
        matches,
        currentMatchIndex,
        isSetup,
        seasonOver
      }
    };
    
    localStorage.setItem('cardHockeySavedTournaments', JSON.stringify([...filteredList, newSave]));
    setShowSaveModal(false);
    setSaveName('');
    setSaveConfirmMessage(null);
    setPendingSaveName(null);
  };

  const confirmSave = () => {
    if (pendingSaveName) {
      const savedList = localStorage.getItem('cardHockeySavedTournaments');
      const parsedList: SavedTournament[] = savedList ? JSON.parse(savedList) : [];
      executeSave(pendingSaveName, parsedList);
    }
  };

  const cancelSaveConfirm = () => {
    setSaveConfirmMessage(null);
    setPendingSaveName(null);
  };

  const handleOpenSaveModal = () => {
    setSaveName(tournamentName || `Tournament ${new Date().toLocaleDateString()}`);
    setSaveConfirmMessage(null);
    setPendingSaveName(null);
    setShowSaveModal(true);
  };

  const handleOpenRestoreModal = () => {
    const savedList = localStorage.getItem('cardHockeySavedTournaments');
    if (savedList) {
      setSavedTournaments(JSON.parse(savedList));
    } else {
      setSavedTournaments([]);
    }
    setShowRestoreModal(true);
  };

  const handleRestoreTournament = (saved: SavedTournament) => {
    setTournamentToRestore(saved);
  };

  const confirmRestore = () => {
    if (!tournamentToRestore) return;
    
    const { state } = tournamentToRestore;
    setTeams(state.teams);
    setMatches(state.matches);
    setCurrentMatchIndex(state.currentMatchIndex);
    setIsSetup(state.isSetup);
    setSeasonOver(state.seasonOver);
    
    setTournamentToRestore(null);
    setShowRestoreModal(false);
  };

  const handleDeleteBackup = (saved: SavedTournament, e: React.MouseEvent) => {
    e.stopPropagation();
    setTournamentToDelete(saved);
  };

  const confirmDeleteBackup = () => {
    if (!tournamentToDelete) return;
    const updatedList = savedTournaments.filter(t => t.id !== tournamentToDelete.id);
    setSavedTournaments(updatedList);
    localStorage.setItem('cardHockeySavedTournaments', JSON.stringify(updatedList));
    setTournamentToDelete(null);
  };

  const cancelDeleteBackup = () => {
    setTournamentToDelete(null);
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

  const handleExportBackup = () => {
    const backupData = {
      cardHockeyTournamentState: localStorage.getItem('cardHockeyTournamentState'),
      cardHockeySavedTournaments: localStorage.getItem('cardHockeySavedTournaments')
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardhockey-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.cardHockeyTournamentState) {
          localStorage.setItem('cardHockeyTournamentState', parsed.cardHockeyTournamentState);
          const state = JSON.parse(parsed.cardHockeyTournamentState);
          setTeams(state.teams || []);
          setMatches(state.matches || []);
          setCurrentMatchIndex(state.currentMatchIndex || 0);
          setIsSetup(state.isSetup === undefined ? true : state.isSetup);
          setSeasonOver(state.seasonOver || false);
        }
        
        if (parsed.cardHockeySavedTournaments) {
          localStorage.setItem('cardHockeySavedTournaments', parsed.cardHockeySavedTournaments);
          setSavedTournaments(JSON.parse(parsed.cardHockeySavedTournaments));
        }
        
        alert('Backup imported successfully!');
      } catch (error) {
        console.error('Failed to import backup:', error);
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  // Calculate table
  const table: TeamStats[] = teams.map(name => ({ name, gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }));
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
      home.w += 1;
      away.l += 1;
      home.pts += 3;
    } else if (m.homeScore! < m.awayScore!) {
      away.w += 1;
      home.l += 1;
      away.pts += 3;
    } else {
      home.d += 1;
      away.d += 1;
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
        
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 max-w-4xl w-full mb-8 overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300 min-w-[600px]">
            <thead className="text-xs text-slate-500 uppercase bg-slate-900/50">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">GP</th>
                <th className="px-4 py-3 text-center">W</th>
                <th className="px-4 py-3 text-center">D</th>
                <th className="px-4 py-3 text-center">L</th>
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
                  <td className="px-4 py-3 text-center">{t.w}</td>
                  <td className="px-4 py-3 text-center">{t.d}</td>
                  <td className="px-4 py-3 text-center">{t.l}</td>
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
            <th className="px-1 py-2 text-center" title="Wins">W</th>
            <th className="px-1 py-2 text-center" title="Draws">D</th>
            <th className="px-1 py-2 text-center" title="Losses">L</th>
            <th className="px-1 py-2 text-center" title="Goals For - Goals Against">GF - GA</th>
            <th className="px-1 py-2 text-center" title="Goal Difference">GD</th>
            <th className="px-2 py-2 text-center font-bold text-white">PTS</th>
          </tr>
        </thead>
        <tbody>
          {table.map((t, i) => (
            <tr key={t.name} className="border-b border-slate-800/50 last:border-0">
              <td className="px-2 py-2 font-bold text-slate-500">{i + 1}</td>
              <td className={`px-2 py-2 font-bold truncate max-w-[120px] ${t.name === currentMatch.homeTeam ? 'text-emerald-400' : t.name === currentMatch.awayTeam ? 'text-cyan-400' : 'text-white'}`}>
                {t.name}
              </td>
              <td className="px-1 py-2 text-center text-slate-400">{t.gp}</td>
              <td className="px-1 py-2 text-center text-slate-400">{t.w}</td>
              <td className="px-1 py-2 text-center text-slate-400">{t.d}</td>
              <td className="px-1 py-2 text-center text-slate-400">{t.l}</td>
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
      <h3 className="text-cyan-400 font-black uppercase tracking-widest mb-1 text-center">Schedule</h3>
      {tournamentName && (
        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 text-center">
          {tournamentName}
        </div>
      )}
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
        onSaveTournament={handleOpenSaveModal}
        onRestoreTournament={handleOpenRestoreModal}
        onExportBackup={handleExportBackup}
        onImportBackup={() => document.getElementById('import-backup-input')?.click()}
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

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            {saveConfirmMessage ? (
              <>
                <h2 className="text-2xl font-black text-white mb-4 text-center">Confirm Save</h2>
                <p className="text-slate-300 mb-8 text-center">
                  {saveConfirmMessage}
                </p>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={cancelSaveConfirm}
                    className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmSave}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors flex-1"
                  >
                    Yes, Save
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-white mb-4 text-center">Save Tournament</h2>
                <p className="text-slate-300 mb-4 text-center text-sm">
                  Enter a name for your backup. You can restore it later from the menu.
                </p>
                <input 
                  type="text" 
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:border-blue-500"
                  placeholder="Tournament Name"
                  autoFocus
                />
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => {
                      setShowSaveModal(false);
                      setSaveConfirmMessage(null);
                      setPendingSaveName(null);
                    }}
                    className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveTournament}
                    disabled={!saveName.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-black text-white mb-4 text-center">Restore Tournament</h2>
            
            {tournamentToDelete ? (
              <div className="text-center">
                <p className="text-slate-300 mb-6">
                  Are you sure you want to delete <strong>"{tournamentToDelete.name}"</strong>?
                  <br /><br />
                  <span className="text-red-400 font-bold">This action cannot be undone.</span>
                </p>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={cancelDeleteBackup}
                    className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeleteBackup}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-colors flex-1"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            ) : !tournamentToRestore ? (
              <>
                <p className="text-slate-300 mb-4 text-center text-sm">
                  Select a backup to restore. <strong className="text-red-400">Warning:</strong> Your current tournament progress will be overwritten.
                </p>
                
                <div className="flex-1 overflow-y-auto mb-6 space-y-2 pr-2">
                  {savedTournaments.length === 0 ? (
                    <div className="text-center text-slate-500 py-8 italic">No saved tournaments found.</div>
                  ) : (
                    savedTournaments.map(saved => (
                      <div 
                        key={saved.id}
                        onClick={() => handleRestoreTournament(saved)}
                        className="bg-slate-800 border border-slate-700 rounded-xl p-4 cursor-pointer hover:bg-slate-700 hover:border-blue-500 transition-all flex justify-between items-center group"
                      >
                        <div>
                          <div className="font-bold text-white">{saved.name}</div>
                          <div className="text-xs text-slate-400 mt-1">{saved.date} • {saved.state.seasonOver ? 'Completed' : `Match ${saved.state.currentMatchIndex + 1}`}</div>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteBackup(saved, e)}
                          className="text-slate-500 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete backup"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex justify-center mt-auto">
                  <button 
                    onClick={() => setShowRestoreModal(false)}
                    className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors w-full"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-slate-300 mb-6">
                  Are you sure you want to restore <strong>"{tournamentToRestore.name}"</strong>?
                  <br /><br />
                  <span className="text-red-400 font-bold">Your current tournament progress will be overwritten! Make sure to save it first if you want to keep it.</span>
                </p>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => setTournamentToRestore(null)}
                    className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors flex-1"
                  >
                    Back
                  </button>
                  <button 
                    onClick={confirmRestore}
                    className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-400 transition-colors flex-1"
                  >
                    Yes, Restore
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <input 
        type="file" 
        id="import-backup-input" 
        accept=".json" 
        style={{ display: 'none' }} 
        onChange={handleImportBackup} 
      />
    </>
  );
};
