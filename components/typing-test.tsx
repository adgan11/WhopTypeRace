'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import rewardsConfig from '@/config/rewards.json';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const TEST_DURATION_SECONDS = 30;
const PROMPT_WORD_COUNT = 130;
const REWARD_CONFIG = rewardsConfig as RewardConfig[];
const HISTORY_PAGE_SIZE = 100;

const WORD_BANK = [
  // Original core
  'swift','echo','whisper','galaxy','ember','quantum','matrix','journey','delta','aurora','nebula',
  'serene','kinetic','cipher','vertex','cascade','luminous','zenith','vector','sonic','catalyst',
  'apex','fusion','horizon','vortex','pulse','spectrum','crystal','radiant','velocity','binary',
  'signal','framework','syntax','dynamic','network','module','payload','drift','momentum','orbital',
  'plasma','turbo','voltage','snippet','cursor','keystroke','compile','iterate','quantify','program',
  'design','pattern','render','texture','canvas','glyph','sprint','refactor','optimize','deploy',
  'commit','branch','merge','stack','queue','lambda','async','await','promise','stream','buffer',
  'packet','layout','schema','trigger','session','cluster','static','sprite','glitch','vivid','optic',
  'granite','marble','saffron','amber','sapphire','onyx','silver','carbon','feather','hollow','silent',
  'effort','focus','tempo','drizzle','thunder','storm','orbit','meteor','rocket','launch','stellar',
  'planet','comet','glimmer','flux','impact','legend','bright','cosmic','inertia','gravity','saga',
  'summit','stride','ignite','react','atomic','fusion','core','neon','byte','logic','syntax','thread',
  'input','output','system','function','variable','constant','element','vector','matrix','field',
  'radius','motion','energy','engine','booster','flight','thruster','turret','module','signal',
  'driver','kernel','object','method','class','scope','pointer','memory','cache','portal','ripple',
  'phase','beam','flash','volt','charge','cycle','chrono','elemental','quantum','reactor','skyline',
  'dynamo','nova','solstice','eclipse','ion','circuit','neural','compute','render','compile','update',
  'upload','download','execute','thread','data','flow','graph','pixel','motion','tempo','focus',
  'shift','control','escape','enter','tab','macro','command','script','loop','array','index','value',
  'trigger','signal','macro','process','runtime','virtual','device','driver','cloud','server','client',
  'gateway','bridge','portal','vector','gamma','omega','theta','alpha','sigma','phi','zeta','omega',

  // 🔥 New Additions
  'drone','signal','cascade','velocity','momentum','fragment','quantize','resonance','galactic','static',
  'binary','transmit','encrypt','decrypt','module','nanite','hyper','flux','orbit','neutron','stellar',
  'plasma','asteroid','gravity','singularity','dimension','warp','portal','vector','ionize','reboot',
  'compile','synchronize','iterate','calculate','render','texture','shader','pixel','neural','stream',
  'network','gateway','terminal','process','runtime','compile','stack','queue','buffer','data','matrix',
  'package','driver','interface','signal','loop','thread','cache','pipeline','trigger','sensor','optical',
  'voltage','current','circuit','device','kernel','runtime','command','script','macro','variable','logic',
  'integer','decimal','binary','object','method','function','instance','module','schema','layout','render',
  'design','pattern','element','symbol','token','glyph','canvas','cursor','snippet','fragment','cluster',
  'packet','protocol','session','stream','async','await','event','listener','server','client','host',
  'socket','upload','download','payload','response','request','status','header','footer','index','value',
  'property','method','operator','compute','dynamic','static','abstract','virtual','inherit','override',
  'branch','merge','commit','deploy','release','update','upgrade','rollback','version','control','git',
  'repo','clone','push','pull','origin','master','feature','main','tag','build','bundle','package',
  'install','uninstall','publish','export','import','render','compile','execute','thread','process',
  'scheduler','task','queue','buffer','pool','instance','runtime','sandbox','container','engine',
  'core','module','component','service','gateway','proxy','router','endpoint','api','request','response',
  'token','key','hash','salt','encrypt','decrypt','secure','auth','login','logout','session','user',
  'profile','avatar','dashboard','analytics','insight','metric','report','chart','table','record','entry',
  'database','query','filter','sort','insert','update','delete','search','match','index','cursor',
  'aggregate','map','reduce','join','split','parse','string','integer','boolean','float','object','array',
  'json','yaml','xml','text','binary','encode','decode','upload','download','stream','file','buffer',
  'chunk','event','listener','trigger','alert','notify','message','signal','broadcast','emit','receive',
  'connect','disconnect','reconnect','network','request','response','status','header','body','packet',
  'byte','bit','rate','speed','latency','throughput','bandwidth','ping','timeout','cache','reload',
  'refresh','restart','shutdown','boot','kernel','driver','update','patch','fix','debug','trace','log',
  'monitor','watcher','observer','metric','usage','load','memory','cpu','storage','thread','process',
  'instance','runtime','heap','stack','pointer','reference','value','address','offset','index','segment',
  'page','table','entry','record','cluster','node','block','chain','ledger','token','crypto','wallet',
  'exchange','market','trade','asset','balance','transaction','hash','mining','blockchain','proof',
  'stake','node','validator','consensus','ledger','contract','deploy','mint','burn','wallet','seed',
  'phrase','key','address','gas','fee','reward','epoch','block','height','nonce','timestamp','network',
  'node','peer','protocol','bridge','oracle','router','chain','layer','scalable','modular','compute',
  'render','stream','optimize','cache','memory','refactor','iterate','analyze','deploy','release','launch',
  'ignite','rocket','thruster','plasma','neutron','solar','flare','cosmos','orbit','stellar','quantum',
  'void','portal','spectrum','prism','diffuse','reflect','absorb','energy','impact','motion','momentum',
  'velocity','accel','mass','charge','particle','fusion','fission','reactor','circuit','voltage','amperage',
  'resistance','power','watt','joule','frequency','signal','phase','wave','pulse','echo','resonate','field',
  'vector','scalar','matrix','tensor','gradient','radius','axis','origin','plane','angle','dimension','form'
];


