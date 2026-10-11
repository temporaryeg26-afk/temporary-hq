import { ReactNode, useCallback, useEffect, useState } from "react";

/** Run an async loader and keep its result. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fn());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

export function Button({
  children,
  onClick,
  kind = "plain",
  busy,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void | Promise<void>;
  kind?: "primary" | "plain" | "danger" | "quiet";
  busy?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  const styles = {
    primary: "bg-ultra text-white hover:bg-[#5d6cff]",
    plain: "border border-rule hover:border-concrete text-plaster",
    danger: "border border-brick/60 text-brick hover:bg-brick/10",
    quiet: "text-concrete hover:text-plaster",
  }[kind];
  return (
    <button
      type="button"
      title={title}
      disabled={disabled || busy}
      onClick={onClick}
      className={`rounded-ctl px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${styles} ${busy ? "working" : ""}`}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-panel border border-rule bg-soot p-5 ${className}`}>{children}</section>;
}

export function PageHead({ title, children, sub }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="wide text-2xl font-semibold">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-concrete">{sub}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </header>
  );
}

const STATUS: Record<string, [string, string]> = {
  brief: ["Waiting to be written", "text-concrete border-rule"],
  drafted: ["Drafted", "text-concrete border-rule"],
  in_review: ["Waiting for review", "text-ultra border-ultra/50"],
  needs_you: ["Needs you", "text-ochre border-ochre/60"],
  approved: ["Approved", "text-moss border-moss/60"],
  rejected: ["Rejected", "text-brick border-brick/60"],
  published: ["Posted", "text-plaster border-plaster/50"],
  done: ["Ready", "text-moss border-moss/60"],
};

export function Status({ s }: { s: string }) {
  const [label, cls] = STATUS[s] ?? [s, "text-concrete border-rule"];
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

export function ErrorNote({ msg }: { msg: string | null | undefined }) {
  if (!msg) return null;
  return <p className="my-3 rounded-ctl border border-brick/50 bg-brick/10 px-3 py-2 text-sm text-brick">{msg}</p>;
}

export const isArabic = (s: string) => /[؀-ۿ]/.test(s);

export function Text({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div dir="auto" className={`prose-out ${isArabic(children) ? "ar" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="text-sm text-ultra hover:underline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export const aiName = (p?: string | null) => (p === "chatgpt" ? "ChatGPT" : p === "claude" ? "Claude" : p ?? "");

export function Loading() {
  return <p className="text-concrete">Loading…</p>;
}
