import { useState, useEffect, useRef } from 'react';
import { Info, X, ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from './utils/sound';
import { CardHockey } from './CardHockey';
import { CardHockeyTournament } from './CardHockeyTournament';
import { APP_VERSION } from './version';

type Player = 'user' | 'app';

interface GameState {
  userScore: number;
  appScore: number;
  currentTurn: Player;
  startingPlayer: Player;
  roundNumbers: number[];
  currentRoll: number | null;
  status: 'idle' | 'rolling' | 'busted' | 'gameOver';
  winner: Player | null;
  userExtraRollsLeft: number;
  appExtraRollsLeft: number;
  userMatchesWon: number;
  appMatchesWon: number;
}

const NUMBERS = [1, 2, 3, 4, 5, 6];

const getCoordinates = (n: number) => {
  const angleDeg = n * 60 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const radius = 38;
  const x = 50 + radius * Math.cos(angleRad);
  const y = 50 + radius * Math.sin(angleRad);
  return { x, y };
};

const SCORE_TABLE = [
  { key: '1', label: '1 single', points: 1 },
  { key: '1,1', label: '2 singles', points: 2 },
  { key: '1,1,1', label: '3 singles', points: 3 },
  { key: '2', label: '2 adjacent', points: 4 },
  { key: '2,1', label: '2 adjacent + 1 single', points: 6 },
  { key: '2,2', label: '2 + 2 adjacent', points: 8 },
  { key: '3', label: '3 adjacent', points: 10 },
  { key: '3,1', label: '3 adjacent + 1 single', points: 15 },
  { key: '4', label: '4 adjacent', points: 20 },
  { key: '5', label: '5 adjacent', points: 25 },
  { key: '6', label: 'All 6 numbers', points: 50 }
];

function getScoreComponents(numbers: number[]): number[] {
  if (numbers.length === 0) return [];
  if (numbers.length === 6) return [6];

  const present = [false, false, false, false, false, false];
  numbers.forEach(n => present[n - 1] = true);

  let start = 0;
  while (present[start] && start < 6) {
    start++;
  }

  const components: number[] = [];
  let currentLength = 0;
  for (let i = 0; i < 6; i++) {
    const idx = (start + i) % 6;
    if (present[idx]) {
      currentLength++;
    } else {
      if (currentLength > 0) {
        components.push(currentLength);
        currentLength = 0;
      }
    }
  }
  if (currentLength > 0) {
    components.push(currentLength);
  }

  components.sort((a, b) => b - a);
  return components;
}

function getScoreKey(numbers: number[]): string {
  return getScoreComponents(numbers).join(',');
}

function calculateScore(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const key = getScoreKey(numbers);
  const entry = SCORE_TABLE.find(item => item.key === key);
  return entry ? entry.points : 0;
}

type Screen = 'menu' | 'lucky-loop' | 'card-hockey' | 'card-hockey-tournament';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);
  const [state, setState] = useState<GameState>({
    userScore: 0,
    appScore: 0,
    currentTurn: 'user',
    startingPlayer: 'user',
    roundNumbers: [],
    currentRoll: null,
    status: 'idle',
    winner: null,
    userExtraRollsLeft: 2,
    appExtraRollsLeft: 2,
    userMatchesWon: 0,
    appMatchesWon: 0
  });
  
  const [showRules, setShowRules] = useState(false);
  const isRollingRef = useRef(false);

  const isBustedWithOption = state.status === 'busted' && state.currentTurn === 'user' && state.userScore >= 5 && state.userExtraRollsLeft > 0;
  const shouldShowScores = state.status !== 'busted' || isBustedWithOption;

  const currentKey = state.roundNumbers.length > 0 && shouldShowScores ? getScoreKey(state.roundNumbers) : null;
  
  const potentialKeys = new Set<string>();
  if (state.roundNumbers.length > 0 && state.roundNumbers.length < 6 && shouldShowScores) {
    for (let i = 1; i <= 6; i++) {
      if (!state.roundNumbers.includes(i)) {
        potentialKeys.add(getScoreKey([...state.roundNumbers, i]));
      }
    }
  }

  const toggleMute = () => {
    soundEngine.toggleMute();
    setIsMuted(soundEngine.isMuted);
  };

  const rollDice = () => {
    if (isRollingRef.current) return;
    isRollingRef.current = true;
    
    soundEngine.playRoll();
    setState(s => ({ ...s, status: 'rolling' }));
    
    let ticks = 0;
    const interval = setInterval(() => {
      setState(s => ({ ...s, currentRoll: Math.floor(Math.random() * 6) + 1 }));
      ticks++;
      if (ticks > 10) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        
        setState(s => {
          isRollingRef.current = false;
          if (s.roundNumbers.includes(finalRoll)) {
            soundEngine.playBust();
            return { ...s, currentRoll: finalRoll, status: 'busted' };
          } else {
            const newNumbers = [...s.roundNumbers, finalRoll];
            const roundScore = calculateScore(newNumbers);
            const totalScore = s.currentTurn === 'user' ? s.userScore + roundScore : s.appScore + roundScore;
            
            if (totalScore >= 50 || newNumbers.length === 6) {
               soundEngine.playWin();
               return { 
                 ...s, 
                 currentRoll: finalRoll, 
                 roundNumbers: newNumbers, 
                 status: 'gameOver',
                 winner: s.currentTurn,
                 userScore: s.currentTurn === 'user' ? totalScore : s.userScore,
                 appScore: s.currentTurn === 'app' ? totalScore : s.appScore,
                 userMatchesWon: s.currentTurn === 'user' ? s.userMatchesWon + 1 : s.userMatchesWon,
                 appMatchesWon: s.currentTurn === 'app' ? s.appMatchesWon + 1 : s.appMatchesWon
               };
            }
            
            soundEngine.playScore();
            return { ...s, currentRoll: finalRoll, roundNumbers: newNumbers, status: 'idle' };
          }
        });
      }
    }, 80);
  };

  const handleHold = () => {
    soundEngine.playClick();
    setState(s => {
      if (s.status !== 'idle' || s.roundNumbers.length === 0) return s;
      
      const roundScore = calculateScore(s.roundNumbers);
      const newUserScore = s.currentTurn === 'user' ? s.userScore + roundScore : s.userScore;
      const newAppScore = s.currentTurn === 'app' ? s.appScore + roundScore : s.appScore;
      
      if (newUserScore >= 50 || newAppScore >= 50) {
        return {
          ...s,
          userScore: newUserScore,
          appScore: newAppScore,
          status: 'gameOver',
          winner: s.currentTurn,
          userMatchesWon: s.currentTurn === 'user' ? s.userMatchesWon + 1 : s.userMatchesWon,
          appMatchesWon: s.currentTurn === 'app' ? s.appMatchesWon + 1 : s.appMatchesWon
        };
      }
      
      return {
        ...s,
        userScore: newUserScore,
        appScore: newAppScore,
        currentTurn: s.currentTurn === 'user' ? 'app' : 'user',
        roundNumbers: [],
        currentRoll: null,
        status: 'idle'
      };
    });
  };

  const buyExtraRoll = () => {
    soundEngine.playClick();
    setState(s => ({
      ...s,
      userScore: s.userScore - 5,
      userExtraRollsLeft: s.userExtraRollsLeft - 1,
      currentRoll: null
    }));
    rollDice();
  };

  const declineExtraRoll = () => {
    soundEngine.playClick();
    setState(s => ({
      ...s,
      currentTurn: 'app',
      roundNumbers: [],
      currentRoll: null,
      status: 'idle'
    }));
  };

  const resetGame = () => {
    soundEngine.playClick();
    setState(s => {
      const nextStartingPlayer = s.startingPlayer === 'user' ? 'app' : 'user';
      return {
        ...s,
        userScore: 0,
        appScore: 0,
        currentTurn: nextStartingPlayer,
        startingPlayer: nextStartingPlayer,
        roundNumbers: [],
        currentRoll: null,
        status: 'idle',
        winner: null,
        userExtraRollsLeft: 2,
        appExtraRollsLeft: 2
      };
    });
  };

  const resetMatchScore = () => {
    soundEngine.playClick();
    setState(s => ({
      ...s,
      userMatchesWon: 0,
      appMatchesWon: 0
    }));
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (state.status === 'busted') {
      if (state.currentTurn === 'user' && state.userScore >= 5 && state.userExtraRollsLeft > 0) {
        // Wait for user choice to buy extra roll
      } else if (state.currentTurn === 'app' && state.appScore >= 5 && state.appExtraRollsLeft > 0) {
        const roundScore = calculateScore(state.roundNumbers);
        
        // App becomes more desperate if user is close to winning (>= 42) or leading by a lot (>= 15 points)
        const isDesperate = state.userScore >= 42;
        const isBehind = state.userScore - state.appScore >= 15;
        const profitThreshold = isDesperate ? 0 : (isBehind ? 6 : 10);
        
        const isProfitable = roundScore >= profitThreshold || (state.appScore + roundScore >= 40);
        
        if (isProfitable) {
          timeoutId = setTimeout(() => {
            setState(s => ({
              ...s,
              appScore: s.appScore - 5,
              appExtraRollsLeft: s.appExtraRollsLeft - 1,
              currentRoll: null
            }));
            rollDice();
          }, 1500);
        } else {
          timeoutId = setTimeout(() => {
            setState(s => ({
              ...s,
              currentTurn: 'user',
              roundNumbers: [],
              currentRoll: null,
              status: 'idle'
            }));
          }, 2000);
        }
      } else {
        timeoutId = setTimeout(() => {
          setState(s => ({
            ...s,
            currentTurn: s.currentTurn === 'user' ? 'app' : 'user',
            roundNumbers: [],
            currentRoll: null,
            status: 'idle'
          }));
        }, 2000);
      }
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state.status, state.currentTurn, state.userScore, state.userExtraRollsLeft, state.appScore, state.appExtraRollsLeft, state.roundNumbers]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (state.currentTurn === 'app' && state.status === 'idle' && !state.winner) {
      const risk = state.roundNumbers.length;
      const roundScore = calculateScore(state.roundNumbers);
      
      let shouldHold = false;
      const isDoomed = state.userScore >= 48;
      const isDesperate = state.userScore >= 42;
      const isBehind = state.userScore - state.appScore >= 15;
      const hasExtraRolls = state.appExtraRollsLeft > 0 && state.appScore >= 5;

      if (state.appScore + roundScore >= 50) {
        shouldHold = true;
      } else if (risk === 0) {
        shouldHold = false;
      } else if (isDoomed) {
        // User only needs 2 points to win. We must keep rolling until we win or bust.
        shouldHold = false;
      } else if (isDesperate) {
        // User is about to win. Take extreme risks.
        if (hasExtraRolls) {
          shouldHold = false; // Keep rolling, we have a safety net
        } else {
          shouldHold = risk >= 5; // Only hold if risk is extreme
        }
      } else if (isBehind) {
        // App is behind, take more risks
        if (hasExtraRolls) {
          shouldHold = risk >= 4;
        } else {
          shouldHold = risk >= 4 || (risk === 3 && Math.random() > 0.8);
        }
      } else {
        // Normal play
        if (hasExtraRolls) {
          shouldHold = risk >= 4 || (risk === 3 && Math.random() > 0.7);
        } else {
          if (risk >= 3) {
            shouldHold = risk >= 4 || Math.random() > 0.5;
          }
        }
      }

      timeoutId = setTimeout(() => {
        if (shouldHold) {
          handleHold();
        } else {
          rollDice();
        }
      }, 1500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [state.currentTurn, state.status, state.winner, state.roundNumbers.length]);

  if (currentScreen === 'menu') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 flex flex-col relative overflow-hidden items-center justify-center p-6">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[100px] pointer-events-none" />
        
        <header className="flex flex-col items-center mb-12 relative z-10">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 drop-shadow-sm">
            CHOOSE GAME
          </h1>
          <p className="text-slate-500 text-sm mt-3 font-bold uppercase tracking-[0.2em]">Select a game to play</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl relative z-10">
          <button 
            onClick={() => {
              soundEngine.playClick();
              setCurrentScreen('lucky-loop');
            }}
            className="group relative bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm shadow-xl hover:bg-slate-800/80 hover:border-emerald-500/50 transition-all duration-300 text-left overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] group-hover:bg-emerald-500/20 transition-all duration-300 -mr-10 -mt-10"></div>
            
            <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-500 mb-4">
              LUCKY LOOP
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
              A thrilling dice game of risk and reward. Roll the die to build your score, but don't roll the same number twice or you'll bust! First to 50 points wins.
            </p>
            <div className="flex items-center text-emerald-400 font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform duration-300">
              Play Now <span className="ml-2">→</span>
            </div>
          </button>

          <button 
            onClick={() => {
              soundEngine.playClick();
              setCurrentScreen('card-hockey');
            }}
            className="group relative bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm shadow-xl hover:bg-slate-800/80 hover:border-blue-500/50 transition-all duration-300 text-left overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] group-hover:bg-blue-500/20 transition-all duration-300 -mr-10 -mt-10"></div>
            
            <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-500 mb-4">
              CARD HOCKEY
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
              A strategic card game where you try to score goals against the App's goalie. Draw cards, remove defenders, and take your shot!
            </p>
            <div className="flex items-center text-blue-400 font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform duration-300">
              Play Now <span className="ml-2">→</span>
            </div>
          </button>

          <button 
            onClick={() => {
              soundEngine.playClick();
              setCurrentScreen('card-hockey-tournament');
            }}
            className="group relative bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm shadow-xl hover:bg-slate-800/80 hover:border-yellow-500/50 transition-all duration-300 text-left overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[40px] group-hover:bg-yellow-500/20 transition-all duration-300 -mr-10 -mt-10"></div>
            
            <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-amber-500 mb-4">
              CARD HOCKEY TOURNAMENT
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
              Play a full 8-team season! Manage your team through a 7-round round-robin tournament and fight for the championship.
            </p>
            <div className="flex items-center text-yellow-400 font-bold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform duration-300">
              Start Season <span className="ml-2">→</span>
            </div>
          </button>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-600 text-xs font-mono">
          v{APP_VERSION}
        </div>
      </div>
    );
  }

  if (currentScreen === 'card-hockey') {
    return <CardHockey onBack={() => {
      soundEngine.playClick();
      setCurrentScreen('menu');
    }} />;
  }

  if (currentScreen === 'card-hockey-tournament') {
    return <CardHockeyTournament onBack={() => {
      soundEngine.playClick();
      setCurrentScreen('menu');
    }} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 flex flex-col relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-900/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[100px] pointer-events-none" />

      <button 
        onClick={() => {
          soundEngine.playClick();
          setCurrentScreen('menu');
        }}
        className="absolute left-6 top-6 text-slate-500 hover:text-slate-300 transition-colors p-2 z-20 flex items-center gap-2"
        aria-label="Back to Menu"
      >
        <ChevronLeft size={24} />
        <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Menu</span>
      </button>

      <div className="absolute right-6 top-6 flex items-center gap-2 z-20">
        <button 
          onClick={toggleMute}
          className="text-slate-500 hover:text-slate-300 transition-colors p-2"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        <button 
          onClick={() => {
            soundEngine.playClick();
            setShowRules(true);
          }}
          className="text-slate-500 hover:text-slate-300 transition-colors p-2"
          aria-label="Rules"
        >
          <Info size={24} />
        </button>
      </div>

      <header className="flex flex-col items-center pt-8 mb-8 relative z-10">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-500 drop-shadow-sm pr-1">
          LUCKY LOOP
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-2 font-bold uppercase tracking-[0.2em]">First to 50 wins</p>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row justify-center items-start w-full max-w-7xl mx-auto z-10 px-4 pb-12 gap-8 lg:gap-16">
        <aside className="w-full max-w-sm mx-auto lg:mx-0 flex flex-col justify-start lg:order-1 order-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center gap-6">
            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest text-center">Matches Won</h3>
            
            <div className="flex w-full justify-around items-center">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">You</span>
                <span className="text-3xl font-black text-white">{state.userMatchesWon}</span>
              </div>
              <div className="w-px h-12 bg-slate-800/50"></div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-1">App</span>
                <span className="text-3xl font-black text-white">{state.appMatchesWon}</span>
              </div>
            </div>

            <button
              onClick={resetMatchScore}
              className="mt-2 px-4 py-2 rounded-full border border-slate-700 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors uppercase tracking-widest"
            >
              Reset Score
            </button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center min-h-[200px] gap-6">
            
            <div className="flex flex-col items-center w-full">
              <h3 className="text-xs font-bold text-emerald-500 mb-3 uppercase tracking-widest text-center">Your Extra Rolls</h3>
              <div className="flex gap-4 items-center justify-center">
                {[...Array(2)].map((_, i) => {
                  const isAvailable = i < state.userExtraRollsLeft;
                  const canAfford = state.userScore >= 5;
                  return (
                    <div 
                      key={i} 
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                        isAvailable 
                          ? canAfford
                            ? 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                            : 'border-emerald-500/50 bg-emerald-500/10 opacity-50'
                          : 'border-slate-700 bg-slate-800/50 opacity-50'
                      }`}
                    >
                      <span className={`text-lg font-black ${isAvailable ? (canAfford ? 'text-emerald-400' : 'text-emerald-400/50') : 'text-slate-600'}`}>
                        {isAvailable ? '✓' : 'X'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-full h-px bg-slate-800/50"></div>

            <div className="flex flex-col items-center w-full">
              <h3 className="text-xs font-bold text-cyan-500 mb-3 uppercase tracking-widest text-center">App Extra Rolls</h3>
              <div className="flex gap-4 items-center justify-center">
                {[...Array(2)].map((_, i) => {
                  const isAvailable = i < state.appExtraRollsLeft;
                  const canAfford = state.appScore >= 5;
                  return (
                    <div 
                      key={i} 
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                        isAvailable 
                          ? canAfford
                            ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                            : 'border-cyan-500/50 bg-cyan-500/10 opacity-50'
                          : 'border-slate-700 bg-slate-800/50 opacity-50'
                      }`}
                    >
                      <span className={`text-lg font-black ${isAvailable ? (canAfford ? 'text-cyan-400' : 'text-cyan-400/50') : 'text-slate-600'}`}>
                        {isAvailable ? '✓' : 'X'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-slate-500 text-xs mt-2 text-center max-w-[200px]">
              Costs 5 pts each.
            </p>
          </div>
        </aside>

        <main className="flex flex-col items-center justify-start w-full lg:w-auto lg:order-2 order-1">
          <div className="flex justify-center gap-4 md:gap-8 mb-8 w-full">
            <div className={`flex flex-col items-center p-4 rounded-3xl min-w-[130px] transition-all duration-500 ${state.currentTurn === 'user' ? 'bg-slate-800/80 ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-slate-900/50'}`}>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">You</span>
              <span className="text-5xl font-black text-white">{state.userScore}</span>
            </div>
            <div className={`flex flex-col items-center p-4 rounded-3xl min-w-[130px] transition-all duration-500 ${state.currentTurn === 'app' ? 'bg-slate-800/80 ring-2 ring-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'bg-slate-900/50'}`}>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">App</span>
              <span className="text-5xl font-black text-white">{state.appScore}</span>
            </div>
          </div>

          <div className="h-8 mb-6 text-lg md:text-xl font-bold tracking-wide">
          {state.winner ? (
            <span className={state.winner === 'user' ? 'text-emerald-400' : 'text-cyan-400'}>
              {state.winner === 'user' ? '🎉 YOU WON!' : '💻 APP WON!'}
            </span>
          ) : state.status === 'busted' ? (
            <span className="text-red-500 animate-bounce inline-block">BUSTED!</span>
          ) : state.currentTurn === 'user' ? (
            <span className="text-emerald-400">YOUR TURN</span>
          ) : (
            <span className="text-cyan-400 animate-pulse">APP IS PLAYING...</span>
          )}
        </div>

        <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px] mb-12">
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {NUMBERS.map(n => {
              const next = n === 6 ? 1 : n + 1;
              if (state.roundNumbers.includes(n) && state.roundNumbers.includes(next)) {
                const p1 = getCoordinates(n);
                const p2 = getCoordinates(next);
                return (
                  <line 
                    key={`${n}-${next}`}
                    x1={`${p1.x}%`} 
                    y1={`${p1.y}%`} 
                    x2={`${p2.x}%`} 
                    y2={`${p2.y}%`} 
                    stroke={state.currentTurn === 'user' ? '#10b981' : '#06b6d4'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={`drop-shadow-[0_0_12px_${state.currentTurn === 'user' ? 'rgba(16,185,129,0.8)' : 'rgba(6,182,212,0.8)'}] transition-all duration-500`}
                  />
                );
              }
              return null;
            })}
          </svg>

          {NUMBERS.map(n => {
            const { x, y } = getCoordinates(n);
            const isSelected = state.roundNumbers.includes(n);
            const isCurrent = state.currentRoll === n;
            const isBusted = isCurrent && state.status === 'busted';
            
            let bgClass = 'bg-slate-800/80 text-slate-500 border-2 border-slate-700/50 backdrop-blur-sm';
            if (isBusted) {
              bgClass = 'bg-red-500 text-white ring-4 ring-red-500/50 shadow-[0_0_30px_rgba(239,68,68,1)] z-20 scale-110';
            } else if (isSelected) {
              bgClass = state.currentTurn === 'user' 
                ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.8)] z-10 scale-110'
                : 'bg-cyan-500 text-white ring-4 ring-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.8)] z-10 scale-110';
            }

            return (
              <div 
                key={n}
                className={`absolute w-14 h-14 md:w-16 md:h-16 -ml-7 -mt-7 md:-ml-8 md:-mt-8 rounded-full flex items-center justify-center text-2xl md:text-3xl font-black transition-all duration-300 ${bgClass}`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {n}
              </div>
            );
          })}

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {state.status === 'rolling' ? (
              <div className="text-7xl font-black text-slate-300 animate-pulse">
                {state.currentRoll || '?'}
              </div>
            ) : state.status === 'busted' ? (
              <div className="text-5xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] rotate-12 scale-110 transition-transform">
                X
              </div>
            ) : state.currentRoll ? (
              <div className="flex flex-col items-center animate-in zoom-in duration-300">
                <div className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {state.currentRoll}
                </div>
                <div className={`text-lg font-bold mt-1 ${state.currentTurn === 'user' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  +{calculateScore(state.roundNumbers)} pts
                </div>
              </div>
            ) : (
              <div className="text-slate-500 font-medium text-lg">
                Ready
              </div>
            )}
          </div>
        </div>

        {state.winner ? (
          <button 
            onClick={resetGame}
            className="px-8 py-4 bg-white text-slate-900 rounded-full font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            PLAY AGAIN
          </button>
        ) : state.status === 'busted' && state.currentTurn === 'user' && state.userScore >= 5 && state.userExtraRollsLeft > 0 ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-amber-400 font-bold text-sm uppercase tracking-wider">Buy extra roll?</p>
            <div className="flex gap-4">
              <button
                onClick={buyExtraRoll}
                className="px-6 py-3 bg-amber-600 text-white rounded-2xl font-black text-lg hover:bg-amber-500 active:scale-95 transition-all shadow-lg shadow-amber-600/20"
              >
                YES (-5 PTS)
              </button>
              <button
                onClick={declineExtraRoll}
                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-black text-lg hover:bg-slate-700 active:scale-95 transition-all border border-slate-700"
              >
                NO
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={rollDice}
              disabled={state.currentTurn !== 'user' || state.status !== 'idle'}
              className="w-32 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xl hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50 disabled:hover:bg-emerald-500 disabled:active:scale-100 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              ROLL
            </button>
            <button
              onClick={handleHold}
              disabled={state.currentTurn !== 'user' || state.status !== 'idle' || state.roundNumbers.length === 0}
              className="w-32 py-4 bg-slate-800 text-white rounded-2xl font-black text-xl hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50 disabled:hover:bg-slate-800 disabled:active:scale-100 disabled:cursor-not-allowed border border-slate-700"
            >
              HOLD
            </button>
          </div>
        )}
        </main>

        <aside className="w-full max-w-sm mx-auto lg:mx-0 flex flex-col justify-start lg:order-3 order-3">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest text-center">Round Score</h3>
            <div className="space-y-1.5">
              {SCORE_TABLE.map(({ key, label, points }) => {
                const isCurrent = key === currentKey;
                const isPotential = potentialKeys.has(key) && !isCurrent;
                
                let rowClass = "flex justify-between items-center p-2.5 rounded-xl transition-all duration-300 ";
                if (isCurrent) {
                  rowClass += "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-105 z-10 relative";
                } else if (isPotential) {
                  rowClass += "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 border-dashed";
                } else {
                  rowClass += "text-slate-500";
                }

                return (
                  <div key={key} className={rowClass}>
                    <span className="text-sm">{label}</span>
                    <span className="font-mono font-bold">{points}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col gap-3 text-xs text-slate-400 font-medium bg-slate-950/50 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                <span>Current achieved score</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-500/10 border border-cyan-500/30 border-dashed"></div>
                <span>Possible with next roll</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-white">How to Play</h2>
              <button 
                onClick={() => {
                  soundEngine.playClick();
                  setShowRules(false);
                }} 
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 text-slate-300 text-sm">
              <p><strong>Goal:</strong> Be the first to reach 50 points.</p>
              <p><strong>Turn:</strong> Roll the die. You can keep rolling to build your score, or <strong>Hold</strong> to save your points.</p>
              <p className="text-red-400"><strong>Risk:</strong> If you roll a number you already have this round, you bust and lose all points for the round!</p>
              <p className="text-emerald-400"><strong>Extra Roll:</strong> If you bust but have at least 5 total points, you can buy an extra roll for 5 points to save your round!</p>
              <div>
                <strong>Scoring:</strong>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                  <li>1 single = 1 pt</li>
                  <li>2 singles = 2 pts</li>
                  <li>3 singles = 3 pts</li>
                  <li>2 adjacent = 4 pts</li>
                  <li>2 adjacent + 1 single = 6 pts</li>
                  <li>2 + 2 adjacent = 8 pts</li>
                  <li>3 adjacent = 10 pts</li>
                  <li>3 adjacent + 1 single = 15 pts</li>
                  <li>4 adjacent = 20 pts</li>
                  <li>5 adjacent = 25 pts</li>
                  <li className="text-emerald-400 font-bold">All 6 numbers = 50 pts (Instant Win!)</li>
                </ul>
              </div>
            </div>
            <button 
              onClick={() => {
                soundEngine.playClick();
                setShowRules(false);
              }}
              className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
