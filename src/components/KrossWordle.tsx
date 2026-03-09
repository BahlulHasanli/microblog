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
  const [powersUsedPerWord, setPowersUsedPerWord] = useState<Record<string, number>>({});

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
  }, [isPlaying, gameOver, alreadyPlayed, selectedCell, currentLevel.words]);

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
  }, [validatedWords, gameOver, alreadyPlayed, levelsLoaded]);

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
        // loadSession loadLevels-dən SONRA çağırılmalıdır ki,
        // bərpa edilən grid köhnə boş grid ilə üst-üstə yazılmasın
        await loadSession();
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

    // elapsedRef istifadə edirik, çünki saveScore useEffect-dən çağırılır
    // və elapsed stale ola bilər
    const currentElapsed = elapsedRef.current;

    setUserScore({
      completionTime: currentElapsed,
      levelId: currentLevel.id,
      playDate: getTodayDateKey(),
    });

    try {
      const response = await fetch("/api/krosswordle/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelId: currentLevel.id,
          completionTime: currentElapsed,
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

        if (cell) {
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

      if (cell) {
        if (cell.letter === "" && activeWordId) {
          // Cari xana boşdursa — əvvəlki xanaya keç VƏ oradakı hərfi sil
          const wp = currentLevel.words.find((w) => w.id === activeWordId);
          if (wp) {
            const currentIdx = wp.direction === "H" ? x - wp.x : y - wp.y;
            if (currentIdx > 0) {
              const prevX = wp.direction === "H" ? wp.x + currentIdx - 1 : wp.x;
              const prevY = wp.direction === "V" ? wp.y + currentIdx - 1 : wp.y;
              const prevCell = newGrid[prevY]?.[prevX];
              if (prevCell) {
                prevCell.letter = "";
                prevCell.isRevealed = false;
              }
              setTimeout(() => setSelectedCell({ x: prevX, y: prevY }), 0);
            }
          }
        } else {
          cell.letter = "";
          cell.isRevealed = false;
        }
      }
      return newGrid;
    });
  }, [selectedCell, gameOver, activeWordId, currentLevel.words]);

  const usePower = useCallback(
    (type: PowerType) => {
      const power = powers.find((p) => p.type === type);
      if (!power || power.uses <= 0 || gameOver) return;

      // Aktiv sözün uzunluğu ≤5 olduqda yalnız 1 köməkçi icazə (Bomba istisnadır, çünki qlobalsdır)
      if (type !== PowerType.Bomb && activeWordId) {
        const activeWp = currentLevel.words.find((w) => w.id === activeWordId);
        if (activeWp && activeWp.word.length <= 5) {
          const usedCount = powersUsedPerWord[activeWordId] || 0;
          if (usedCount >= 1) return;
        }
      }

      const prevGrid = gridRef.current;
      const newGrid = prevGrid.map((row) =>
        row.map((cell) => (cell ? { ...cell } : null)),
      );
      let success = false;
      let affectedWordIds: string[] = [];

      // Cell kordinatına görə o xanaya aid olan bütün sözlərin ID-lərini tapan util
      const getWordsForCell = (x: number, y: number) => {
        return currentLevel.words
          .filter((wp) => {
            for (let i = 0; i < wp.word.length; i++) {
              const cx = wp.direction === "H" ? wp.x + i : wp.x;
              const cy = wp.direction === "V" ? wp.y + i : wp.y;
              if (cx === x && cy === y) return true;
            }
            return false;
          })
          .map((wp) => wp.id);
      };

      if (type === PowerType.MiddleLetter && activeWordId) {
        const wp = currentLevel.words.find((w) => w.id === activeWordId);
        if (wp) {
          const midIdx = Math.floor(wp.word.length / 2);
          const mx = wp.direction === "H" ? wp.x + midIdx : wp.x;
          const my = wp.direction === "V" ? wp.y + midIdx : wp.y;
          if (newGrid[my]?.[mx] && !newGrid[my][mx]!.isRevealed) {
            newGrid[my][mx]!.isRevealed = true;
            newGrid[my][mx]!.letter = wp.word[midIdx];
            success = true;
            affectedWordIds = getWordsForCell(mx, my);
          }
        }
      } else if (type === PowerType.Bomb) {
        // Doğru tapılmamış bütün xanaları topla
        const uncorrectCells: { x: number; y: number; char: string }[] = [];
        currentLevel.words.forEach((wp) => {
          for (let i = 0; i < wp.word.length; i++) {
            const cx = wp.direction === "H" ? wp.x + i : wp.x;
            const cy = wp.direction === "V" ? wp.y + i : wp.y;
            if (newGrid[cy]?.[cx]) {
              const isAlreadyCorrect = newGrid[cy][cx]!.letter.toUpperCase() === wp.word[i].toUpperCase();
              if (!isAlreadyCorrect && !uncorrectCells.some((c) => c.x === cx && c.y === cy)) {
                uncorrectCells.push({ x: cx, y: cy, char: wp.word[i] });
              }
            }
          }
        });
        if (uncorrectCells.length > 0) {
          const target =
            uncorrectCells[
              Math.floor(Math.random() * uncorrectCells.length)
            ];
          newGrid[target.y][target.x]!.isRevealed = true;
          newGrid[target.y][target.x]!.letter = target.char;
          newGrid[target.y][target.x]!.isBombEffect = true;
          success = true;
          // Bombanın açdığı xananın aid olduğu sözləri tap
          affectedWordIds = getWordsForCell(target.x, target.y);
          
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
          const uncorrect: { x: number; y: number; char: string }[] = [];
          for (let i = 0; i < wp.word.length; i++) {
            const nx = wp.direction === "H" ? wp.x + i : wp.x;
            const ny = wp.direction === "V" ? wp.y + i : wp.y;
            if (newGrid[ny]?.[nx]) {
              const isAlreadyCorrect = newGrid[ny][nx]!.letter.toUpperCase() === wp.word[i].toUpperCase();
              if (!isAlreadyCorrect) {
                uncorrect.push({ x: nx, y: ny, char: wp.word[i] });
              }
            }
          }
          if (uncorrect.length > 0) {
            const target =
              uncorrect[Math.floor(Math.random() * uncorrect.length)];
            newGrid[target.y][target.x]!.letter = target.char;
            newGrid[target.y][target.x]!.isRevealed = true;
            success = true;
            affectedWordIds = getWordsForCell(target.x, target.y);
          }
        }
      }

      if (success) {
        setGrid(newGrid);
        setPowers((prev) =>
          prev.map((p) => (p.type === type ? { ...p, uses: p.uses - 1 } : p)),
        );
        // Köməkçi istifadə sayını söz bazasında artır
        if (affectedWordIds.length > 0) {
          setPowersUsedPerWord((prev) => {
            const updated = { ...prev };
            affectedWordIds.forEach((wid) => {
              updated[wid] = (updated[wid] || 0) + 1;
            });
            return updated;
          });
        }
      }
    },
    [powers, gameOver, activeWordId, currentLevel.words, powersUsedPerWord],
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
        wordsWithThisCell.some(
          (wp) => validatedWords.find((v) => v.id === wp.id)?.isCorrect,
        )
      );
    },
    [currentLevel.words, validatedWords],
  );

  const isLetterCorrect = useCallback(
    (x: number, y: number, currentLetter: string | undefined) => {
      if (!currentLetter) return false;
      
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

      if (wordsWithThisCell.length === 0) return false;

      // Xananın daxil olduğu HƏR HANSI bir sözdəki həmin mövqedəki doğru hərfi yoxlayır
      return wordsWithThisCell.some((wp) => {
        const offset = wp.direction === "H" ? x - wp.x : y - wp.y;
        return wp.word[offset].toUpperCase() === currentLetter.toUpperCase();
      });
    },
    [currentLevel.words],
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

      if (e.key === "Backspace") {
        handleBackspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver, selectedCell, updateCell, handleBackspace]);

  // ─── LOGIN EKRANI ───
  if (!initialUser) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-xs w-full text-center">
          <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Trophy className="text-rose-500" size={28} />
          </div>
          <h2 className="text-xl font-nouvelr-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Giriş Tələb Olunur
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
            KrossWordle oyununu oynamaq üçün hesabınıza giriş etməlisiniz.
          </p>
          <a
            href="/signin"
            className="block w-full bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold py-3 rounded-xl transition-colors text-center text-sm"
          >
            Daxil ol
          </a>
          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
            Hesabınız yoxdur?{" "}
            <a href="/signup" className="text-rose-500 hover:underline">
              Qeydiyyat
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ─── LOADING ───
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-zinc-200 border-t-rose-500 dark:border-zinc-800 dark:border-t-rose-500 mx-auto"></div>
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">Yüklənir...</p>
        </div>
      </div>
    );
  }

  const noLevelToday =
    levelsLoaded && dynamicLevels.length === 0 && !alreadyPlayed && !isMonthEnd;

  return (
    <div className="h-full bg-white dark:bg-transparent text-zinc-900 dark:text-zinc-50 select-none">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-transparent backdrop-blur-lg border-b border-zinc-100 dark:border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-nouvelr-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Kross<span className="text-rose-500">Wordle</span>
            </h1>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              {noLevelToday ? "Günlük tapmaca" : `Gün #${currentLevel.id}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                showLeaderboard
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Trophy size={14} />
              <span>Reytinq</span>
            </button>
            {!alreadyPlayed && !noLevelToday && (
              <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <Timer size={13} className="text-rose-500" />
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {formatTime(elapsed)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Bu gün oyun yoxdur */}
        {noLevelToday && (
          <div className="mb-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center">
            <span className="text-3xl mb-3 block">🧩</span>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Bu gün üçün oyun yoxdur
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Sabah yeni oyunu gözləyin!
            </p>
          </div>
        )}

        {/* Artıq oynayıb */}
        {alreadyPlayed && (
          <div className="mb-4 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 text-center bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="text-emerald-500" size={20} />
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Təbrik edirik!
              </span>
            </div>
            <p className="text-emerald-600 dark:text-emerald-400/80 text-xs mb-3">
              Bu günün tapmacanı artıq həll etmisiniz
            </p>
            {userScore && (
              <div className="flex items-center justify-center gap-3">
                <div className="px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-zinc-900">
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Vaxt</div>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatTime(userScore.completionTime)}
                  </div>
                </div>
                <div className="px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-zinc-900">
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Səviyyə</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    #{userScore.levelId}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ayın Yekunu */}
        {isMonthEnd && (
          <div className="mb-6 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-200 dark:border-amber-800/50">
              <Trophy className="text-amber-500" size={32} />
            </div>
            <h2 className="text-2xl font-nouvelr-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              🎉 Ayın Yekunu
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm mx-auto leading-relaxed">
              Bu ay üçün yarışma sona çatdı! Növbəti yarışma{" "}
              <span className="text-rose-500 font-semibold">ayın 1-i</span>{" "}
              başlayacaq.
            </p>

            {/* Top 3 Podium */}
            {leaderboard.length > 0 && (
              <div className="flex items-end justify-center gap-2 mb-8 max-w-sm mx-auto">
                {/* 2-ci yer */}
                {leaderboard.length > 1 ? (
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full border-2 border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                      {leaderboard[1]?.avatar_url ? (
                        <img
                          src={leaderboard[1].avatar_url}
                          alt={leaderboard[1].full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          🥈
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl p-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                      <p className="text-sm mb-0.5">🥈</p>
                      <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {leaderboard[1]?.full_name}
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {leaderboard[1]?.total_score} xal
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}

                {/* 1-ci yer */}
                <div className={`flex-1 text-center ${leaderboard.length > 1 ? '-mt-4' : ''}`}>
                  <div className="mx-auto mb-2 rounded-full border-2 border-amber-400 dark:border-amber-600 overflow-hidden bg-amber-50 dark:bg-amber-950/30 w-16 h-16">
                    {leaderboard[0]?.avatar_url ? (
                      <img
                        src={leaderboard[0].avatar_url}
                        alt={leaderboard[0].full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🥇
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl p-3 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 shadow-lg shadow-amber-500/10">
                    <p className="text-lg mb-0.5">🏆</p>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                      {leaderboard[0]?.full_name}
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                      {leaderboard[0]?.total_score} xal
                    </p>
                  </div>
                </div>

                {/* 3-cü yer */}
                {leaderboard.length > 2 ? (
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full border-2 border-orange-200 dark:border-orange-800 overflow-hidden bg-orange-50 dark:bg-orange-950/30">
                      {leaderboard[2]?.avatar_url ? (
                        <img
                          src={leaderboard[2].avatar_url}
                          alt={leaderboard[2].full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          🥉
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl p-2.5 border border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20">
                      <p className="text-sm mb-0.5">🥉</p>
                      <p className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {leaderboard[2]?.full_name}
                      </p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {leaderboard[2]?.total_score} xal
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}
              </div>
            )}

            {/* Hədiyyə açıqlaması */}
            <div className="rounded-2xl p-4 max-w-sm mx-auto border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 mb-3 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                <span>🎁</span> Hədiyyələr
              </h3>
              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10">
                  <span className="text-base">🥇</span>
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-50">1-ci yer</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Xüsusi hədiyyə paketi
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <span className="text-base">🥈</span>
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-50">2-ci yer</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Premium üzvlük</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/10">
                  <span className="text-base">🥉</span>
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-50">3-cü yer</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Xüsusi badge</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 mt-6 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              Növbəti ay üçün hazır olun!
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {(showLeaderboard || isMonthEnd || noLevelToday) && (
          <div className="mb-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-nouvelr-semibold flex items-center gap-1.5">
                <Trophy className="text-rose-500" size={15} />
                Aylıq reytinq
              </h2>
              {!isMonthEnd && !noLevelToday && (
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs transition-colors"
                >
                  Bağla
                </button>
              )}
            </div>
            <div className="space-y-1">
              {leaderboard.length === 0 ? (
                <p className="text-center text-zinc-400 dark:text-zinc-500 py-4 text-xs">
                  Hələ heç kim oynamamışdır
                </p>
              ) : (
                leaderboard.map((entry, idx) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${
                      idx === 0
                        ? "bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30"
                        : idx === 1
                          ? "bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800"
                          : idx === 2
                            ? "bg-orange-50/60 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30"
                            : "border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
                    }`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 text-[11px] font-bold">
                      {idx === 0
                        ? "🥇"
                        : idx === 1
                          ? "🥈"
                          : idx === 2
                            ? "🥉"
                            : <span className="text-zinc-400 dark:text-zinc-500">{entry.rank}</span>}
                    </div>
                    {entry.avatar_url && (
                      <img
                        src={entry.avatar_url}
                        alt={entry.full_name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{entry.full_name}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {entry.games_played} oyun • {formatTime(entry.best_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-rose-500">
                        {entry.total_score}
                      </p>
                      <p className="text-[9px] text-zinc-400 dark:text-zinc-500">xal</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* OYUN SAHƏSİ */}
        {!isMonthEnd && !alreadyPlayed && !noLevelToday && (
          <div className="flex flex-col lg:flex-row gap-3 relative">
            {/* Start Screen Overlay */}
            {!isPlaying && !gameOver && (
              <div className="absolute inset-0 z-20 backdrop-blur-md bg-white/60 dark:bg-zinc-950/60 flex flex-col items-center justify-center rounded-2xl">
                <div className="max-w-xs mx-4 text-center">
                  <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-zinc-200 dark:border-zinc-700">
                    <Clock className="text-rose-500" size={26} />
                  </div>
                  <h3 className="text-lg font-nouvelr-semibold text-zinc-900 dark:text-zinc-50 mb-1.5">
                    Hazırsan?
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6 leading-relaxed">
                    Başla düyməsinə basan kimi vaxt gedəcək
                  </p>
                  <button
                    onClick={handleStartGame}
                    className="cursor-pointer w-full bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold py-3 rounded-xl transition-colors text-sm"
                  >
                    Oyuna Başla
                  </button>
                </div>
              </div>
            )}

            {/* Sol tərəf - Grid və Keyboard */}
            <div
              className={`flex-1 space-y-2 transition-all duration-300 ${!isPlaying ? "blur-sm opacity-40 pointer-events-none" : ""}`}
            >
              {/* Grid */}
              <div className="flex justify-center">
                <div
                  className="grid gap-[3px] p-2 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50"
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
                      const isCellCompleted = cell && isCellCorrect(x, y);
                      const isLetterTrue = cell && isLetterCorrect(x, y, cell.letter);
                      const isBomb = cell?.isBombEffect;

                      return (
                        <div
                          key={`${x}-${y}`}
                          onClick={() => cell && selectCell(x, y)}
                          className={`
                            relative flex items-center justify-center rounded-[4px]
                            text-[13px] sm:text-sm font-bold uppercase
                            transition-all duration-150 cursor-pointer
                            ${!cell ? "bg-zinc-100 dark:bg-zinc-800/50" : ""}
                            ${cell && !isInActive && !isSelected && !isCellCompleted && !isLetterTrue ? "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600" : ""}
                            ${isInActive && !isSelected && !isCellCompleted && !isLetterTrue ? "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60" : ""}
                            ${isSelected && !isCellCompleted && !isLetterTrue ? "bg-rose-500 text-white scale-105 z-10 border border-rose-500" : ""}
                            ${isLetterTrue && !isCellCompleted && !isSelected ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60" : ""}
                            ${isLetterTrue && !isCellCompleted && isSelected ? "bg-emerald-500 text-white scale-105 z-10 border border-emerald-500" : ""}
                            ${isCellCompleted ? "bg-emerald-500 text-white border border-emerald-500" : ""}
                            ${isBomb ? "animate-pulse bg-amber-400 text-zinc-900 border border-amber-400" : ""}
                          `}
                          style={{ aspectRatio: "1" }}
                        >
                          {cell?.letter}
                          {wordStart && (
                            <span className="absolute top-0 left-0.5 text-[6px] text-zinc-400 dark:text-zinc-500 font-bold leading-none">
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
              <div className="rounded-2xl p-2 border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="grid grid-cols-11 gap-[3px]">
                  {ALPHABET.map((char) => (
                    <button
                      key={char}
                      onClick={() =>
                        selectedCell &&
                        updateCell(selectedCell.x, selectedCell.y, char)
                      }
                      disabled={!selectedCell || gameOver}
                      className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed text-zinc-800 dark:text-zinc-200 font-semibold py-1.5 rounded-lg transition-all text-[10px] sm:text-xs"
                    >
                      {char}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleBackspace}
                  disabled={!selectedCell || gameOver}
                  className="w-full mt-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed text-zinc-600 dark:text-zinc-400 font-semibold py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-xs border border-zinc-200 dark:border-zinc-700"
                >
                  <Delete size={13} />
                  <span>SİL</span>
                </button>
              </div>
            </div>

            {/* Sağ tərəf - Powers + Clues */}
            <div className="lg:w-60 xl:w-64">
              {/* Powers */}
              <div className="rounded-2xl p-2 border border-zinc-100 dark:border-zinc-800/50 mb-2">
                <div className="flex justify-between gap-1">
                  {powers.map((p) => {
                    let isDisabledByQuota = false;
                    if (p.type !== PowerType.Bomb && activeWordId) {
                      const activeWp = currentLevel.words.find((w) => w.id === activeWordId);
                      if (activeWp && activeWp.word.length <= 5) {
                        const usedCount = powersUsedPerWord[activeWordId] || 0;
                        if (usedCount >= 1) isDisabledByQuota = true;
                      }
                    }

                    const disabled =
                      p.uses <= 0 ||
                      gameOver ||
                      (p.type !== PowerType.Bomb && !activeWordId) ||
                      isDisabledByQuota;
                    return (
                      <button
                        key={p.type}
                        disabled={disabled}
                        onClick={() => usePower(p.type)}
                        className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all ${
                          disabled
                            ? "opacity-25 cursor-not-allowed"
                            : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-700 active:scale-95"
                        }`}
                      >
                        <span className="text-sm">{p.icon}</span>
                        <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400">
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

              {/* İpuçları */}
              <div className="rounded-2xl p-3 border border-zinc-100 dark:border-zinc-800/50 lg:sticky lg:top-14">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb size={13} className="text-rose-500" />
                  <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    İpuçları
                  </span>
                </div>
                <div className="space-y-1 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto">
                  {currentLevel.words.map((wp) => {
                    const isActive = activeWordId === wp.id;
                    const isCorrect = validatedWords.find(
                      (v) => v.id === wp.id,
                    )?.isCorrect;
                    return (
                      <button
                        key={wp.id}
                        onClick={() => selectCell(wp.x, wp.y)}
                        className={`w-full text-left p-2 rounded-xl transition-all ${
                          isCorrect
                            ? "bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50"
                            : isActive
                              ? "bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50"
                              : "border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded ${
                                isCorrect
                                  ? "bg-emerald-500 text-white"
                                  : isActive
                                    ? "bg-rose-500 text-white"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {wp.id}
                            </span>
                            <span
                              className={`text-[10px] font-medium ${
                                isActive
                                  ? "text-rose-400 dark:text-rose-500"
                                  : "text-zinc-300 dark:text-zinc-600"
                              }`}
                            >
                              {wp.direction === "H" ? "→" : "↓"}
                            </span>
                          </div>
                          {isCorrect && (
                            <span className="text-emerald-400 text-xs">✓</span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] leading-relaxed ${
                            isCorrect
                              ? "text-emerald-600 dark:text-emerald-400/80"
                              : isActive
                                ? "text-zinc-800 dark:text-zinc-200"
                                : "text-zinc-500 dark:text-zinc-400"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl max-w-xs w-full text-center">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-100 dark:border-rose-900/50">
              <Trophy className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-nouvelr-semibold text-zinc-900 dark:text-zinc-50 mb-1">
              Təbriklər!
            </h2>
            <p className="text-rose-500 text-sm font-medium mb-6">
              Tapmaca həll edildi
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Vaxt
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
                  {formatTime(elapsed)}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Səviyyə
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
                  #{currentLevel.id}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setAlreadyPlayed(true);
                setShowLeaderboard(true);
              }}
              className="w-full bg-zinc-900 dark:bg-zinc-50 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mb-3 text-sm"
            >
              <Trophy size={16} />
              Reytinqə Bax
            </button>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Sabah yeni tapmaca gələcək!</p>
          </div>
        </div>
      )}
    </div>
  );
}
