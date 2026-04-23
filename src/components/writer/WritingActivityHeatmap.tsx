import { useCallback, useEffect, useMemo, useState } from "react";

const MONTHS_SHORT = [
  "Yan",
  "Fev",
  "Mar",
  "Apr",
  "May",
  "İyn",
  "İyl",
  "Avq",
  "Sen",
  "Okt",
  "Noy",
  "Dek",
];

/** Sütun sırası: Bazar (0) … Şənbə (6) */
const DAY_ROWS = ["B.", "B.e", "Ç.a", "Ç.", "C.a", "C.", "Ş."];

const LIGHT = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

function startOfYearUtc(y: number): Date {
  return new Date(Date.UTC(y, 0, 1));
}

function todayUtcKey(): string {
  const n = new Date();
  return utcDayKey(
    new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())),
  );
}

/** Seçilmiş ilin tam təqvimi (Yan–Dek); gələcək günlər boş, şəbəkə Dekabrın son həftəsinə qədər */
type HeatCell = {
  key: string;
  count: number;
  inSelectedYear: boolean;
  isFutureDay: boolean;
  isPadding: boolean;
};

function buildWeekColumns(year: number, contributions: Record<string, number>) {
  const jan1 = startOfYearUtc(year);
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const yearStartKey = utcDayKey(jan1);
  const yearEndKey = utcDayKey(dec31);
  const todayKey = todayUtcKey();
  const currentUtcYear = new Date().getUTCFullYear();

  const gridStart = new Date(jan1);
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay());

  const gridEnd = new Date(dec31);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + (6 - gridEnd.getUTCDay()));

  const columns: { cells: HeatCell[] }[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const cells: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const key = utcDayKey(cursor);
      const { y } = parseKey(key);
      const inSelectedYear =
        y === year && key >= yearStartKey && key <= yearEndKey;
      const isFutureDay =
        inSelectedYear && year === currentUtcYear && key > todayKey;
      const isPadding = !inSelectedYear;
      const count =
        inSelectedYear && !isFutureDay ? (contributions[key] ?? 0) : 0;
      cells.push({
        key,
        count,
        inSelectedYear,
        isFutureDay,
        isPadding,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push({ cells });
  }

  return { columns };
}

function monthLabelForColumn(cells: HeatCell[], year: number): string | null {
  for (const c of cells) {
    if (!c.inSelectedYear) continue;
    const { y, m, d } = parseKey(c.key);
    if (y === year && d === 1) return MONTHS_SHORT[m - 1] ?? null;
  }
  return null;
}

function levelForCount(count: number, maxInYear: number): number {
  if (count <= 0) return 0;
  if (maxInYear <= 0) return 0;
  if (maxInYear === 1) return 4;
  const t = count / maxInYear;
  if (t <= 0.25) return 1;
  if (t <= 0.5) return 2;
  if (t <= 0.75) return 3;
  return 4;
}

function collectYears(contributions: Record<string, number>): number[] {
  const s = new Set<number>();
  for (const k of Object.keys(contributions)) {
    const y = parseInt(k.slice(0, 4), 10);
    if (!Number.isNaN(y)) s.add(y);
  }
  s.add(new Date().getUTCFullYear());
  return Array.from(s).sort((a, b) => b - a);
}

function totalInYear(year: number, contributions: Record<string, number>) {
  let n = 0;
  const p = `${year}-`;
  for (const [k, v] of Object.entries(contributions)) {
    if (k.startsWith(p)) n += v;
  }
  return n;
}

function maxDayInYear(year: number, contributions: Record<string, number>) {
  let m = 0;
  const p = `${year}-`;
  for (const [k, v] of Object.entries(contributions)) {
    if (k.startsWith(p) && v > m) m = v;
  }
  return m;
}

export default function WritingActivityHeatmap({
  contributions,
}: {
  contributions: Record<string, number>;
}) {
  const years = useMemo(() => collectYears(contributions), [contributions]);
  const [year, setYear] = useState(
    () => years[0] ?? new Date().getUTCFullYear(),
  );
  const [isDark, setIsDark] = useState(false);
  const [tip, setTip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (years.length > 0 && !years.includes(year)) {
      setYear(years[0]);
    }
  }, [years, year]);

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setIsDark(el.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const palette = isDark ? DARK : LIGHT;

  const { columns } = useMemo(
    () => buildWeekColumns(year, contributions),
    [year, contributions],
  );

  const maxDay = useMemo(
    () => maxDayInYear(year, contributions),
    [year, contributions],
  );

  const yearTotal = useMemo(
    () => totalInYear(year, contributions),
    [year, contributions],
  );

  const monthLabels = useMemo(
    () => columns.map((col) => monthLabelForColumn(col.cells, year)),
    [columns, year],
  );

  const hideTip = useCallback(() => setTip(null), []);

  const showTip = useCallback(
    (clientX: number, clientY: number, cell: HeatCell) => {
      const date = new Date(`${cell.key}T12:00:00.000Z`);
      const formatted = date.toLocaleDateString("az-AZ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      let main: string;
      if (cell.isPadding) {
        main = formatted;
      } else if (cell.isFutureDay) {
        main = `Gələcək tarix — ${formatted}`;
      } else {
        main = `${cell.count === 0 ? "Heç bir" : cell.count} məqalə — ${formatted}`;
      }
      setTip({ x: clientX, y: clientY, text: main });
    },
    [],
  );

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 min-w-0">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-base-900 dark:text-base-50 mb-3">
          Yazı fəaliyyəti
        </h2>
        <p className="text-xs text-base-500 dark:text-base-500 mb-3">
          Hər kvadrat bir günü göstərir; rəng tündlüyü həmin gün dərc etdiyiniz
          məqalə sayına uyğundur.
        </p>

        <div className="w-full min-w-0 overflow-hidden">
          <div className="flex flex-col w-full min-w-0 gap-px">
            <div className="flex w-full min-w-0 gap-px">
              <div className="w-7 shrink-0 h-[18px]" aria-hidden />
              {columns.map((_, wi) => (
                <div
                  key={`m-${wi}`}
                  className="flex-1 min-w-0 text-[7px] sm:text-[8px] text-base-600 dark:text-base-400 font-medium leading-none flex items-end justify-center pb-0.5 text-center"
                >
                  <span className="truncate block w-full px-px">
                    {monthLabels[wi] ?? ""}
                  </span>
                </div>
              ))}
            </div>

            {DAY_ROWS.map((dayLabel, dayIndex) => (
              <div
                key={dayLabel}
                className="flex w-full min-w-0 gap-px items-stretch"
              >
                <div className="w-7 shrink-0 text-[8px] sm:text-[9px] font-medium text-base-500 dark:text-base-500 text-right pr-0.5 flex items-center justify-end">
                  {dayLabel}
                </div>
                {columns.map((col, wi) => {
                  const cell = col.cells[dayIndex];
                  const canHaveActivity =
                    cell.inSelectedYear && !cell.isFutureDay && !cell.isPadding;
                  const lvl = canHaveActivity
                    ? levelForCount(cell.count, maxDay)
                    : 0;
                  const bg = canHaveActivity ? palette[lvl] : palette[0];
                  return (
                    <div
                      key={`${wi}-${cell.key}`}
                      className="flex-1 min-w-0 min-h-0 flex items-center justify-center p-px"
                    >
                      <div
                        role="img"
                        aria-label={
                          canHaveActivity
                            ? `${cell.key}: ${cell.count} məqalə`
                            : cell.key
                        }
                        className="w-full aspect-square rounded-[2px] border border-black/4 dark:border-white/6 cursor-default outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
                        style={{ backgroundColor: bg }}
                        tabIndex={0}
                        onMouseEnter={(e) =>
                          showTip(e.clientX, e.clientY, cell)
                        }
                        onMouseMove={(e) =>
                          setTip((t) =>
                            t ? { ...t, x: e.clientX, y: e.clientY } : t,
                          )
                        }
                        onMouseLeave={hideTip}
                        onFocus={(e) =>
                          showTip(
                            e.currentTarget.getBoundingClientRect().left,
                            e.currentTarget.getBoundingClientRect().top,
                            cell,
                          )
                        }
                        onBlur={hideTip}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-base-600 dark:text-base-400">
          <span className="text-base-500">Daha az</span>
          <div className="flex gap-1">
            {([0, 1, 2, 3, 4] as const).map((lvl) => (
              <div
                key={lvl}
                className="size-3 rounded-[2px] border border-black/4 dark:border-white/6 shrink-0"
                style={{
                  backgroundColor: palette[lvl],
                }}
              />
            ))}
          </div>
          <span className="text-base-500">Daha çox</span>
          <span className="ml-auto tabular-nums text-base-700 dark:text-base-300 font-medium">
            {yearTotal.toLocaleString("az-AZ")} məqalə — {year}
          </span>
        </div>
      </div>

      <div
        className="flex flex-row flex-wrap sm:flex-col gap-1.5 shrink-0 sm:pt-7"
        role="tablist"
        aria-label="İl seçimi"
      >
        {years.map((y) => (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={y === year}
            onClick={() => setYear(y)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors min-w-[4.5rem] sm:min-w-[5rem] ${
              y === year
                ? "bg-base-900 text-white border-base-900 dark:bg-base-100 dark:text-base-900 dark:border-base-100"
                : "bg-white/80 dark:bg-base-900/40 text-base-700 dark:text-base-300 border-slate-200 dark:border-base-700 hover:border-rose-400/50"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {tip && (
        <div
          className="fixed z-[100] pointer-events-none px-2.5 py-1.5 rounded-md text-[11px] font-medium shadow-lg border bg-white/95 dark:bg-base-800/95 text-base-900 dark:text-base-50 border-slate-200 dark:border-base-600 max-w-[260px]"
          style={{
            left: Math.min(
              tip.x + 10,
              typeof window !== "undefined" ? window.innerWidth - 280 : tip.x,
            ),
            top: tip.y + 14,
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
