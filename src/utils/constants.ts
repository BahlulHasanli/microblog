import { PowerType, PowerState } from "../models/types";

export const GRID_SIZE = 7;
export const ALPHABET = "ABCÇDEƏFGĞHXİIJKQLMNOÖPRSŞTUÜVYZ".split("");

export const INITIAL_POWERS: PowerState[] = [
  {
    type: PowerType.MiddleLetter,
    uses: 1,
    icon: "🎯",
    label: "Orta Hərf",
    description: "Sözün ortasını açar.",
  },
  {
    type: PowerType.SwapReveal,
    uses: 1,
    icon: "✨",
    label: "İpucu",
    description: "Təsadüfi bir hərf açar.",
  },
  {
    type: PowerType.Bomb,
    uses: 1,
    icon: "💣",
    label: "Bomba",
    description: "Təsadüfi sahə açar.",
  },
];

// Aylıq günlük səviyyə sistemi — ayın günü əsasında
export const getDailyLevelIndex = (totalLevels: number = 30) => {
  const today = new Date();
  const dayOfMonth = today.getDate(); // 1-31
  return (dayOfMonth - 1) % totalLevels;
};

export const getTodayDateKey = () => {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD formatı
};

// Ayın son gününə 1 gün qaldığını yoxla (son gün = oyun dayanır)
export const isMonthEndPause = () => {
  const today = new Date();
  const lastDayOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const currentDay = today.getDate();

  // Son günə 1 gün qalmış və ya son gündə dayanır
  return currentDay >= lastDayOfMonth;
};
