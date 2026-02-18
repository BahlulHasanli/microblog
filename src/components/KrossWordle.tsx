import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Trophy, Timer, Lightbulb, Delete, Clock } from "lucide-react";
import {
  GRID_SIZE,
  INITIAL_POWERS,
  ALPHABET,
  getDailyLevelIndex,
  getTodayDateKey,
  isMonthEndPause,
} from "../utils/constants";
import { Grid, Level, PowerType, PowerState, Direction } from "../models/types";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  total_score: number;
  games_played: number;
  avg_time: number;
  best_time: number;
  rank: number;
}

interface UserScore {
  completionTime: number;
  levelId: number;
  playDate: string;
}

interface Props {
  initialUser?: any;
}

export default function KrossWordle({ initialUser }: Props) {
  // Placeholder level — DB-dən yüklənənə qədər
  const emptyLevel: Level = { id: 0, words: [] };
  const [dynamicLevels, setDynamicLevels] = useState<Level[]>([]);
  const [levelIdx, setLevelIdx] = useState(0);
  const [levelsLoaded, setLevelsLoaded] = useState(false);
  const currentLevel = dynamicLevels[levelIdx] || emptyLevel;

  const [grid, setGrid] = useState<Grid>(() =>
    Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => null),
    ),
  );
  const [powers, setPowers] = useState<PowerState[]>(() =>
    INITIAL_POWERS.map((p) => ({ ...p })),
  );
  const [selectedCell, setSelectedCell] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [activeDirection, setActiveDirection] = useState<Direction>("H");
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userScore, setUserScore] = useState<UserScore | null>(null);
  const [isMonthEnd, setIsMonthEnd] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const hasSubmittedScore = useRef(false);

  // Auto-save üçün ref-lər (stale closure qarşısını almaq üçün)
  const gridRef = useRef(grid);
  const powersRef = useRef(powers);
  const elapsedRef = useRef(elapsed);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    powersRef.current = powers;
  }, [powers]);
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  function generateEmptyGrid(lvl: Level) {
    const emptyGrid: Grid = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => null),
    );
    lvl.words.forEach((wp) => {
      for (let i = 0; i < wp.word.length; i++) {
        const nx = wp.direction === "H" ? wp.x + i : wp.x;
        const ny = wp.direction === "V" ? wp.y + i : wp.y;
        if (nx < GRID_SIZE && ny < GRID_SIZE && !emptyGrid[ny][nx]) {
          emptyGrid[ny][nx] = {
            letter: "",
            isRevealed: false,
            isBombEffect: false,
          };
        }
      }
    });
    return emptyGrid;
  }

  // Timer — hər saniyə artır
  useEffect(() => {
    if (gameOver || !isPlaying || isMonthEnd) return;

    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, isPlaying, isMonthEnd]);

  // Oyuna başla — API-yə session yarat
  const handleStartGame = async () => {
    try {
      const response = await fetch("/api/krosswordle/start-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelId: currentLevel.id,
          gridState: grid,
          powersState: powers,
        }),
      });

      if (response.ok) {
        setIsPlaying(true);
      } else {
        console.error("Oyun başladıla bilmədi");
      }
    } catch (error) {
      console.error("Oyun başlama xətası:", error);
    }
  };

  // İlk ipucu auto-focus — oyun başlayanda birinci sözü seç
  useEffect(() => {
    if (isPlaying && !gameOver && !alreadyPlayed && !selectedCell) {
      const firstWord = currentLevel.words[0];
      if (firstWord) {
        setSelectedCell({ x: firstWord.x, y: firstWord.y });
        setActiveWordId(firstWord.id);
        setActiveDirection(firstWord.direction);
      }
    }
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const validatedWords = useMemo(() => {
    return currentLevel.words.map((wp) => {
      let correct = true;
      let full = true;
      for (let i = 0; i < wp.word.length; i++) {
        const nx = wp.direction === "H" ? wp.x + i : wp.x;
        const ny = wp.direction === "V" ? wp.y + i : wp.y;
        const cell = grid[ny]?.[nx];
        if (!cell || cell.letter === "") full = false;
        if (!cell || cell.letter.toUpperCase() !== wp.word[i].toUpperCase()) {
          correct = false;
        }
      }
      return { id: wp.id, isCorrect: correct && full };
    });
  }, [grid, currentLevel]);

  // Oyun bitdikdə score saxla
  useEffect(() => {
    if (!levelsLoaded || validatedWords.length === 0) return;
    const allWordsCorrect = validatedWords.every((v) => v.isCorrect);
    if (allWordsCorrect && !gameOver && !alreadyPlayed) {
      setGameOver(true);
      saveScore();
    }
  }, [validatedWords, gameOver, alreadyPlayed]);

  // Komponent mount — level-lər yüklə, session yüklə
  useEffect(() => {
    const init = async () => {
      // Əvvəlcə level-ləri DB-dən yüklə
      await loadLevels();

      const monthEnd = isMonthEndPause();
      setIsMonthEnd(monthEnd);

      if (monthEnd) {
        setIsLoading(false);
        loadLeaderboard();
        setShowLeaderboard(true);
      } else {
        loadSession();
        loadLeaderboard();
      }
    };
    init();
  }, []);

  // DB-dən bugünkü level-i yüklə
  const loadLevels = async () => {
    try {
      const todayDate = getTodayDateKey();
      const response = await fetch(`/api/krosswordle/levels?date=${todayDate}`);
      const data = await response.json();
      if (data.level && data.level.words && data.level.words.length > 0) {
        // Bugünkü level-i Level formatına çevir
        const parsed: Level = {
          id: data.level.level_number || 1,
          words: data.level.words,
        };
        setDynamicLevels([parsed]);
        setLevelIdx(0);
        // Grid-i yenilə
        setGrid(generateEmptyGrid(parsed));
      }
      setLevelsLoaded(true);
    } catch (error) {
      console.error("Levels yüklənərkən xəta:", error);
      setLevelsLoaded(true);
    }
  };

  // Server-dən session yüklə
  const loadSession = async () => {
    try {
      const response = await fetch(
        `/api/krosswordle/check-played?date=${getTodayDateKey()}`,
      );
      if (response.ok) {
        const data = await response.json();

        if (data.status === "completed" && data.score) {
          // Artıq oynayıb — nəticələri göstər
          setAlreadyPlayed(true);
          setGameOver(true);
          setUserScore(data.score);
          setShowLeaderboard(true);
        } else if (data.status === "playing" && data.session) {
          // Davam edən oyun — vəziyyəti bərpa et
          const session = data.session;
          setGrid(session.gridState);
          setPowers(session.powersState);
          setElapsed(session.elapsedSeconds);
          setIsPlaying(true);
        }
        // data.status === "new" → heç nə etmə, "Hazırsan?" ekranı göstərilə
      }
    } catch (error) {
      console.error("Session yüklənərkən xəta:", error);
    }

    setIsLoading(false);
  };

  // Auto-save — hər 5 saniyədə progress-i server-ə saxla
  const saveProgress = useCallback(async () => {
    try {
      await fetch("/api/krosswordle/save-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gridState: gridRef.current,
          powersState: powersRef.current,
          elapsed: elapsedRef.current,
        }),
      });
    } catch (error) {
      console.error("Progress saxlanarkən xəta:", error);
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || gameOver || alreadyPlayed || isMonthEnd) return;

    const interval = setInterval(() => {
      saveProgress();
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, gameOver, alreadyPlayed, isMonthEnd, saveProgress]);

  const saveScore = async () => {
    if (hasSubmittedScore.current || alreadyPlayed) return;
    hasSubmittedScore.current = true;

    // Əvvəlcə son progress-i saxla
    await saveProgress();

    setUserScore({
      completionTime: elapsed,
      levelId: currentLevel.id,
      playDate: getTodayDateKey(),
    });

    try {
      const response = await fetch("/api/krosswordle/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelId: currentLevel.id,
          completionTime: elapsed,
          playDate: getTodayDateKey(),
        }),
      });

      if (response.ok) {
        loadLeaderboard();
        setShowLeaderboard(true);
      } else {
        console.error("Score saxlanmadı - API xətası:", response.status);
      }
    } catch (error) {
      console.error("Score saxlanarkən xəta:", error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`/api/krosswordle/leaderboard?type=monthly`);
      const result = await response.json();
      if (result.data) {
        setLeaderboard(result.data);
      }
    } catch (error) {
      console.error("Leaderboard yüklənərkən xəta:", error);
    }
  };

  const selectCell = useCallback(
    (x: number, y: number) => {
      const availableWords = currentLevel.words.filter((wp) => {
        for (let i = 0; i < wp.word.length; i++) {
          const nx = wp.direction === "H" ? wp.x + i : wp.x;
          const ny = wp.direction === "V" ? wp.y + i : wp.y;
          if (nx === x && ny === y) return true;
        }
        return false;
      });

      if (availableWords.length === 0) return;

      if (selectedCell?.x === x && selectedCell?.y === y) {
        if (availableWords.length > 1) {
          const nextWp =
            availableWords.find((w) => w.id !== activeWordId) ||
            availableWords[0];
          setActiveWordId(nextWp.id);
          setActiveDirection(nextWp.direction);
        }
      } else {
        const preferred =
          availableWords.find((w) => w.direction === activeDirection) ||
          availableWords[0];
        setSelectedCell({ x, y });
        setActiveWordId(preferred.id);
        setActiveDirection(preferred.direction);
      }
    },
    [currentLevel.words, selectedCell, activeWordId, activeDirection],
  );

  const updateCell = useCallback(
    (x: number, y: number, char: string) => {
      if (gameOver) return;
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((row) =>
          row.map((cell) => (cell ? { ...cell } : null)),
        );
        const cell = newGrid[y]?.[x];

        if (cell && !cell.isRevealed) {
          cell.letter = char;

          if (char !== "" && activeWordId) {
            const wp = currentLevel.words.find((w) => w.id === activeWordId);
            if (wp) {
              const currentIdx = wp.direction === "H" ? x - wp.x : y - wp.y;
              if (currentIdx < wp.word.length - 1) {
                const nextX =
                  wp.direction === "H" ? wp.x + currentIdx + 1 : wp.x;
                const nextY =
                  wp.direction === "V" ? wp.y + currentIdx + 1 : wp.y;
                setTimeout(() => setSelectedCell({ x: nextX, y: nextY }), 0);
              }
            }
          }
        }
        return newGrid;
      });
    },
    [gameOver, activeWordId, currentLevel.words],
  );

  const handleBackspace = useCallback(() => {
    if (!selectedCell || gameOver) return;
    const { x, y } = selectedCell;

    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) =>
        row.map((cell) => (cell ? { ...cell } : null)),
      );
      const cell = newGrid[y]?.[x];

      if (cell && !cell.isRevealed) {
        if (cell.letter === "" && activeWordId) {
          const wp = currentLevel.words.find((w) => w.id === activeWordId);
          if (wp) {
            const currentIdx = wp.direction === "H" ? x - wp.x : y - wp.y;
            if (currentIdx > 0) {
              const prevX = wp.direction === "H" ? wp.x + currentIdx - 1 : wp.x;
              const prevY = wp.direction === "V" ? wp.y + currentIdx - 1 : wp.y;
              setTimeout(() => setSelectedCell({ x: prevX, y: prevY }), 0);
            }
          }
        } else {
          cell.letter = "";
        }
      }
      return newGrid;
    });
  }, [selectedCell, gameOver, activeWordId, currentLevel.words]);

  const usePower = useCallback(
    (type: PowerType) => {
      const power = powers.find((p) => p.type === type);
      if (!power || power.uses <= 0 || gameOver) return;

      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((row) =>
          row.map((cell) => (cell ? { ...cell } : null)),
        );
        let success = false;

        if (type === PowerType.MiddleLetter && activeWordId) {
          const wp = currentLevel.words.find((w) => w.id === activeWordId);
          if (wp) {
            const midIdx = Math.floor(wp.word.length / 2);
            const mx = wp.direction === "H" ? wp.x + midIdx : wp.x;
            const my = wp.direction === "V" ? wp.y + midIdx : wp.y;
            if (newGrid[my]?.[mx]) {
              newGrid[my][mx]!.isRevealed = true;
              newGrid[my][mx]!.letter = wp.word[midIdx];
              success = true;
            }
          }
        } else if (type === PowerType.Bomb) {
          const wp =
            currentLevel.words[
              Math.floor(Math.random() * currentLevel.words.length)
            ];
          const idx = Math.floor(Math.random() * wp.word.length);
          const bx = wp.direction === "H" ? wp.x + idx : wp.x;
          const by = wp.direction === "V" ? wp.y + idx : wp.y;
          if (newGrid[by]?.[bx]) {
            newGrid[by][bx]!.isRevealed = true;
            newGrid[by][bx]!.letter = wp.word[idx];
            newGrid[by][bx]!.isBombEffect = true;
            success = true;
            setTimeout(() => {
              setGrid((prev) =>
                prev.map((row) =>
                  row.map((c) => (c ? { ...c, isBombEffect: false } : null)),
                ),
              );
            }, 600);
          }
        } else if (type === PowerType.SwapReveal && activeWordId) {
          const wp = currentLevel.words.find((w) => w.id === activeWordId);
          if (wp) {
            const unrevealed: { x: number; y: number; char: string }[] = [];
            for (let i = 0; i < wp.word.length; i++) {
              const nx = wp.direction === "H" ? wp.x + i : wp.x;
              const ny = wp.direction === "V" ? wp.y + i : wp.y;
              if (newGrid[ny]?.[nx] && !newGrid[ny][nx]!.isRevealed) {
                unrevealed.push({ x: nx, y: ny, char: wp.word[i] });
              }
            }
            if (unrevealed.length > 0) {
              const target =
                unrevealed[Math.floor(Math.random() * unrevealed.length)];
              newGrid[target.y][target.x]!.letter = target.char;
              newGrid[target.y][target.x]!.isRevealed = true;
              success = true;
            }
          }
        }

        if (success) {
          setPowers((prev) =>
            prev.map((p) => (p.type === type ? { ...p, uses: p.uses - 1 } : p)),
          );
        }

        return success ? newGrid : prevGrid;
      });
    },
    [powers, gameOver, activeWordId, currentLevel.words],
  );

  const isCellInActiveWord = useCallback(
    (x: number, y: number) => {
      if (!activeWordId) return false;
      const wp = currentLevel.words.find((w) => w.id === activeWordId);
      if (!wp) return false;
      for (let i = 0; i < wp.word.length; i++) {
        if (
          (wp.direction === "H" ? wp.x + i : wp.x) === x &&
          (wp.direction === "V" ? wp.y + i : wp.y) === y
        )
          return true;
      }
      return false;
    },
    [activeWordId, currentLevel.words],
  );

  const isCellCorrect = useCallback(
    (x: number, y: number) => {
      const wordsWithThisCell = currentLevel.words.filter((wp) => {
        for (let i = 0; i < wp.word.length; i++) {
          if (
            (wp.direction === "H" ? wp.x + i : wp.x) === x &&
            (wp.direction === "V" ? wp.y + i : wp.y) === y
          )
            return true;
        }
        return false;
      });
      return (
        wordsWithThisCell.length > 0 &&
        wordsWithThisCell.every(
          (wp) => validatedWords.find((v) => v.id === wp.id)?.isCorrect,
        )
      );
    },
    [currentLevel.words, validatedWords],
  );

  const getWordStartCell = useCallback(
    (x: number, y: number) => {
      return currentLevel.words.find((w) => w.x === x && w.y === y);
    },
    [currentLevel.words],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || !selectedCell) return;

      const key = e.key.toUpperCase();
      if (ALPHABET.includes(key)) {
        updateCell(selectedCell.x, selectedCell.y, key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver, selectedCell, updateCell, handleBackspace]);

  if (!initialUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100">
            <Trophy className="text-rose-500" size={36} />
          </div>
          <h2 className="text-2xl font-nouvelr-semibold text-zinc-900 mb-3">
            Giriş Tələb Olunur
          </h2>
          <p className="text-zinc-500 mb-8 leading-relaxed">
            KrossWordle oyununu oynamaq və reytinqdə yer tutmaq üçün hesabınıza
            giriş etməlisiniz.
          </p>
          <a
            href="/signin"
            className="block w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 text-center"
          >
            Daxil ol
          </a>
          <p className="mt-4 text-xs text-zinc-400">
            Hesabınız yoxdur?{" "}
            <a href="/signup" className="text-rose-500 hover:underline">
              Qeydiyyatdan keçin
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Yüklənir...</p>
        </div>
      </div>
    );
  }
  if (
    levelsLoaded &&
    dynamicLevels.length === 0 &&
    !alreadyPlayed &&
    !isMonthEnd
  ) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🧩</span>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            Level Mövcud Deyil
          </h2>
          <p className="text-sm text-zinc-500">
            Hazırda oyun üçün level əlavə edilməyib. Admin paneldən level əlavə
            edin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 select-none">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-nouvelr-semibold text-zinc-900">
              Kross<span className="text-rose-500">Wordle</span>
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
              Günlük #{currentLevel.id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-lg transition-colors"
            >
              <Trophy size={16} className="text-rose-500" />
              <span className="text-sm font-medium">Reytinq</span>
            </button>
            {!alreadyPlayed && (
              <div className="flex items-center gap-1.5 bg-zinc-100 px-3 py-2 rounded-lg">
                <Timer size={16} className="text-rose-500" />
                <span className="font-mono text-sm font-semibold">
                  {formatTime(elapsed)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
        {alreadyPlayed && (
          <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="text-emerald-500" size={24} />
              <span className="text-emerald-800 font-semibold text-lg">
                Təbrik edirik!
              </span>
            </div>
            <p className="text-emerald-700 text-sm mb-2">
              Bu günün tapmacanı artıq həll etmisiniz!
            </p>
            {userScore && (
              <div className="flex items-center justify-center gap-4 mt-3">
                <div className="bg-white px-4 py-2 rounded-lg border border-emerald-200">
                  <div className="text-xs text-zinc-500">Vaxt</div>
                  <div className="font-mono font-bold text-emerald-600">
                    {formatTime(userScore.completionTime)}
                  </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-emerald-200">
                  <div className="text-xs text-zinc-500">Səviyyə</div>
                  <div className="font-bold text-emerald-600">
                    #{userScore.levelId}
                  </div>
                </div>
              </div>
            )}
            <p className="text-zinc-500 text-xs mt-3">
              Sabah yeni tapmaca gələcək!
            </p>
          </div>
        )}

        {isMonthEnd && (
          <div className="mb-6 bg-white border border-zinc-200 rounded-3xl p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-yellow-400 via-rose-400 to-purple-500"></div>
            <div className="w-20 h-20 bg-linear-to-tr from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
              <Trophy className="text-white" size={36} />
            </div>
            <h2 className="text-3xl font-nouvelr-semibold text-zinc-900 mb-2">
              🎉 Ayın Yekunu
            </h2>
            <p className="text-zinc-500 mb-6 max-w-md mx-auto leading-relaxed">
              Bu ay üçün yarışma sona çatdı! Qaliblər müəyyənləşdi və hədiyyələr
              veriləcək. Növbəti yarışma{" "}
              <span className="text-rose-600 font-semibold">ayın 1-i</span>{" "}
              başlayacaq.
            </p>

            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-6 max-w-md mx-auto">
                {/* 2-ci yer */}
                <div className="flex-1 text-center">
                  <div className="w-14 h-14 mx-auto mb-2 rounded-full border-3 border-zinc-300 overflow-hidden bg-zinc-100">
                    {leaderboard[1]?.avatar_url ? (
                      <img
                        src={leaderboard[1].avatar_url}
                        alt={leaderboard[1].full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🥈
                      </div>
                    )}
                  </div>
                  <div className="bg-zinc-100 rounded-xl p-3 border border-zinc-200">
                    <p className="text-lg mb-1">🥈</p>
                    <p className="text-xs font-bold text-zinc-800 truncate">
                      {leaderboard[1]?.full_name}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {leaderboard[1]?.total_score} xal
                    </p>
                    <p className="text-[10px] mt-1 text-zinc-400 font-medium">
                      2-ci yer hədiyyəsi
                    </p>
                  </div>
                </div>

                {/* 1-ci yer */}
                <div className="flex-1 text-center -mt-4">
                  <div className="mx-auto mb-2 rounded-full border-3 border-yellow-400 overflow-hidden bg-yellow-50 ring-4 ring-yellow-100 w-[72px] h-[72px]">
                    {leaderboard[0]?.avatar_url ? (
                      <img
                        src={leaderboard[0].avatar_url}
                        alt={leaderboard[0].full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🥇
                      </div>
                    )}
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                    <p className="text-xl mb-1">🏆</p>
                    <p className="text-sm font-bold text-zinc-900 truncate">
                      {leaderboard[0]?.full_name}
                    </p>
                    <p className="text-xs text-yellow-700 font-semibold">
                      {leaderboard[0]?.total_score} xal
                    </p>
                    <p className="text-[10px] mt-1 text-yellow-600 font-medium">
                      🎁 1-ci yer hədiyyəsi
                    </p>
                  </div>
                </div>

                {/* 3-cü yer */}
                <div className="flex-1 text-center">
                  <div className="w-14 h-14 mx-auto mb-2 rounded-full border-3 border-orange-300 overflow-hidden bg-orange-50">
                    {leaderboard[2]?.avatar_url ? (
                      <img
                        src={leaderboard[2].avatar_url}
                        alt={leaderboard[2].full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🥉
                      </div>
                    )}
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                    <p className="text-lg mb-1">🥉</p>
                    <p className="text-xs font-bold text-zinc-800 truncate">
                      {leaderboard[2]?.full_name}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {leaderboard[2]?.total_score} xal
                    </p>
                    <p className="text-[10px] mt-1 text-zinc-400 font-medium">
                      3-cü yer hədiyyəsi
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Hədiyyə açıqlaması */}
            <div className="bg-zinc-50 rounded-2xl p-4 max-w-md mx-auto border border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center justify-center gap-2">
                <span>🎁</span> Hədiyyələr
              </h3>
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-3 bg-yellow-50 p-2.5 rounded-lg border border-yellow-100">
                  <span className="text-lg">🥇</span>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">1-ci yer</p>
                    <p className="text-[10px] text-zinc-600">
                      Xüsusi hədiyyə paketi
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-zinc-100 p-2.5 rounded-lg border border-zinc-200">
                  <span className="text-lg">🥈</span>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">2-ci yer</p>
                    <p className="text-[10px] text-zinc-600">Premium üzvlük</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-orange-50 p-2.5 rounded-lg border border-orange-100">
                  <span className="text-lg">🥉</span>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">3-cü yer</p>
                    <p className="text-[10px] text-zinc-600">Xüsusi badge</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-zinc-50 rounded-full px-5 py-2.5 border border-zinc-200 mt-6">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">
                Növbəti ay üçün hazır olun!
              </p>
            </div>
          </div>
        )}

        {(showLeaderboard || isMonthEnd) && (
          <div className="mb-4 bg-white border border-zinc-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-nouvelr-semibold flex items-center gap-2">
                <Trophy className="text-rose-500" size={18} />
                Aylıq Reytinq
              </h2>
              {!isMonthEnd && (
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-zinc-500 hover:text-zinc-700 text-sm"
                >
                  Bağla
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {leaderboard.length === 0 ? (
                <p className="text-center text-zinc-500 py-3 text-sm">
                  Hələ heç kim oynamamışdır
                </p>
              ) : (
                leaderboard.map((entry, idx) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      idx === 0
                        ? "bg-yellow-50 border border-yellow-200"
                        : idx === 1
                          ? "bg-zinc-100 border border-zinc-200"
                          : idx === 2
                            ? "bg-orange-50 border border-orange-200"
                            : "bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white font-bold text-xs">
                      {idx === 0
                        ? "🥇"
                        : idx === 1
                          ? "🥈"
                          : idx === 2
                            ? "🥉"
                            : entry.rank}
                    </div>
                    {entry.avatar_url && (
                      <img
                        src={entry.avatar_url}
                        alt={entry.full_name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">
                        {entry.full_name}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {entry.games_played} oyun • Ən yaxşı:{" "}
                        {formatTime(entry.best_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-500">
                        {entry.total_score}
                      </p>
                      <p className="text-[10px] text-zinc-400">xal</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Kompakt layout - Grid, Powers, Keyboard sol tərəfdə, İpuçları sağda */}
        {!isMonthEnd && !alreadyPlayed && (
          <div className="flex flex-col lg:flex-row gap-4 relative">
            {/* Start Screen Overlay */}
            {!isPlaying && !gameOver && (
              <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/50 flex flex-col items-center justify-center rounded-xl">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 text-center max-w-sm mx-4">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <Clock className="text-rose-500" size={32} />
                  </div>
                  <h3 className="text-xl font-nouvelr-semibold text-zinc-900 mb-2">
                    Hazırsan?
                  </h3>
                  <p className="text-zinc-500 text-sm mb-6">
                    "Başla" düyməsinə basan kimi vaxt gedəcək. Uğurlar!
                  </p>
                  <button
                    onClick={handleStartGame}
                    className="cursor-pointer w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
                  >
                    Oyuna Başla
                  </button>
                </div>
              </div>
            )}

            {/* Sol tərəf - Grid və Keyboard */}
            <div
              className={`flex-1 space-y-1.5 transition-all duration-300 ${!isPlaying ? "blur-sm opacity-50 pointer-events-none" : ""}`}
            >
              {/* Grid */}
              <div className="flex justify-center">
                <div
                  className="grid gap-1 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    width: "min(70vw, 280px)",
                    aspectRatio: "1",
                  }}
                >
                  {grid.map((row, y) =>
                    row.map((cell, x) => {
                      const wordStart = getWordStartCell(x, y);
                      const isSelected =
                        selectedCell?.x === x && selectedCell?.y === y;
                      const isInActive = isCellInActiveWord(x, y);
                      const isCorrect = cell && isCellCorrect(x, y);
                      const isBomb = cell?.isBombEffect;

                      return (
                        <div
                          key={`${x}-${y}`}
                          onClick={() => cell && selectCell(x, y)}
                          className={`
                            relative flex items-center justify-center rounded
                            text-sm sm:text-base font-bold uppercase
                            transition-all duration-150 cursor-pointer
                            ${!cell ? "bg-zinc-200" : ""}
                            ${cell && !isInActive && !isSelected && !isCorrect ? "bg-white border border-zinc-300 hover:border-zinc-400" : ""}
                            ${isInActive && !isSelected && !isCorrect ? "bg-rose-50 border border-rose-200" : ""}
                            ${isSelected && !isCorrect ? "bg-rose-500 text-white ring-2 ring-rose-300 scale-105 z-10" : ""}
                            ${isCorrect ? "bg-emerald-500 text-white" : ""}
                            ${isBomb ? "animate-pulse bg-amber-400 text-zinc-900" : ""}
                          `}
                          style={{ aspectRatio: "1" }}
                        >
                          {cell?.letter}
                          {wordStart && (
                            <span className="absolute top-0 left-0.5 text-[7px] text-zinc-400 font-bold">
                              {wordStart.id}
                            </span>
                          )}
                        </div>
                      );
                    }),
                  )}
                </div>
              </div>

              {/* Keyboard */}
              <div className="bg-zinc-50 rounded-xl p-1.5 border border-zinc-200">
                <div className="grid grid-cols-11 gap-0.5">
                  {ALPHABET.map((char) => (
                    <button
                      key={char}
                      onClick={() =>
                        selectedCell &&
                        updateCell(selectedCell.x, selectedCell.y, char)
                      }
                      disabled={!selectedCell || gameOver}
                      className="bg-white border border-zinc-300 hover:bg-rose-500 hover:text-white hover:border-rose-500 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-900 font-semibold py-1.5 rounded transition-all text-[10px] sm:text-xs"
                    >
                      {char}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleBackspace}
                  disabled={!selectedCell || gameOver}
                  className="w-full mt-1.5 bg-rose-100 hover:bg-rose-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-rose-700 font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1 text-sm"
                >
                  <Delete size={14} />
                  <span>SİL</span>
                </button>
              </div>
            </div>

            {/* Sağ tərəf - Clues */}
            <div className="lg:w-64 xl:w-72">
              {/* Powers */}
              <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-200 mb-3">
                <div className="flex justify-between gap-1">
                  {powers.map((p) => {
                    const disabled =
                      p.uses <= 0 ||
                      gameOver ||
                      (p.type !== PowerType.Bomb && !activeWordId);
                    return (
                      <button
                        key={p.type}
                        disabled={disabled}
                        onClick={() => usePower(p.type)}
                        className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all ${
                          disabled
                            ? "opacity-30 cursor-not-allowed bg-zinc-100"
                            : "bg-white border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 active:scale-95"
                        }`}
                      >
                        <span className="text-base">{p.icon}</span>
                        <span className="text-[9px] font-semibold text-zinc-600">
                          {p.label}
                        </span>
                        <span className="text-[10px] font-bold text-rose-500">
                          ×{p.uses}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200 lg:sticky lg:top-16">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={14} className="text-rose-500" />
                  <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                    İpuçları
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto">
                  {currentLevel.words.map((wp) => {
                    const isActive = activeWordId === wp.id;
                    const isCorrect = validatedWords.find(
                      (v) => v.id === wp.id,
                    )?.isCorrect;
                    return (
                      <button
                        key={wp.id}
                        onClick={() => selectCell(wp.x, wp.y)}
                        className={`w-full text-left p-2 rounded-lg transition-all ${
                          isCorrect
                            ? "bg-emerald-50 border border-emerald-300"
                            : isActive
                              ? "bg-rose-50 border border-rose-300"
                              : "bg-white border border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded ${
                                isCorrect
                                  ? "bg-emerald-500 text-white"
                                  : isActive
                                    ? "bg-rose-500 text-white"
                                    : "bg-zinc-200 text-zinc-600"
                              }`}
                            >
                              {wp.id}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                isActive
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {wp.direction === "H" ? "→" : "↓"}
                            </span>
                          </div>
                          {isCorrect && (
                            <Trophy size={12} className="text-emerald-400" />
                          )}
                        </div>
                        <p
                          className={`text-xs leading-snug ${
                            isCorrect
                              ? "text-emerald-700"
                              : isActive
                                ? "text-zinc-900"
                                : "text-zinc-600"
                          }`}
                        >
                          {wp.clue}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Win Modal */}
      {gameOver && !alreadyPlayed && !isMonthEnd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-zinc-200 p-8 rounded-3xl max-w-sm w-full text-center">
            <div className="w-20 h-20 bg-linear-to-tr from-rose-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-nouvelr-semibold text-zinc-900 mb-1">
              Təbriklər!
            </h2>
            <p className="text-rose-600 font-medium mb-6">
              Tapmaca həll edildi
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase">
                  Vaxt
                </p>
                <p className="text-xl font-bold text-zinc-900">
                  {formatTime(elapsed)}
                </p>
              </div>
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase">
                  Səviyyə
                </p>
                <p className="text-xl font-bold text-zinc-900">
                  #{currentLevel.id}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setAlreadyPlayed(true);
                setShowLeaderboard(true);
              }}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mb-3"
            >
              <Trophy size={20} />
              Reytinqə Bax
            </button>
            <p className="text-xs text-zinc-500">Sabah yeni tapmaca gələcək!</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center text-zinc-400 text-xs">
        <a href="/" className="hover:text-rose-500 transition-colors">
          The99.az
        </a>{" "}
        © 2025
      </footer>
    </div>
  );
}
