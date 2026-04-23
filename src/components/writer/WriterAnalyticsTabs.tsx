import { useState } from "react";
import WritingActivityHeatmap from "./WritingActivityHeatmap";
import {
  formatWriterTrendPct,
  writerTrendClassName,
} from "@/utils/writer-analytics";

export type WriterAnalyticsData = {
  totalPosts: number;
  totalViews: number;
  totalComments: number;
  contributionsByDate: Record<string, number>;
  avgWords: number;
  avgReadMin: number;
  viewsPer1kWords: number;
  trend: {
    v7: number;
    v7prev: number;
    c7: number;
    c7prev: number;
    v30: number;
    v30prev: number;
    c30: number;
    c30prev: number;
    dV7: number | null;
    dC7: number | null;
    dV30: number | null;
    dC30: number | null;
  };
  categoryRows: {
    slug: string;
    name: string;
    views: number;
    comments: number;
  }[];
  maxCatViews: number;
  topByViews: {
    slug: string;
    title: string;
    viewCount: number;
    commentCount: number;
  } | null;
  articles: {
    slug: string;
    title: string;
    pubDateLabel: string;
    viewCount: number;
    commentCount: number;
    approved: boolean;
  }[];
};

type TabId = "overview" | "content" | "trend" | "categories" | "articles";

const TAB_ITEMS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Ümumi" },
  { id: "content", label: "Məzmun və oxunma" },
  { id: "trend", label: "Trend" },
  { id: "categories", label: "Bölmələr üzrə oxunuş" },
  { id: "articles", label: "Məqalələr" },
];