type RewardConfig = {
  id: string;
  minWpm: number;
  minAccuracy: number;
  amount: number;
};

type PlayerRecord = {
  whopUserId: string;
  username: string;
  credits: number;
  supabaseUserId: string;
  totalEarnings: number;
  earnedRewardKeys: Record<string, number>;
  company?: {
    id: string | null;
    title: string | null;
    route: string | null;
    ownerUserId: string | null;
    ownerUsername: string | null;
    ownerName: string | null;
  } | null;
};

type RewardSummary = {
  amount: number;
  reward_key: string;
};

type HistoryRow = {
  id: string;
  username: string;
  wpm: number;
  accuracy: number;
  rewardEarned: number;
  rewards: RewardSummary[];
  created_at: string;
};

function generatePrompt(count = PROMPT_WORD_COUNT) {
  const list: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const next = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
    list.push(next);
  }
  return list;
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

export default function TypingTest() {
  const arenaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [words, setWords] = useState<string[]>([]);
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TEST_DURATION_SECONDS);
  const [testCompleted, setTestCompleted] = useState(false);
  const [finalWpm, setFinalWpm] = useState<number | null>(null);

  const [player, setPlayer] = useState<PlayerRecord | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const [isProcessingResult, setIsProcessingResult] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [lastAccuracy, setLastAccuracy] = useState(0);

  const planId = process.env.NEXT_PUBLIC_WHOP_PLAN_ID;

  const currentWordIndex = typedWords.length;
  const currentWord = words[currentWordIndex] ?? '';

  const totalEarnedDisplay = player
    ? `$${player.totalEarnings.toFixed(2)}`
    : '$0.00';

  useEffect(() => {
    setWords(generatePrompt());
  }, []);

  const focusArena = useCallback(() => {
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      } else if (arenaRef.current) {
        arenaRef.current.focus();
      }
    });
  }, []);

  const computeCorrectWords = useCallback(
    (history: string[], trailing?: string | null) => {
      if (!words.length) {
        return 0;
      }
      let count = 0;
      history.forEach((typed, index) => {
        if (words[index] && typed === words[index]) {
          count += 1;
        }
      });

      if (
        typeof trailing === 'string' &&
        trailing.length > 0 &&
        words[history.length] &&
        trailing === words[history.length]
      ) {
        count += 1;
      }

      return count;
    },
    [words],
  );

  const loadPlayer = useCallback(async () => {
    setPlayerLoading(true);
    setPlayerError(null);
    try {
      const response = await fetch('/api/player');
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to load player');
      }

      const playerPayload = payload as Partial<PlayerRecord>;
      setPlayer({
        whopUserId: playerPayload.whopUserId ?? '',
        username: playerPayload.username ?? 'Unknown player',
        credits: playerPayload.credits ?? 0,
        supabaseUserId: playerPayload.supabaseUserId ?? '',
        totalEarnings: Number(playerPayload.totalEarnings ?? 0),
        earnedRewardKeys: playerPayload.earnedRewardKeys ?? {},
        company: playerPayload.company ?? null,
      });
    } catch (error) {
      console.error('Failed to load player', error);
      setPlayerError(
        error instanceof Error ? error.message : 'Unable to load your profile.',
      );
    } finally {
      setPlayerLoading(false);
    }
  }, []);

  const loadHistoryEntries = useCallback(async () => {
    setHistoryError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('results')
        .select(
          'id, wpm, accuracy, created_at, users!inner(id, username), rewards(reward_key, amount)'
        )
        .order('created_at', { ascending: false })
        .limit(HISTORY_PAGE_SIZE);

      if (error) {
        throw error;
      }

      type ResultRow = {
        id: string;
        wpm: number | string | null;
        created_at: string;
        users?: { id?: string | null; username?: string | null } | null;
        accuracy?: number | string | null;
        rewards?: Array<{ reward_key: string | null; amount: number | string | null }> | null;
      };

      const rows: ResultRow[] = Array.isArray(data) ? (data as ResultRow[]) : [];
      console.log('Game history fetch result', {
        fetchedCount: rows.length,
        rows,
      });

      const mapped: HistoryRow[] = rows.map((row) => {
        const username = row.users?.username ?? 'Unknown player';
        const wpmValue =
          typeof row.wpm === 'number' ? row.wpm : Number(row.wpm ?? 0);
        const accuracyValue =
          typeof row.accuracy === 'number'
            ? row.accuracy
            : Number(row.accuracy ?? 0);
        const rewardsList: RewardSummary[] = (row.rewards ?? [])
          .map((reward) => ({
            reward_key: reward.reward_key ?? 'unknown',
            amount: Number(reward.amount ?? 0),
          }))
          .filter((reward) => Number.isFinite(reward.amount));
        const totalReward = rewardsList.reduce((sum, reward) => sum + reward.amount, 0);

        return {
          id: row.id,
          username,
          wpm: wpmValue,
          accuracy: accuracyValue,
          rewardEarned: totalReward,
          rewards: rewardsList,
          created_at: row.created_at,
        };
      });

      setHistory(mapped);
      console.log('Game history mapped', mapped);
    } catch (error) {
      console.error('Failed to load game history', error);
      setHistoryError(
        error instanceof Error ? error.message : 'Unable to load game history.',
      );
    }
  }, []);

  useEffect(() => {
    void loadPlayer();
    void loadHistoryEntries();
  }, [loadPlayer, loadHistoryEntries]);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTimeRemaining((previous) => {
        if (previous <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  useEffect(() => {
    if (isRunning && timeRemaining === 0) {
      void finishTest();
    }
  }, [isRunning, timeRemaining]);

  const resetPrompt = useCallback(() => {
    setWords(generatePrompt());
  }, []);

  const resetTestState = useCallback(() => {
    resetPrompt();
    setTypedWords([]);
    setCurrentInput('');
    setTimeRemaining(TEST_DURATION_SECONDS);
    setTestCompleted(false);
    setFinalWpm(null);
    setStatusMessage(null);
    setPurchaseError(null);
    setPurchaseSuccess(null);
  }, [resetPrompt]);

  const handlePurchaseCredits = useCallback(async () => {
    if (!planId) {
      setPurchaseError('Whop plan ID is not configured.');
      return;
    }

    try {
      setIsPurchasing(true);
      setPurchaseError(null);
      setPurchaseSuccess(null);
      setStatusMessage(null);

      const response = await fetch('/api/checkout', {
        method: 'POST',
      });

      const payload = await response
        .json()
        .catch(() => ({ checkoutUrl: undefined, error: 'Checkout failed' }));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to start checkout.');
      }

      if (!payload.checkoutUrl) {
        throw new Error('Checkout URL was not returned.');
      }

      window.open(payload.checkoutUrl, '_blank', 'noopener,noreferrer');
      setPurchaseSuccess(
        'Checkout opened in a new tab. Complete the purchase to receive credits.',
      );
    } catch (error) {
      console.error('Purchase failed', error);
      setPurchaseError(
        error instanceof Error ? error.message : 'Purchase failed. Please try again.',
      );
    } finally {
      setIsPurchasing(false);
    }
  }, [planId]);

  const handleWordSubmission = useCallback(
    (input: string) => {
      if (!input) {
        setCurrentInput('');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }

      setTypedWords((previous) => {
        if (previous.length >= words.length) {
          return previous;
        }
        return [...previous, input];
      });
      setCurrentInput('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [words.length],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!isRunning) {
        event.target.value = '';
        return;
      }

      const value = event.target.value.replace(/\s+/g, (match) =>
        match.length > 1 ? ' ' : match,
      );

      if (value.endsWith(' ')) {
        handleWordSubmission(value.trim());
        return;
      }

      setCurrentInput(value);
    },
    [handleWordSubmission, isRunning],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!isRunning) {
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        setCurrentInput((previous) => {
          const nextValue = previous.slice(0, -1);
          if (inputRef.current) {
            inputRef.current.value = nextValue;
          }
          return nextValue;
        });
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        handleWordSubmission(currentInput.trim());
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        return;
      }
    },
    [currentInput, handleWordSubmission, isRunning],
  );

  const startTest = useCallback(() => {
    if (!player) {
      setPlayerError('You must be signed in via Whop to play.');
      return;
    }

    if (player.credits <= 0) {
      setStatusMessage('You are out of credits. Purchase more to start a new test.');
      setPurchaseSuccess(null);
      return;
    }

    resetTestState();
    setIsRunning(true);
    focusArena();
  }, [focusArena, player, resetTestState]);

  const finishTest = useCallback(async () => {
    setIsRunning(false);
    setTestCompleted(true);

    const wordHistory = currentInput
      ? [...typedWords, currentInput.trim()]
      : [...typedWords];

    const correctWords = computeCorrectWords(
      wordHistory,
      currentInput ? currentInput.trim() : null,
    );
    const finalScore = Number(
      (correctWords * (60 / TEST_DURATION_SECONDS)).toFixed(1),
    );
    const totalWordsTyped = wordHistory.length;
    const accuracy =
      totalWordsTyped > 0 ? (correctWords / totalWordsTyped) * 100 : 0;
    setLastAccuracy(accuracy);
    console.log('Typing run summary', {
      finalScore,
      correctWords,
      totalWordsTyped,
      accuracy,
      typedHistory: history,
    });
    setFinalWpm(finalScore);

    if (!player || !player.supabaseUserId) {
      return;
    }

    setIsProcessingResult(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/credits/consume', {
        method: 'POST',
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to consume credit.');
      }

      setPlayer((previous) =>
        previous ? { ...previous, credits: payload.credits } : previous,
      );

      const supabase = getSupabaseBrowserClient();
      const { data: existingBest, error: fetchError } = await supabase
        .from('results')
        .select('id, wpm')
        .eq('user_id', player.supabaseUserId)
        .order('wpm', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const bestScore =
        typeof existingBest?.wpm === 'number'
          ? existingBest.wpm
          : Number(existingBest?.wpm ?? 0);

      const isNewPersonalBest = !existingBest || finalScore > bestScore;
      console.log('Game result evaluation', {
        existingBest,
        bestScore,
        finalScore,
        accuracy,
        isNewPersonalBest,
      });

      const { data: insertedRow, error: insertError } = await supabase
        .from('results')
        .insert({
          user_id: player.supabaseUserId,
          wpm: finalScore,
          accuracy: Number(accuracy.toFixed(2)),
        })
        .select('id, created_at')
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log('Inserted game record', {
        insertedRow,
        finalScore,
        accuracy,
      });

      const runId = insertedRow?.id ?? null;
      if (!runId) {
        throw new Error('Inserted result missing id');
      }

      const message = isNewPersonalBest
        ? 'New personal best! Run recorded!'
        : 'Run recorded! Personal best stands.';

      const eligibleRewards = REWARD_CONFIG.filter(
        (reward) => finalScore >= reward.minWpm && accuracy >= reward.minAccuracy,
      );

      let totalAwarded = 0;

      if (eligibleRewards.length > 0) {
        console.log('Reward evaluation', {
          eligibleRewards,
          accuracy,
          finalScore,
        });
        const rewardAdjustments = eligibleRewards
          .map((reward) => {
            const increment = Number(reward.amount ?? 0);
            const previousTotal = Number(
              player.earnedRewardKeys?.[reward.id] ?? 0,
            );
            const newTotal = Number((previousTotal + increment).toFixed(2));
            return {
              reward,
              increment,
              previousTotal,
              newTotal,
            };
          })
          .filter(
            ({ increment }) => Number.isFinite(increment) && increment > 0,
          );

        if (rewardAdjustments.length === 0) {
          console.log('Reward evaluation produced no positive adjustments', {
            eligibleRewards,
          });
        } else {
          const insertPayload = rewardAdjustments.map(
            ({ reward, increment }) => ({
              user_id: player.supabaseUserId,
              result_id: runId,
              reward_key: reward.id,
              username: player.username,
              amount: increment,
              wpm: finalScore,
              accuracy: Number(accuracy.toFixed(2)),
            }),
          );

          try {
            const { error: rewardInsertError } = await supabase
              .from('rewards')
              .insert(insertPayload)
              .select('reward_key');

            if (rewardInsertError) {
              if (rewardInsertError.code !== '23505') {
                throw rewardInsertError;
              }

              for (const adjustment of rewardAdjustments) {
                const { data: updatedRows, error: updateError } = await supabase
                  .from('rewards')
                  .update({
                    amount: adjustment.newTotal,
                    result_id: runId,
                    username: player.username,
                    wpm: finalScore,
                    accuracy: Number(accuracy.toFixed(2)),
                  })
                  .eq('user_id', player.supabaseUserId)
                  .eq('reward_key', adjustment.reward.id)
                  .select('reward_key, amount');

                if (updateError) {
                  throw updateError;
                }

                if (!updatedRows || updatedRows.length === 0) {
                  console.warn('Reward update matched no rows', {
                    rewardKey: adjustment.reward.id,
                    userId: player.supabaseUserId,
                  });
                }
              }
            }

            const totalAwardedThisRun = rewardAdjustments.reduce(
              (sum, adjustment) => sum + adjustment.increment,
              0,
            );
            totalAwarded = totalAwardedThisRun;

            if (totalAwardedThisRun > 0) {
              setPlayer((previous) => {
                if (!previous) return previous;
                const updatedRewards = { ...previous.earnedRewardKeys };
                rewardAdjustments.forEach(({ reward, increment }) => {
                  updatedRewards[reward.id] =
                    (updatedRewards[reward.id] ?? 0) + increment;
                });
                return {
                  ...previous,
                  totalEarnings: previous.totalEarnings + totalAwardedThisRun,
                  earnedRewardKeys: updatedRewards,
                };
              });
            }

            console.log('Rewards granted', {
              rewardAdjustments: rewardAdjustments.map(
                ({ reward, increment, newTotal }) => ({
                  rewardKey: reward.id,
                  increment,
                  newTotal,
                }),
              ),
              totalAwarded: totalAwardedThisRun,
            });
          } catch (rewardError) {
            console.error('Failed to record rewards', rewardError);
          }
        }
      }

      const statusSuffix =
        totalAwarded > 0
          ? ` You earned $${totalAwarded.toFixed(2)} in rewards!`
          : '';

      setStatusMessage(`${message}${statusSuffix}`);
      console.log('Run resolution complete', {
        message,
        statusSuffix,
        totalAwarded,
        finalScore,
        accuracy,
      });
      await loadHistoryEntries();
      await loadPlayer();
    } catch (error) {
      console.error('Failed to record result', error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while saving your result.',
      );
    } finally {
      setIsProcessingResult(false);
    }
  }, [
    computeCorrectWords,
    currentInput,
    loadHistoryEntries,
    loadPlayer,
    player,
    typedWords,
  ]);

  const runningCorrectWords = useMemo(() => {
    const wordHistory = currentInput
      ? [...typedWords, currentInput.trim()]
      : [...typedWords];
    return computeCorrectWords(wordHistory);
  }, [computeCorrectWords, currentInput, typedWords]);

  const estimatedWpm = useMemo(() => {
    if (!isRunning || timeRemaining === TEST_DURATION_SECONDS) {
      return 0;
    }
    const elapsedSeconds = TEST_DURATION_SECONDS - timeRemaining;
    if (elapsedSeconds <= 0) {
      return 0;
    }
    return Number(
      (runningCorrectWords * (60 / elapsedSeconds)).toFixed(1),
    );
  }, [isRunning, runningCorrectWords, timeRemaining]);

  const renderWord = useCallback(
    (word: string, index: number) => {
      const typedValue =
        typedWords[index] ?? (index === currentWordIndex ? currentInput : '');
      const letters = word.split('');

      const isCompleted = index < currentWordIndex;
      const isActive = index === currentWordIndex;
      const isCorrectWord = isCompleted && typedWords[index] === word;

      const wordClass = [
        'relative mr-2 mb-2 rounded-md px-[6px] py-[2px] text-lg font-medium transition-colors',
        isCompleted
          ? isCorrectWord
            ? 'bg-emerald-500/10 text-emerald-100'
            : 'bg-rose-500/10 text-rose-200'
          : isActive
            ? 'bg-zinc-800 text-zinc-100 shadow-inner shadow-emerald-500/20'
            : 'text-zinc-600',
      ].join(' ');

      return (
        <span key={`${word}-${index}`} className={wordClass}>
          {letters.map((letter, letterIndex) => {
            const typedChar = typedValue[letterIndex];
            let charClass = 'text-zinc-500';

            if (isCompleted) {
              charClass =
                typedChar === letter ? 'text-emerald-200' : 'text-rose-300';
            } else if (isActive) {
              if (typedChar === undefined) {
                charClass = 'text-zinc-400';
              } else {
                charClass =
                  typedChar === letter ? 'text-white' : 'text-rose-300';
              }
            }

            return (
              <span
                key={`${word}-${index}-${letterIndex}`}
                className={`${charClass} transition-colors duration-150`}
              >
                {letter}
              </span>
            );
          })}
          {typedValue.length > word.length &&
            typedValue
              .slice(word.length)
              .split('')
              .map((extraChar, extraIndex) => (
                <span
                  key={`${word}-${index}-extra-${extraIndex}`}
                  className="text-rose-300 transition-colors duration-150"
                >
                  {extraChar}
                </span>
              ))}
          {isActive && (
            <span className="ml-[2px] inline-block h-6 w-[2px] animate-pulse bg-emerald-400 align-middle" />
          )}
        </span>
      );
    },
    [currentInput, currentWordIndex, typedWords],
  );

  const isStartDisabled =
    !player ||
    player.credits <= 0 ||
    isRunning ||
    playerLoading ||
    isProcessingResult ||
    isPurchasing;

  const isPurchaseDisabled = isPurchasing || !planId;

  const wpmDisplay = testCompleted
    ? formatNumber(finalWpm ?? 0)
    : formatNumber(estimatedWpm);

  const creditsDisplay = playerLoading
    ? '...'
    : typeof player?.credits === 'number'
      ? player.credits.toString()
      : '0';

  const showPrompt = words.length > 0;
  const rewardTiers = useMemo(
    () => [...REWARD_CONFIG].sort((a, b) => a.minWpm - b.minWpm),
    [],
  );

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-4xl flex-col gap-8 rounded-3xl bg-[#09090b] p-6 shadow-xl shadow-emerald-900/20 ring-1 ring-emerald-900/40 sm:p-8">
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 text-sm text-zinc-200 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:max-w-md">
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-400">
              <span>Credits</span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-200">
                {creditsDisplay}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-emerald-300">
              <span>Total Earned</span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-200">
                {totalEarnedDisplay}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium sm:text-base">
              <span>
                Timer:{' '}
                <span className="font-semibold text-emerald-200">
                  {timeRemaining}s
                </span>
              </span>
              <span>
                WPM:{' '}
                <span className="font-semibold text-emerald-200">
                  {wpmDisplay}
                </span>
              </span>
              <span>
                Accuracy:{' '}
                <span className="font-semibold text-emerald-200">
                  {testCompleted
                    ? formatNumber(lastAccuracy)
                    : words.length
                    ? formatNumber(
                        (computeCorrectWords(
                          typedWords,
                          currentInput ? currentInput.trim() : null,
                        ) /
                          Math.max(1, typedWords.length + (currentInput ? 1 : 0))) *
                          100,
                      )
                    : '0.0'}
                  %
                </span>
              </span>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
            {player?.credits !== undefined && player.credits <= 0 && (
              <button
                type="button"
                onClick={() => {
                  void handlePurchaseCredits();
                }}
                disabled={isPurchaseDisabled}
                className="w-full rounded-full bg-emerald-500/20 px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 sm:w-auto"
              >
                {isPurchasing ? 'Processing…' : 'Buy Credits'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowRewards((previous) => !previous);
              }}
              aria-expanded={showRewards}
              className="w-full rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-center text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:w-auto"
            >
              {showRewards ? 'Hide Reward Tiers' : 'View Reward Tiers'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowHistory((previous) => !previous);
              }}
              className="w-full rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-center text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:w-auto"
            >
              {showHistory ? 'Close Game History' : 'View Game History'}
            </button>
            <button
              type="button"
              onClick={startTest}
              disabled={isStartDisabled}
              className="w-full rounded-full bg-emerald-500 px-5 py-2 text-center text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 sm:w-auto"
            >
              {isRunning ? 'Running' : 'Start'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetTestState();
                setIsRunning(false);
              }}
              disabled={isRunning}
              className="w-full rounded-full border border-zinc-700 px-4 py-2 text-center text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-500 sm:w-auto"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                void finishTest();
              }}
              disabled={!isRunning || isProcessingResult}
              className="w-full rounded-full border border-emerald-500/40 px-4 py-2 text-center text-sm font-semibold text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:text-zinc-500 sm:w-auto"
            >
              Finish
            </button>
          </div>
        </header>

        {statusMessage && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {statusMessage}
          </div>
        )}
        {purchaseError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {purchaseError}
          </div>
        )}
        {purchaseSuccess && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {purchaseSuccess}
          </div>
        )}
        {playerError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {playerError}
          </div>
        )}
        {showRewards && rewardTiers.length > 0 && (
          <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-zinc-200 shadow-inner shadow-emerald-900/10 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 className="text-base font-semibold uppercase tracking-wide text-emerald-200 sm:text-lg">
                Reward Tiers
              </h2>
              <p className="text-xs text-zinc-400 sm:text-sm">
                Hit these WPM and accuracy goals in a single run to unlock the payout.
              </p>
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rewardTiers.map((reward) => (
                <li
                  key={reward.id}
                  className="flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-[#0b0c12] p-4 shadow shadow-emerald-900/20"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                      {reward.minWpm} WPM
                    </span>
                    <span className="text-xs text-zinc-500">
                      Accuracy ≥ {reward.minAccuracy}%
                    </span>
                  </div>
                  <span className="mt-3 text-lg font-bold text-emerald-200">
                    Earn ${reward.amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div
        ref={arenaRef}
        tabIndex={-1}
        onClick={focusArena}
        className="relative flex min-h-[260px] flex-1 cursor-text rounded-3xl border border-emerald-950/40 bg-[#0f1016] px-5 py-6 shadow-inner shadow-black/60 ring-1 ring-emerald-900/30 focus:outline-none sm:px-6 sm:py-8"
      >
        {!showPrompt && (
          <div className="m-auto text-sm text-zinc-500">Generating prompt…</div>
        )}
        {showPrompt && (
          <div className="flex flex-wrap text-left leading-relaxed">
            {words.map(renderWord)}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          aria-label="Hidden typing input"
          spellCheck={false}
          className="absolute left-[-9999px] top-[-9999px] h-0 w-0 opacity-0"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={!isRunning}
        />
      </div>

      <div className="rounded-2xl border border-zinc-800/60 bg-[#0f111a] px-4 py-3 text-xs text-zinc-400 sm:text-sm">
        <span className="font-semibold text-zinc-200">How to play:</span> Hit Start, type the prompt
        directly, and press space between each word. The run ends after 30 seconds or when you finish
        early.
      </div>

      {showHistory && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-[#09090b]/95 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-emerald-500/30 bg-[#0f1016] shadow-2xl shadow-emerald-900/50">
            <div className="flex items-center justify-between border-b border-emerald-500/20 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-emerald-200">
                  Global Game History
                </h2>
                <p className="text-xs text-zinc-500">
                  Every recorded run, newest first. Rewards earned are highlighted.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowHistory(false);
                }}
                className="rounded-full border border-emerald-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/10"
              >
                Close
              </button>
            </div>
            {historyError && (
              <div className="px-6 py-4 text-sm text-rose-300">
                {historyError}
              </div>
            )}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {history.length === 0 ? (
                <div className="py-6 text-center text-sm text-zinc-500">
                  No games recorded yet. Be the first to set a score!
                </div>
              ) : (
                <ul className="space-y-3">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-col gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-zinc-200 shadow-sm shadow-emerald-900/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                            {entry.username}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-semibold">
                          <span className="text-emerald-200">
                            WPM {formatNumber(entry.wpm)}
                          </span>
                          <span className="text-emerald-200">
                            Accuracy {formatNumber(entry.accuracy)}%
                          </span>
                        </div>
                      </div>
                      {entry.rewardEarned > 0 && (
                        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                          Earned ${entry.rewardEarned.toFixed(2)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
