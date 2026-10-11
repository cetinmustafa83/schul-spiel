"use client";

import { useEffect, useState } from "react";
import { useApp, type Screen } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Home } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ContentPage {
  slug: string;
  title: string;
  bodyMd: string;
  audience?: string | null;
  updatedAt?: string | null;
}
interface ContentResponse {
  page: ContentPage;
}

const SLUG_BY_SCREEN: Partial<Record<Screen, string>> = {
  legal: "datenschutz_kids",
  "parent-info": "eltern_info",
  imprint: "impressum",
  help: "hilfe",
};

const TITLES: Partial<Record<Screen, string>> = {
  legal: "Datenschutz",
  "parent-info": "Eltern-Info",
  imprint: "Impressum",
  help: "Hilfe",
};

export function LegalScreen() {
  const { screen, navigate, payload } = useApp();
  const slug =
    (payload?.slug as string | undefined) ??
    SLUG_BY_SCREEN[screen] ??
    "datenschutz_kids";
  const fallbackTitle = TITLES[screen] ?? "Info";

  const [page, setPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/content/${encodeURIComponent(slug)}`, { cache: "no-store" });
        const data = (await res.json()) as ContentResponse | { code: string; message: string };
        if (!res.ok) {
          if (!cancelled)
            setError((data as { message?: string }).message ?? "Diese Seite gibt es gerade nicht.");
          return;
        }
        if (!cancelled) setPage((data as ContentResponse).page);
      } catch {
        if (!cancelled) setError("Netzwerkfehler. Bitte versuche es später nochmal.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const title = page?.title ?? fallbackTitle;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("home")}
          className="tap-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-dim hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </button>
        <span className="font-display text-sm font-semibold text-gold">{title}</span>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="text-4xl">📄</div>
          <h1 className="font-display text-xl font-bold text-ink">Nicht gefunden</h1>
          <p className="text-sm text-ink-dim">{error}</p>
          <Button variant="outline" onClick={() => navigate("home")}>
            <Home className="h-4 w-4" /> Zum Menü
          </Button>
        </div>
      ) : (
        <article
          className="prose prose-invert max-w-none
            [&_h1]:text-gold [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
            [&_h2]:text-ink [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2
            [&_h3]:text-ink [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1
            [&_p]:text-ink [&_p]:leading-relaxed [&_p]:mb-3
            [&_li]:text-ink-dim [&_li]:leading-relaxed [&_li]:mb-1
            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
            [&_a]:text-gold [&_a]:underline
            [&_strong]:text-ink [&_strong]:font-semibold
            [&_code]:text-mint [&_code]:bg-bg2/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
            [&_blockquote]:border-l-mint [&_blockquote]:pl-4 [&_blockquote]:text-ink-dim"
        >
          <h1>{title}</h1>
          <ReactMarkdown>{page?.bodyMd ?? ""}</ReactMarkdown>
          {page?.updatedAt && (
            <p className="mt-8 border-t border-border pt-3 text-xs text-ink-dim">
              Zuletzt aktualisiert:{" "}
              {new Date(page.updatedAt).toLocaleDateString("de-DE", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </article>
      )}

      <div className="mt-6">
        <Button variant="outline" onClick={() => navigate("home")}>
          <Home className="h-4 w-4" /> Zum Menü
        </Button>
      </div>
    </div>
  );
}