export default function WriterAnalyticsTabs({
  data,
}: {
  data: WriterAnalyticsData;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const t = data.trend;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-base-800 bg-white/80 dark:bg-base-900/60 backdrop-blur-sm overflow-hidden min-w-0">
      <div
        className="flex overflow-x-auto gap-1 p-2 sm:p-3 border-b border-slate-200 dark:border-base-800"
        role="tablist"
        aria-label="Analitika bölmələri"
      >
        {TAB_ITEMS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            id={`tab-${id}`}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`cursor-pointer shrink-0 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border transition-colors ${
              tab === id
                ? "bg-base-900 text-white border-base-900 dark:bg-base-100 dark:text-base-900 dark:border-base-100"
                : "bg-transparent text-base-700 dark:text-base-300 border-transparent hover:bg-slate-100 dark:hover:bg-base-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5 min-w-0">
        {tab === "overview" && (
          <div
            role="tabpanel"
            id="panel-overview"
            aria-labelledby="tab-overview"
            className="space-y-8 min-w-0"
          >
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
              aria-label="Ümumi göstəricilər"
            >
              <div className="rounded-xl bg-slate-50 dark:bg-base-800/40 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-base-500 dark:text-base-400">
                  Məqalə
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-base-900 dark:text-base-50">
                  {data.totalPosts}
                </p>
              </div>
              <div className="rounded-xl  bg-slate-50 dark:bg-base-800/40 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-base-500 dark:text-base-400">
                  Ümumi baxış
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-base-900 dark:text-base-50">
                  {data.totalViews.toLocaleString("az-AZ")}
                </p>
              </div>
              <div className="rounded-xl  bg-slate-50 dark:bg-base-800/40 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-base-500 dark:text-base-400">
                  Ümumi şərh
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-base-900 dark:text-base-50">
                  {data.totalComments.toLocaleString("az-AZ")}
                </p>
              </div>
            </div>

            <div className="min-w-0" aria-label="Yazı fəaliyyəti xəritəsi">
              <WritingActivityHeatmap
                contributions={data.contributionsByDate}
              />
            </div>

            {data.topByViews && data.topByViews.viewCount > 0 && (
              <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/30 px-4 py-4 sm:px-5 sm:py-5">
                <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                  Ən çox oxunan məqaləniz
                </h2>
                <a
                  href={`/posts/${data.topByViews.slug}`}
                  className="text-lg font-nouvelr-semibold text-base-900 dark:text-base-50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  {data.topByViews.title}
                </a>
                <p className="mt-2 text-sm text-base-600 dark:text-base-400">
                  <span className="font-medium tabular-nums text-base-900 dark:text-base-200">
                    {data.topByViews.viewCount.toLocaleString("az-AZ")}
                  </span>{" "}
                  baxış ·{" "}
                  <span className="tabular-nums">
                    {data.topByViews.commentCount.toLocaleString("az-AZ")}
                  </span>{" "}
                  şərh
                </p>
              </div>
            )}

            {data.topByViews &&
              data.topByViews.viewCount === 0 &&
              data.totalPosts > 0 && (
                <p className="text-sm text-base-600 dark:text-base-400 rounded-lg border border-dashed border-slate-200 dark:border-base-700 px-4 py-3">
                  Hələ heç bir baxış qeydə alınmayıb. Məqalələr oxunduqca burada
                  görünəcək.
                </p>
              )}
          </div>
        )}

        {tab === "content" && (
          <div role="tabpanel" id="panel-content" aria-labelledby="tab-content">
            {data.totalPosts > 0 ? (
              <>
                <p className="text-xs text-base-500 dark:text-base-500 mb-4">
                  Söz sayı məqalənin mətnindən təxmini hesablanır; orta oxuma
                  sürəti ~200 söz/dəq qəbul edilir.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-500 dark:text-base-400">
                      Orta mətn uzunluğu
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-base-900 dark:text-base-50">
                      {data.avgWords.toLocaleString("az-AZ")}{" "}
                      <span className="text-sm font-normal text-base-500">
                        söz
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-base-500">
                      Məqalə başına: orta ~{data.avgReadMin} dəq oxuma
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-base-500 dark:text-base-400">
                      Baxış sıxlığı
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-base-900 dark:text-base-50">
                      {data.viewsPer1kWords.toLocaleString("az-AZ")}
                      <span className="text-sm font-normal text-base-500">
                        {" "}
                        baxış / 1000 söz
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-base-500">
                      Ümumi baxışın məzmun həcmi ilə nisbəti (bütün
                      məqalələriniz üzrə)
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-base text-base-600 dark:text-base-400">
                Məzmun statistikası üçün əvvəlcə məqalə yazın.{" "}
                <a
                  href="/studio"
                  className="text-rose-600 dark:text-rose-400 hover:underline font-medium"
                >
                  Studio
                </a>
              </p>
            )}
          </div>
        )}

        {tab === "trend" && (
          <div role="tabpanel" id="panel-trend" aria-labelledby="tab-trend">
            {data.totalPosts > 0 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-base-900 dark:text-base-50 mb-1">
                    Son günlər — müqayisə
                  </h2>
                  <p className="text-xs text-base-500 dark:text-base-500 mb-4">
                    Cari dövr və əvvəlki eyni uzunluqda dövr üzrə ümumi baxış və
                    şərh.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-lg bg-slate-50/80 dark:bg-base-800/50 px-3 py-3">
                      <p className="text-xs font-medium text-base-600 dark:text-base-300 mb-2">
                        7 gün
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-base-600 dark:text-base-400">
                            Baxış
                          </span>
                          <span className="tabular-nums font-medium text-base-900 dark:text-base-100">
                            {t.v7.toLocaleString("az-AZ")}
                            <span className="text-base-500 font-normal">
                              {" "}
                              (əvvəl: {t.v7prev.toLocaleString("az-AZ")})
                            </span>
                          </span>
                        </div>
                        <p
                          className={`text-xs font-medium tabular-nums ${writerTrendClassName(t.dV7, t.v7, t.v7prev)}`}
                        >
                          Dəyişim: {formatWriterTrendPct(t.dV7, t.v7, t.v7prev)}
                        </p>
                        <div className="flex justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-base-700">
                          <span className="text-base-600 dark:text-base-400">
                            Şərh
                          </span>
                          <span className="tabular-nums font-medium text-base-900 dark:text-base-100">
                            {t.c7.toLocaleString("az-AZ")}
                            <span className="text-base-500 font-normal">
                              {" "}
                              (əvvəl: {t.c7prev.toLocaleString("az-AZ")})
                            </span>
                          </span>
                        </div>
                        <p
                          className={`text-xs font-medium tabular-nums ${writerTrendClassName(t.dC7, t.c7, t.c7prev)}`}
                        >
                          Dəyişim: {formatWriterTrendPct(t.dC7, t.c7, t.c7prev)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50/80 dark:bg-base-800/50 px-3 py-3">
                      <p className="text-xs font-medium text-base-600 dark:text-base-300 mb-2">
                        30 gün
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-base-600 dark:text-base-400">
                            Baxış
                          </span>
                          <span className="tabular-nums font-medium text-base-900 dark:text-base-100">
                            {t.v30.toLocaleString("az-AZ")}
                            <span className="text-base-500 font-normal">
                              {" "}
                              (əvvəl: {t.v30prev.toLocaleString("az-AZ")})
                            </span>
                          </span>
                        </div>
                        <p
                          className={`text-xs font-medium tabular-nums ${writerTrendClassName(t.dV30, t.v30, t.v30prev)}`}
                        >
                          Dəyişim:{" "}
                          {formatWriterTrendPct(t.dV30, t.v30, t.v30prev)}
                        </p>
                        <div className="flex justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-base-700">
                          <span className="text-base-600 dark:text-base-400">
                            Şərh
                          </span>
                          <span className="tabular-nums font-medium text-base-900 dark:text-base-100">
                            {t.c30.toLocaleString("az-AZ")}
                            <span className="text-base-500 font-normal">
                              {" "}
                              (əvvəl: {t.c30prev.toLocaleString("az-AZ")})
                            </span>
                          </span>
                        </div>
                        <p
                          className={`text-xs font-medium tabular-nums ${writerTrendClassName(t.dC30, t.c30, t.c30prev)}`}
                        >
                          Dəyişim:{" "}
                          {formatWriterTrendPct(t.dC30, t.c30, t.c30prev)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-base text-base-600 dark:text-base-400">
                Trend üçün əvvəlcə məqalə əlavə edin.
              </p>
            )}
          </div>
        )}

        {tab === "categories" && (
          <div
            role="tabpanel"
            id="panel-categories"
            aria-labelledby="tab-categories"
          >
            {data.totalPosts === 0 ? (
              <p className="text-base text-base-600 dark:text-base-400">
                Bu bölmə üçün məqalə lazımdır.
              </p>
            ) : data.categoryRows.length > 0 ? (
              <>
                <p className="text-xs text-base-500 dark:text-base-500 mb-4">
                  Ən çox oxunan bölmələr üzrə oxunuş statistikası.
                </p>
                <ul className="space-y-3">
                  {data.categoryRows.map((row) => (
                    <li key={row.slug}>
                      <div className="flex justify-between gap-2 text-sm mb-1">
                        <span className="font-medium text-base-900 dark:text-base-100 truncate">
                          {row.name}
                        </span>
                        <span className="tabular-nums text-base-600 dark:text-base-400 shrink-0">
                          {Math.round(row.views).toLocaleString("az-AZ")} bax. ·{" "}
                          {Math.round(row.comments).toLocaleString("az-AZ")}{" "}
                          şərh
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-base-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-500/90 dark:bg-rose-500/80"
                          style={{
                            width: `${Math.min(100, (row.views / data.maxCatViews) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-base-600 dark:text-base-400">
                Məqalələrinizdə bölmə təyin olunmayıb.
              </p>
            )}
          </div>
        )}

        {tab === "articles" && (
          <div
            role="tabpanel"
            id="panel-articles"
            aria-labelledby="tab-articles"
            className="min-w-0"
          >
            {data.articles.length === 0 ? (
              <p className="text-base text-base-600 dark:text-base-400">
                Hələ məqaləniz yoxdur.{" "}
                <a
                  href="/studio"
                  className="text-rose-600 dark:text-rose-400 hover:underline font-medium"
                >
                  Studio
                </a>{" "}
                ilə yenisini yaradın.
              </p>
            ) : (
              <div className="-mx-4 sm:-mx-5 min-w-0">
                <div className="overflow-x-auto border-y border-slate-200 dark:border-base-800 bg-white/60 dark:bg-base-900/40">
                  <table className="w-full min-w-lg text-left text-sm">
                    <thead className="bg-slate-50/90 dark:bg-base-800/80 text-base-600 dark:text-base-400">
                      <tr>
                        <th className="pl-4 sm:pl-5 pr-2 py-2.5 font-medium">
                          Başlıq
                        </th>
                        <th className="px-2 py-2.5 font-medium whitespace-nowrap">
                          Tarix
                        </th>
                        <th className="px-2 py-2.5 font-medium text-right tabular-nums">
                          Baxış
                        </th>
                        <th className="px-2 py-2.5 font-medium text-right tabular-nums">
                          Şərh
                        </th>
                        <th className="pl-2 pr-3 sm:pr-4 py-2.5 font-medium whitespace-nowrap">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-base-800">
                      {data.articles.map((a) => (
                        <tr
                          key={a.slug}
                          className="hover:bg-slate-50/80 dark:hover:bg-base-800/50 transition-colors"
                        >
                          <td className="pl-4 sm:pl-5 pr-2 py-2.5 max-w-[200px] sm:max-w-none">
                            <a
                              href={`/posts/${a.slug}`}
                              className="font-medium text-base-900 dark:text-base-100 hover:text-rose-600 dark:hover:text-rose-400 line-clamp-2"
                            >
                              {a.title}
                            </a>
                          </td>
                          <td className="px-2 py-2.5 text-base-600 dark:text-base-400 whitespace-nowrap">
                            {a.pubDateLabel}
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-base-900 dark:text-base-100">
                            {a.viewCount.toLocaleString("az-AZ")}
                          </td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-base-900 dark:text-base-100">
                            {a.commentCount.toLocaleString("az-AZ")}
                          </td>
                          <td className="pl-2 pr-3 sm:pr-4 py-2.5 whitespace-nowrap align-middle">
                            {a.approved ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-5 py-2 text-[11px] font-medium leading-tight text-emerald-800 dark:text-emerald-300">
                                Dərc olunub
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-5 py-2 text-[11px] font-medium leading-tight text-amber-900 dark:text-amber-200">
                                Gözləmədə
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
