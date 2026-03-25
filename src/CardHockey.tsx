import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Info, X, Volume2, VolumeX, MoreVertical } from 'lucide-react';
import { soundEngine } from './utils/sound';

type CardData = { id: string; suit: string; label: string; value: number; faceUp: boolean };
type Team = { rd: CardData | null; g: CardData | null; ld: CardData | null; rf: CardData | null; c: CardData | null; lf: CardData | null };

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = [
  { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 },
  { label: '5', value: 5 }, { label: '6', value: 6 }, { label: '7', value: 7 },
  { label: '8', value: 8 }, { label: '9', value: 9 }, { label: '10', value: 10 },
  { label: 'J', value: 11 }, { label: 'Q', value: 12 }, { label: 'K', value: 13 }, { label: 'A', value: 14 },
];

const createDeck = (): CardData[] => {
  const deck: CardData[] = [];
  for (const suit of SUITS) {
    for (const v of VALUES) {
      deck.push({ id: `${v.label}-${suit}`, suit, label: v.label, value: v.value, faceUp: true });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const PlayingCard = ({ card, isTarget, onClick, label, isApp }: { card: CardData | null, isTarget: boolean, onClick?: () => void, label?: string, isApp?: boolean }) => {
  if (!card) return (
    <div className="w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 lg:w-28 lg:h-40 border-2 border-dashed border-slate-700/50 rounded-xl flex items-center justify-center relative">
      {label && <span className={`absolute ${isApp ? '-top-5' : '-bottom-5'} text-[10px] md:text-xs text-slate-500 font-bold whitespace-nowrap`}>{label}</span>}
    </div>
  );
  
  if (!card.faceUp) {
    return (
      <div 
        onClick={onClick}
        className={`w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 lg:w-28 lg:h-40 bg-blue-900 rounded-xl border-2 border-white/10 flex items-center justify-center shadow-lg relative ${isTarget ? 'ring-4 ring-yellow-400 cursor-pointer hover:scale-105 transition-transform' : ''}`}
      >
        <div className="w-12 h-20 sm:w-16 sm:h-24 md:w-20 md:h-32 lg:w-24 lg:h-36 border border-white/20 rounded-lg bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]" />
        {label && <span className={`absolute ${isApp ? '-top-5' : '-bottom-5'} text-[10px] md:text-xs text-slate-400 font-bold whitespace-nowrap`}>{label}</span>}
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';
  
  return (
    <div 
      onClick={onClick}
      className={`w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 lg:w-28 lg:h-40 bg-white rounded-xl flex flex-col items-center justify-center shadow-lg relative ${isTarget ? 'ring-4 ring-yellow-400 cursor-pointer hover:scale-105 transition-transform' : ''}`}
    >
      <div className={`absolute top-1 left-1 md:top-2 md:left-2 text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${isRed ? 'text-red-500' : 'text-slate-800'}`}>
        {card.label}
      </div>
      <div className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl ${isRed ? 'text-red-500' : 'text-slate-800'}`}>
        {card.suit}
      </div>
      <div className={`absolute bottom-1 right-1 md:bottom-2 md:right-2 text-base sm:text-lg md:text-xl lg:text-2xl font-bold rotate-180 ${isRed ? 'text-red-500' : 'text-slate-800'}`}>
        {card.label}
      </div>
      {label && <span className={`absolute ${isApp ? '-top-5' : '-bottom-5'} text-[10px] md:text-xs text-slate-400 font-bold whitespace-nowrap`}>{label}</span>}
    </div>
  );
};

export const CardHockey: React.FC<{ 
  onBack: () => void;
  isTournament?: boolean;
  homeTeamName?: string;
  awayTeamName?: string;
  onMatchComplete?: (homeScore: number, awayScore: number) => void;
  onNextMatch?: () => void;
  tournamentTable?: React.ReactNode;
  tournamentSchedule?: React.ReactNode;
  nextMatchLabel?: string;
  onRestartSeason?: () => void;
  onSaveTournament?: () => void;
  onRestoreTournament?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: () => void;
}> = ({ 
  onBack,
  isTournament,
  homeTeamName,
  awayTeamName,
  onMatchComplete,
  onNextMatch,
  tournamentTable,
  tournamentSchedule,
  nextMatchLabel,
  onRestartSeason,
  onSaveTournament,
  onRestoreTournament,
  onExportBackup,
  onImportBackup
}) => {
  const [deck, setDeck] = useState<CardData[]>([]);
  const [discard, setDiscard] = useState<CardData[]>([]);
  const [appTeam, setAppTeam] = useState<Team>({ rd: null, g: null, ld: null, rf: null, c: null, lf: null });
  const [userTeam, setUserTeam] = useState<Team>({ rd: null, g: null, ld: null, rf: null, c: null, lf: null });
  const [drawnCard, setDrawnCard] = useState<CardData | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'user' | 'app'>('user');
  const [period, setPeriod] = useState(1);
  const [scores, setScores] = useState<{user: number, app: number}[]>([
    {user: 0, app: 0}, {user: 0, app: 0}, {user: 0, app: 0}
  ]);
  const [shots, setShots] = useState<{user: number, app: number}[]>([
    {user: 0, app: 0}, {user: 0, app: 0}, {user: 0, app: 0}
  ]);
  const [status, setStatus] = useState<'playing' | 'gameover' | 'animating' | 'period_over' | 'ready_to_start'>('ready_to_start');
  const [message, setMessage] = useState('Your Turn! Draw a card.');
  const [showRules, setShowRules] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isGoalScored, setIsGoalScored] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);
  const [matchStartingPlayer, setMatchStartingPlayer] = useState<'user' | 'app'>('user');

  const toggleMute = () => {
    soundEngine.toggleMute();
    setIsMuted(soundEngine.isMuted);
  };

  const totalUserScore = scores.reduce((sum, p) => sum + p.user, 0);
  const totalAppScore = scores.reduce((sum, p) => sum + p.app, 0);
  const totalUserShots = shots.reduce((sum, p) => sum + p.user, 0);
  const totalAppShots = shots.reduce((sum, p) => sum + p.app, 0);

  const deckRef = useRef(deck);
  const drawnCardRef = useRef(drawnCard);
  const appTeamRef = useRef(appTeam);
  const userTeamRef = useRef(userTeam);
  const currentTurnRef = useRef(currentTurn);
  const periodRef = useRef(period);
  const scoresRef = useRef(scores);
  const shotsRef = useRef(shots);

  useEffect(() => { deckRef.current = deck; }, [deck]);
  useEffect(() => { drawnCardRef.current = drawnCard; }, [drawnCard]);
  useEffect(() => { appTeamRef.current = appTeam; }, [appTeam]);
  useEffect(() => { userTeamRef.current = userTeam; }, [userTeam]);
  useEffect(() => { currentTurnRef.current = currentTurn; }, [currentTurn]);
  useEffect(() => { periodRef.current = period; }, [period]);
  useEffect(() => { scoresRef.current = scores; }, [scores]);
  useEffect(() => { shotsRef.current = shots; }, [shots]);

  const handleDeckEmpty = () => {
    if (periodRef.current < 3) {
      soundEngine.playPeriodEnd();
      setStatus('period_over');
      setMessage(`End of Period ${periodRef.current}`);
    } else {
      const finalUserScore = scoresRef.current.reduce((sum, p) => sum + p.user, 0);
      const finalAppScore = scoresRef.current.reduce((sum, p) => sum + p.app, 0);
      soundEngine.playGameOver(finalUserScore > finalAppScore);
      setStatus('gameover');
      setMessage('Game Over!');
      if (onMatchComplete) {
        onMatchComplete(finalUserScore, finalAppScore);
      }
    }
  };

  const startNewGame = (isFirstGame = false) => {
    const newDeck = createDeck();
    const deal = (faceUp: boolean) => ({ ...newDeck.pop()!, faceUp });

    setAppTeam({ rd: deal(true), g: deal(false), ld: deal(true), rf: deal(true), c: deal(true), lf: deal(true) });
    setUserTeam({ lf: deal(true), c: deal(true), rf: deal(true), ld: deal(true), g: deal(false), rd: deal(true) });
    setDeck(newDeck);
    setDiscard([]);
    setDrawnCard(null);
    
    const newStartingPlayer = isFirstGame ? 'user' : (matchStartingPlayer === 'user' ? 'app' : 'user');
    if (!isFirstGame) {
      setMatchStartingPlayer(newStartingPlayer);
    }
    
    setCurrentTurn(newStartingPlayer);
    setScores([{user: 0, app: 0}, {user: 0, app: 0}, {user: 0, app: 0}]);
    setShots([{user: 0, app: 0}, {user: 0, app: 0}, {user: 0, app: 0}]);
    setPeriod(1);
    setStatus('ready_to_start');
    setMessage(`Game Starts! ${newStartingPlayer === 'user' ? 'Your Turn.' : "App's Turn."}`);
  };

  const startNextPeriod = () => {
    const newDeck = createDeck();
    const deal = (faceUp: boolean) => ({ ...newDeck.pop()!, faceUp });

    setAppTeam({ rd: deal(true), g: deal(false), ld: deal(true), rf: deal(true), c: deal(true), lf: deal(true) });
    setUserTeam({ lf: deal(true), c: deal(true), rf: deal(true), ld: deal(true), g: deal(false), rd: deal(true) });
    setDeck(newDeck);
    setDiscard([]);
    setDrawnCard(null);
    const nextPeriod = period + 1;
    const startingPlayer = nextPeriod === 2 ? (matchStartingPlayer === 'user' ? 'app' : 'user') : matchStartingPlayer;
    setCurrentTurn(startingPlayer);
    setPeriod(nextPeriod);
    setStatus('playing');
    setMessage(`Period ${nextPeriod} Starts! ${startingPlayer === 'user' ? 'Your Turn.' : "App's Turn."}`);
  };

  useEffect(() => { startNewGame(true); }, []);

  const getValidTargets = (team: Team, card: CardData | null): (keyof Team)[] => {
    if (!card) return [];
    const targets: (keyof Team)[] = [];
    const val = card.value;

    if (team.lf && val >= team.lf.value) targets.push('lf');
    if (team.c && val >= team.c.value) targets.push('c');
    if (team.rf && val >= team.rf.value) targets.push('rf');

    if (!team.lf && team.ld && val >= team.ld.value) targets.push('ld');
    if (!team.rf && team.rd && val >= team.rd.value) targets.push('rd');

    const forwardsRemoved = (!team.lf ? 1 : 0) + (!team.rf ? 1 : 0);
    const defenseRemoved = (!team.ld ? 1 : 0) + (!team.rd ? 1 : 0);
    const centerRemoved = !team.c;

    if (centerRemoved && forwardsRemoved >= 1 && defenseRemoved >= 1 && team.g) {
      targets.push('g');
    }
    return targets;
  };

  const handleDrawCard = () => {
    if (status !== 'playing' || currentTurn !== 'user' || drawnCard) return;
    if (deck.length === 0) {
      handleDeckEmpty();
      return;
    }
    
    soundEngine.playDraw();
    const newDeck = [...deck];
    const card = newDeck.pop()!;
    setDeck(newDeck);
    setDrawnCard(card);
    
    const targets = getValidTargets(appTeam, card);
    if (targets.length === 0) {
      setMessage('No valid moves. Turn passes to App.');
      setStatus('animating');
      setTimeout(() => {
        setDiscard(prev => [...prev, card]);
        setDrawnCard(null);
        if (newDeck.length === 0) {
          handleDeckEmpty();
        } else {
          setCurrentTurn('app');
          setStatus('playing');
          setMessage("App's Turn");
        }
      }, 2000);
    } else {
      setMessage('Select a highlighted card to remove, or pass.');
    }
  };

  const handlePassTurn = () => {
    if (status !== 'playing' || currentTurn !== 'user' || !drawnCard) return;
    soundEngine.playClick();
    setDiscard(prev => [...prev, drawnCard]);
    setDrawnCard(null);
    
    if (deckRef.current.length === 0) {
      handleDeckEmpty();
    } else {
      setCurrentTurn('app');
      setMessage("App's Turn");
    }
  };

  const handleTargetClick = (targetTeam: 'app' | 'user', position: keyof Team) => {
    if (status !== 'playing') return;
    if (currentTurn === 'user' && targetTeam !== 'app') return;
    
    const team = targetTeam === 'app' ? appTeamRef.current : userTeamRef.current;
    const drawn = drawnCardRef.current;
    if (!drawn) return;

    const validTargets = getValidTargets(team, drawn);
    if (!validTargets.includes(position)) return;

    soundEngine.playClick();
    setStatus('animating');

    if (position === 'g') {
      if (targetTeam === 'app') {
        setShots(prev => {
          const newShots = [...prev];
          newShots[periodRef.current - 1] = { ...newShots[periodRef.current - 1], user: newShots[periodRef.current - 1].user + 1 };
          return newShots;
        });
      } else {
        setShots(prev => {
          const newShots = [...prev];
          newShots[periodRef.current - 1] = { ...newShots[periodRef.current - 1], app: newShots[periodRef.current - 1].app + 1 };
          return newShots;
        });
      }

      const goalie = team.g!;
      const revealedGoalie = { ...goalie, faceUp: true };
      
      if (targetTeam === 'app') setAppTeam(prev => ({ ...prev, g: revealedGoalie }));
      else setUserTeam(prev => ({ ...prev, g: revealedGoalie }));

      setTimeout(() => {
        const isGoal = drawn.value >= revealedGoalie.value;
        if (isGoal) {
          soundEngine.playGoal();
          setIsGoalScored(true);
          if (targetTeam === 'app') {
            setScores(prev => {
              const newScores = [...prev];
              newScores[periodRef.current - 1] = { ...newScores[periodRef.current - 1], user: newScores[periodRef.current - 1].user + 1 };
              return newScores;
            });
          } else {
            setScores(prev => {
              const newScores = [...prev];
              newScores[periodRef.current - 1] = { ...newScores[periodRef.current - 1], app: newScores[periodRef.current - 1].app + 1 };
              return newScores;
            });
          }
          setMessage(targetTeam === 'app' ? `GOAL for ${isTournament && homeTeamName ? homeTeamName : 'You'}!` : `GOAL for ${isTournament && awayTeamName ? awayTeamName : 'App'}!`);
        } else {
          soundEngine.playBust();
          setMessage('Miss!');
        }

        setTimeout(() => {
          setIsGoalScored(false);
          const newDeck = [...deckRef.current];
          
          const replenishTeam = (teamState: Team, isTargetTeam: boolean) => {
            const updated = { ...teamState };
            if (isTargetTeam) {
              updated.g = newDeck.length > 0 ? { ...newDeck.pop()!, faceUp: false } : null;
              const positionsToReplenish: (keyof Team)[] = ['lf', 'c', 'rf', 'ld', 'rd'];
              for (const pos of positionsToReplenish) {
                if (!updated[pos] && newDeck.length > 0) {
                  updated[pos] = { ...newDeck.pop()!, faceUp: true };
                }
              }
            }
            return updated;
          };

          const targetTeamState = targetTeam === 'app' ? appTeamRef.current : userTeamRef.current;
          const scoringTeamState = targetTeam === 'app' ? userTeamRef.current : appTeamRef.current;

          const updatedTargetTeam = replenishTeam(targetTeamState, true);
          const updatedScoringTeam = replenishTeam(scoringTeamState, false);
          
          setDeck(newDeck);
          setDiscard(prev => [...prev, drawn, revealedGoalie]);
          setDrawnCard(null);
          
          if (targetTeam === 'app') {
            setAppTeam(updatedTargetTeam);
            setUserTeam(updatedScoringTeam);
          } else {
            setUserTeam(updatedTargetTeam);
            setAppTeam(updatedScoringTeam);
          }

          const nextTurn = currentTurnRef.current === 'user' ? 'app' : 'user';
          
          if (newDeck.length === 0) {
            handleDeckEmpty();
          } else {
            setCurrentTurn(nextTurn);
            setStatus('playing');
            setMessage(nextTurn === 'user' ? "Your Turn! Draw a card." : "App's Turn");
          }
        }, 2000);
      }, 1000);

    } else {
      const targetCard = team[position]!;
      setDiscard(prev => [...prev, drawn, targetCard]);
      setDrawnCard(null);
      
      if (targetTeam === 'app') setAppTeam(prev => ({ ...prev, [position]: null }));
      else setUserTeam(prev => ({ ...prev, [position]: null }));

      if (deckRef.current.length === 0) {
        handleDeckEmpty();
      } else {
        setStatus('playing');
        setMessage(currentTurnRef.current === 'user' ? 'Draw another card!' : "App draws another card...");
      }
    }
  };

  useEffect(() => {
    if (status !== 'playing' || currentTurn !== 'app') return;

    let timeoutId: NodeJS.Timeout;

    if (!drawnCard) {
      if (deck.length === 0) {
        handleDeckEmpty();
        return;
      }
      timeoutId = setTimeout(() => {
        const newDeck = [...deckRef.current];
        const card = newDeck.pop()!;
        setDeck(newDeck);
        setDrawnCard(card);
        soundEngine.playDraw();
      }, 1000);
    } else {
      const targets = getValidTargets(userTeamRef.current, drawnCard);
      
      timeoutId = setTimeout(() => {
        if (targets.length === 0) {
          setMessage('App has no valid moves. Your turn!');
          setStatus('animating');
          setTimeout(() => {
            setDiscard(prev => [...prev, drawnCardRef.current!]);
            setDrawnCard(null);
            if (deckRef.current.length === 0) {
              handleDeckEmpty();
            } else {
              setCurrentTurn('user');
              setStatus('playing');
              setMessage('Your Turn! Draw a card.');
            }
          }, 800);
        } else {
          let chosenTarget: keyof Team | null = null;
          const val = drawnCard.value;
          
          let shootThreshold = 11;
          const appScore = scores.reduce((acc, s) => acc + s.app, 0);
          const userScore = scores.reduce((acc, s) => acc + s.user, 0);
          const cardsLeft = deckRef.current.length;
          
          // Calculate app's defensive strength
          const appG = appTeamRef.current.g?.value || 0;
          const appLD = appTeamRef.current.ld?.value || 0;
          const appRD = appTeamRef.current.rd?.value || 0;
          const defenseStrength = appG + ((appLD + appRD) / 2);
          
          if (cardsLeft > 30) {
            shootThreshold = 12;
          } else if (cardsLeft > 20) {
            shootThreshold = 11;
          } else if (cardsLeft > 12) {
            shootThreshold = 9;
          } else if (cardsLeft > 6) {
            shootThreshold = 7;
          } else if (cardsLeft > 3) {
            shootThreshold = 5;
          } else {
            shootThreshold = 2; // Shoot with anything if deck is very low
          }

          // If app has strong defense and plenty of cards, it can afford to wait for a better shot
          if (defenseStrength >= 20 && cardsLeft > 10) {
            shootThreshold += 1;
          }
          if (defenseStrength >= 24 && cardsLeft > 15) {
            shootThreshold += 1;
          }

          // Adjust based on score
          if (appScore < userScore) {
            // If trailing, take more chances as time runs out
            if (cardsLeft <= 20) shootThreshold = Math.max(2, shootThreshold - 1);
            if (cardsLeft <= 10) shootThreshold = Math.max(2, shootThreshold - 2);
          } else if (appScore > userScore) {
            // If leading, play a bit safer unless near the end
            if (cardsLeft > 10) {
              shootThreshold = Math.min(14, shootThreshold + 1);
            } else {
              shootThreshold = Math.max(2, shootThreshold - 1);
            }
          }
          
          shootThreshold = Math.min(14, shootThreshold);

          if (targets.includes('g') && val >= shootThreshold) {
            chosenTarget = 'g';
          } else {
            const skaterTargets = targets.filter(t => t !== 'g');
            if (skaterTargets.length > 0) {
              let bestTarget: keyof Team | null = null;
              let bestScore = -999;

              for (const t of skaterTargets) {
                const targetCard = userTeamRef.current[t];
                if (!targetCard) continue;
                
                let score = targetCard.value * 100; // Prioritize removing high-value cards
                
                const currentState = userTeamRef.current;
                const nextState = { ...currentState, [t]: null };
                
                const currentProgress = (!currentState.c ? 1 : 0) + 
                                        ((!currentState.lf || !currentState.rf) ? 1 : 0) + 
                                        ((!currentState.ld || !currentState.rd) ? 1 : 0);
                const nextProgress = (!nextState.c ? 1 : 0) + 
                                     ((!nextState.lf || !nextState.rf) ? 1 : 0) + 
                                     ((!nextState.ld || !nextState.rd) ? 1 : 0);
                
                if (nextProgress === 3) {
                  score += 100000; // Winning move (exposes goalie)
                } else if (nextProgress > currentProgress) {
                  score += 10000; // Progressing towards exposing goalie
                }
                
                // If we are removing a forward, consider the strength of the defender behind them
                // We want to expose WEAK defenders, so we give a bonus if the defender is weak
                if (t === 'lf' && currentState.ld) {
                  score += (15 - currentState.ld.value) * 50;
                } else if (t === 'rf' && currentState.rd) {
                  score += (15 - currentState.rd.value) * 50;
                }
                
                if (score > bestScore) {
                  bestScore = score;
                  bestTarget = t;
                }
              }
              chosenTarget = bestTarget;
            } else if (targets.includes('g')) {
              // If 'g' is the ONLY target, but we didn't meet the shootThreshold
              // We should still consider shooting if the card is decent or deck is low
              if (val >= Math.max(6, shootThreshold - 2) || cardsLeft <= 5) {
                chosenTarget = 'g';
              }
            }
          }

          if (chosenTarget) {
            handleTargetClick('user', chosenTarget);
          } else {
            setMessage('App passes turn.');
            setStatus('animating');
            setTimeout(() => {
              setDiscard(prev => [...prev, drawnCardRef.current!]);
              setDrawnCard(null);
              if (deckRef.current.length === 0) {
                handleDeckEmpty();
              } else {
                setCurrentTurn('user');
                setStatus('playing');
                setMessage('Your Turn! Draw a card.');
              }
            }, 1000);
          }
        }
      }, 1500);
    }

    return () => clearTimeout(timeoutId);
  }, [currentTurn, status, drawnCard, scores]);

  const userTargets = currentTurn === 'user' ? getValidTargets(appTeam, drawnCard) : [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-between py-6 px-2 md:px-4 font-sans relative overflow-hidden select-none">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 text-center">
        {isTournament && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] md:text-[10px] font-bold text-yellow-500/70 tracking-[0.2em] uppercase whitespace-nowrap">
            Tournament
          </span>
        )}
        <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-500 tracking-widest uppercase drop-shadow-lg">
          Card Hockey
        </h1>
      </div>
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <button onClick={() => { soundEngine.playClick(); onBack(); }} className="text-slate-400 hover:text-white flex items-center gap-2">
          <ArrowLeft size={20} /> Menu
        </button>
      </div>
      <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
        <button onClick={() => { soundEngine.playClick(); toggleMute(); }} className="text-slate-400 hover:text-white flex items-center justify-center">
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        <button onClick={() => { soundEngine.playClick(); setShowRules(true); }} className="text-slate-400 hover:text-white flex items-center justify-center">
          <Info size={24} />
        </button>
        {isTournament && onRestartSeason && (
          <div className="relative flex items-center justify-center">
            <button 
              onClick={() => { soundEngine.playClick(); setShowMenu(!showMenu); }} 
              className="text-slate-400 hover:text-white flex items-center justify-center"
            >
              <MoreVertical size={24} />
            </button>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-40 overflow-hidden">
                  {onSaveTournament && (
                    <button 
                      onClick={() => { 
                        soundEngine.playClick(); 
                        setShowMenu(false);
                        onSaveTournament(); 
                      }} 
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700"
                    >
                      Save Tournament
                    </button>
                  )}
                  {onRestoreTournament && (
                    <button 
                      onClick={() => { 
                        soundEngine.playClick(); 
                        setShowMenu(false);
                        onRestoreTournament(); 
                      }} 
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700"
                    >
                      Restore Tournament
                    </button>
                  )}
                  {onExportBackup && (
                    <button 
                      onClick={() => { 
                        soundEngine.playClick(); 
                        setShowMenu(false);
                        onExportBackup(); 
                      }} 
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700"
                    >
                      Export Backup
                    </button>
                  )}
                  {onImportBackup && (
                    <button 
                      onClick={() => { 
                        soundEngine.playClick(); 
                        setShowMenu(false);
                        onImportBackup(); 
                      }} 
                      className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700"
                    >
                      Import Backup
                    </button>
                  )}
                  <button 
                    onClick={() => { 
                      soundEngine.playClick(); 
                      setShowMenu(false);
                      onRestartSeason(); 
                    }} 
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                  >
                    Restart Season
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 w-full max-w-[1400px] flex items-center justify-center relative z-10 mt-12">
        <div className="flex flex-col lg:flex-row justify-center items-start gap-0 lg:gap-0 w-full">
          
          {/* Left: Scoreboard */}
          <div className="flex flex-col gap-4 items-center bg-slate-900/80 px-6 py-6 rounded-3xl border border-slate-800 shadow-xl order-1 lg:order-none min-w-[200px] max-w-[320px] w-full">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="text-center flex-1 min-w-0">
                {isTournament && <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">(You)</div>}
                <div className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wider mb-1 truncate px-1">{homeTeamName || 'YOU'}</div>
                <div className="text-3xl md:text-4xl font-black text-emerald-400">{totalUserScore}</div>
              </div>
              <div className="text-slate-600 font-black text-2xl shrink-0">-</div>
              <div className="text-center flex-1 min-w-0">
                {isTournament && <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">(App)</div>}
                <div className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wider mb-1 truncate px-1">{awayTeamName || 'APP'}</div>
                <div className="text-3xl md:text-4xl font-black text-cyan-400">{totalAppScore}</div>
              </div>
            </div>
            
            {/* Periods */}
            <div className="w-full border-t border-slate-800 pt-4 mt-2 flex flex-col gap-2">
              {[1, 2, 3].map(p => (
                <div key={p} className={`flex justify-between items-center text-sm ${period === p ? 'text-white font-bold' : 'text-slate-500'}`}>
                  <span>P{p}</span>
                  <span className="font-mono font-bold">{scores[p-1].user} - {scores[p-1].app}</span>
                </div>
              ))}
            </div>

            {tournamentSchedule}
          </div>

          {/* Center: Teams and Message */}
          <div className="flex flex-col items-center order-2 lg:order-none w-full max-w-2xl">
            
            {/* App Team */}
            <div className="flex flex-col items-center gap-4 md:gap-8 mb-6">
              <div className="flex gap-2 md:gap-4">
                <PlayingCard card={appTeam.rd} isTarget={userTargets.includes('rd')} onClick={() => handleTargetClick('app', 'rd')} label="RD" isApp />
                <PlayingCard card={appTeam.g} isTarget={userTargets.includes('g')} onClick={() => handleTargetClick('app', 'g')} label="G" isApp />
                <PlayingCard card={appTeam.ld} isTarget={userTargets.includes('ld')} onClick={() => handleTargetClick('app', 'ld')} label="LD" isApp />
              </div>
              <div className="flex gap-2 md:gap-4">
                <PlayingCard card={appTeam.rf} isTarget={userTargets.includes('rf')} onClick={() => handleTargetClick('app', 'rf')} label="RF" isApp />
                <PlayingCard card={appTeam.c} isTarget={userTargets.includes('c')} onClick={() => handleTargetClick('app', 'c')} label="C" isApp />
                <PlayingCard card={appTeam.lf} isTarget={userTargets.includes('lf')} onClick={() => handleTargetClick('app', 'lf')} label="LF" isApp />
              </div>
            </div>

            <div className={`text-lg font-bold text-white my-4 min-h-[4rem] flex items-center justify-center text-center ${isGoalScored ? 'animate-shake goal-text' : ''}`}>
              {status === 'ready_to_start' ? (
                <button 
                  onClick={() => {
                    soundEngine.playClick();
                    setStatus('playing');
                  }}
                  className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xl transition-colors shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:shadow-[0_0_25px_rgba(16,185,129,0.7)] animate-pulse"
                >
                  START MATCH
                </button>
              ) : (
                message
              )}
            </div>

            {/* User Team */}
            <div className="flex flex-col items-center gap-4 md:gap-8 mt-6">
              <div className="flex gap-2 md:gap-4">
                <PlayingCard card={userTeam.lf} isTarget={false} label="LF" />
                <PlayingCard card={userTeam.c} isTarget={false} label="C" />
                <PlayingCard card={userTeam.rf} isTarget={false} label="RF" />
              </div>
              <div className="flex gap-2 md:gap-4">
                <PlayingCard card={userTeam.ld} isTarget={false} label="LD" />
                <PlayingCard card={userTeam.g} isTarget={false} label="G" />
                <PlayingCard card={userTeam.rd} isTarget={false} label="RD" />
              </div>
            </div>
          </div>

          {/* Right: Deck and Drawn Card */}
          <div className="flex flex-col justify-start items-center gap-6 md:gap-12 order-3 lg:order-none min-w-[200px] max-w-[450px] w-full my-4 lg:my-0">
            {tournamentTable && (
              <div className="bg-slate-900/80 px-4 py-4 rounded-3xl border border-slate-800 shadow-xl w-full">
                {tournamentTable}
              </div>
            )}
            <div className="flex justify-center items-center gap-6 md:gap-12">
              <div className="flex flex-col items-center">
                <div className="text-xs text-slate-400 font-bold mb-2">DRAWN</div>
                <PlayingCard card={drawnCard} isTarget={false} />
              </div>
              <div className="flex flex-col items-center">
                <div className="text-xs text-slate-400 font-bold mb-2">DECK ({deck.length})</div>
                <div 
                  onClick={handleDrawCard}
                  className={`w-16 h-24 sm:w-20 sm:h-28 md:w-24 md:h-36 lg:w-28 lg:h-40 bg-blue-900 rounded-xl border-2 border-white/10 flex items-center justify-center shadow-lg relative ${currentTurn === 'user' && !drawnCard && status === 'playing' ? 'ring-4 ring-emerald-400 cursor-pointer hover:scale-105 transition-transform' : 'opacity-50'}`}
                >
                  <div className="w-12 h-20 sm:w-16 sm:h-24 md:w-20 md:h-32 lg:w-24 lg:h-36 border border-white/20 rounded-lg bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]" />
                </div>
              </div>
            </div>
            {currentTurn === 'user' && drawnCard && status === 'playing' && (
              <button 
                onClick={handlePassTurn}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors"
              >
                Pass
              </button>
            )}
          </div>

        </div>
      </div>

      {status === 'period_over' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <h2 className="text-3xl font-black text-white mb-4">End of Period {period}</h2>
            <div className="text-xl text-slate-300 mb-8">
              Current Score: <br/>
              <span className="text-emerald-400 font-bold">{homeTeamName || 'You'}: {totalUserScore}</span> - <span className="text-cyan-400 font-bold">{awayTeamName || 'App'}: {totalAppScore}</span>
            </div>
            <button 
              onClick={() => { soundEngine.playClick(); startNextPeriod(); }}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-lg transition-colors"
            >
              Start Period {period + 1}
            </button>
          </div>
        </div>
      )}

      {status === 'gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <h2 className="text-3xl font-black text-white mb-4">Game Over!</h2>
            <div className="text-xl text-slate-300 mb-6">
              Final Score: <br/>
              <span className="text-emerald-400 font-bold">{homeTeamName || 'You'}: {totalUserScore}</span> - <span className="text-cyan-400 font-bold">{awayTeamName || 'App'}: {totalAppScore}</span>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 mb-8 text-sm text-left shadow-inner">
              <h3 className="text-white font-bold mb-3 border-b border-slate-700 pb-2 text-center">Match Statistics</h3>
              
              <div className="flex justify-between text-slate-300 mb-4 font-medium">
                <span>Total Shots</span>
                <div className="flex gap-4 font-mono">
                  <span className="text-emerald-400 w-6 text-right">{totalUserShots}</span>
                  <span className="text-slate-500">-</span>
                  <span className="text-cyan-400 w-6 text-left">{totalAppShots}</span>
                </div>
              </div>
              
              <div className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-bold">Goals by Period</div>
              
              {[1, 2, 3].map((p) => (
                <div key={p} className="flex justify-between text-slate-400 mb-1">
                  <span>Period {p}</span>
                  <div className="flex gap-4 font-mono">
                    <span className="text-emerald-400 w-6 text-right">{scores[p-1].user}</span>
                    <span className="text-slate-600">-</span>
                    <span className="text-cyan-400 w-6 text-left">{scores[p-1].app}</span>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { 
                soundEngine.playClick(); 
                if (isTournament && onNextMatch) {
                  onNextMatch();
                  startNewGame(false);
                } else {
                  startNewGame(false);
                }
              }}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-lg transition-colors"
            >
              {isTournament ? (nextMatchLabel || 'Next Match') : 'Play Again'}
            </button>
          </div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-white">CardHockey Rules</h2>
              <button onClick={() => { soundEngine.playClick(); setShowRules(false); }} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 text-slate-300 text-sm">
              <p>Draw cards to attack the opponent's team!</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Draw a card from the deck.</li>
                <li>If your card is <strong>&ge;</strong> an opponent's Forward or Center, click them to remove them!</li>
                <li>You cannot remove a Defense until the Forward in front of it is removed.</li>
                <li>If you remove a player, you get to draw another card!</li>
                <li>If you can't remove anyone, your turn ends.</li>
              </ul>
              <p className="text-emerald-400 font-bold mt-4">Shooting at Goal:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>To shoot, you must have removed: <strong>Center</strong>, at least <strong>1 Forward</strong>, and at least <strong>1 Defense</strong>.</li>
                <li>If conditions are met, the Goalie will highlight. Click it to shoot!</li>
                <li>The Goalie is revealed. If your drawn card is <strong>&ge;</strong> the Goalie, it's a GOAL!</li>
                <li>After a shot, the turn passes to the opponent.</li>
              </ul>
            </div>
            <button 
              onClick={() => { soundEngine.playClick(); setShowRules(false); }}
              className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
