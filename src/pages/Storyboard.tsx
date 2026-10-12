import { useEffect, useRef, useState } from "react";
import { useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, Button, Copy, ErrorNote, Loading, Status, useAsync } from "../components/ui";
import { loadContent, saveOutput } from "../lib/data";
import { downloadFile } from "../lib/github";
import { rewritePartPack } from "../lib/packs";
import { list } from "../lib/store";
import type { ContentItem, Media } from "../lib/types";

const FLOW = "https://labs.google/fx/tools/flow";
const words = (s: string) => (s ?? "").trim().split(/\s+/).filter(Boolean).length;

type Loaded = { item: ContentItem; media: Media[] };

function useLoaded(id: string) {
  const { brand } = useBrand();
  return useAsync<Loaded>(async () => {
    const item = (await loadContent(brand.id)).find((i) => i.id === id);
    if (!item) throw new Error("This piece doesn't exist anymore.");
    const media = (await list<Media>(brand.id, "media")).filter((m) => m.content_id === id && m.status === "done" && m.storage_path).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { item, media };
  }, [id]);
}

function useUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    let live = true;
    setUrl(null);
    if (path)
      downloadFile(path)
        .then((b) => live && setUrl((u = URL.createObjectURL(b))))
        .catch(() => setUrl(null));
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [path]);
  return url;
}

/** Shared top bar: title, status, save, versions. */
function Head({ item, kind, dirty, busy, onSave, onRestore }: { item: ContentItem; kind: string; dirty: boolean; busy: boolean; onSave: () => void; onRestore: (o: Record<string, any>) => void }) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <a href="#/calendar" className="text-sm text-concrete hover:text-plaster">
          ← Studio
        </a>
        <p className="mt-2 text-sm text-concrete">
          {kind} · {item.scheduled_for}
        </p>
        <h1 className="wide mt-1 text-2xl font-semibold" dir="auto">
          {item.title}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <Status s={item.status} />
          <a href={`#/content/${item.id}`} className="text-sm text-ultra hover:underline">
            Make the visuals / upload clips
          </a>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(item.versions?.length ?? 0) > 0 && (
          <select aria-label="Earlier versions" className="w-auto py-1.5 text-sm" value="" onChange={(e) => e.target.value !== "" && onRestore(item.versions![Number(e.target.value)].output)}>
            <option value="">{item.versions!.length} earlier versions…</option>
            {item.versions!.map((v, i) => (
              <option key={i} value={i}>
                Restore {new Date(v.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {v.by}
              </option>
            ))}
          </select>
        )}
        <Button kind="primary" onClick={onSave} busy={busy} disabled={!dirty}>
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
    </header>
  );
}

// ================================================================== FOUNDER FILM

export function FilmPage({ id }: { id: string }) {
  const { brand } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const { data, error, reload } = useLoaded(id);
  const [o, setO] = useState<Record<string, any> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [script, setScript] = useState(false);
  const [rewrite, setRewrite] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (data && !dirty) setO(data.item.output ?? null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;
  const { item, media } = data;
  if (!o) return <p className="text-concrete">The Film director hasn't written this film yet. It appears here once the script is written.</p>;

  const scenes: any[] = o.scenes ?? [];
  const clipOf = (n: number) => media.find((m) => m.slot === `scene-${n}`);
  const approved = scenes.filter((s) => s.approved).length;
  const allClips = scenes.length > 0 && scenes.every((s) => clipOf(Number(s.n)));

  const setScene = (n: number, patch: Record<string, any>) => {
    setO({ ...o, scenes: scenes.map((s) => (Number(s.n) === n ? { ...s, ...patch } : s)) });
    setDirty(true);
  };
  const save = async (next = o) => {
    setBusy(true);
    setErr(null);
    try {
      await saveOutput(brand, item, next);
      setDirty(false);
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div>
      <Head item={item} kind="Founder film · 6 × 10 s" dirty={dirty} busy={busy} onSave={() => save()} onRestore={(v) => { setO(v); setDirty(true); }} />
      <ErrorNote msg={err} />

      <section className="mb-5 grid gap-4 rounded-panel border border-rule bg-soot p-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-1 text-sm">
          <p dir="auto">
            <span className="text-concrete">Idea: </span>
            {o.concept}
          </p>
          <p dir="auto">
            <span className="text-concrete">Line to remember: </span>
            <b>{o.doctrine_line}</b>
          </p>
          <p className="text-concrete" dir="auto">
            Music: {o.music} {o.sound_design ? `· ${o.sound_design}` : ""}
          </p>
          <p className="text-xs text-concrete">The founder is a masked character made with AI tools. Don't mention AI in the caption — switch on Instagram's “AI info” label when posting. Never claim he is a real person or filmed live.</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button onClick={() => setScript(!script)}>{script ? "Back to storyboard" : "Read full script"}</Button>
          <Button onClick={() => setPlay(true)} disabled={!allClips} title={allClips ? "" : "All 6 clips are needed"}>
            Play full film
          </Button>
        </div>
        <p className={`text-sm md:col-span-2 ${approved === scenes.length ? "text-moss" : "text-ochre"}`}>
          {approved}/{scenes.length} scenes approved. Only approved scenes get made in Flow — so you never spend credits on a scene you haven't read.
        </p>
      </section>

      {play && <FilmPlayer clips={scenes.map((s) => clipOf(Number(s.n))!).filter(Boolean)} onClose={() => setPlay(false)} />}

      {script ? (
        <article className="max-w-2xl space-y-5 rounded-panel border border-rule bg-soot p-6">
          {scenes.map((s) => (
            <div key={s.n}>
              <p className="text-xs text-concrete">
                Scene {s.n} · {s.purpose} · {(s.n - 1) * 10}–{s.n * 10}s
              </p>
              <p className="mt-1 text-lg" dir="auto">
                {s.voiceover}
              </p>
              {s.on_screen_text && (
                <p className="mt-1 text-sm text-ochre" dir="auto">
                  On screen: {s.on_screen_text}
                </p>
              )}
            </div>
          ))}
        </article>
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3">
          {scenes.map((s) => {
            const n = Number(s.n);
            const w = words(s.voiceover);
            return (
              <article key={n} className={`w-[300px] shrink-0 snap-start rounded-panel border bg-soot p-3 text-sm ${s.approved ? "border-moss/60" : "border-rule"}`}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    Scene {n} <span className="font-normal text-concrete">· {s.purpose} · 10 s</span>
                  </p>
                  {s.approved && <span className="text-xs text-moss">approved</span>}
                </div>
                <Clip media={clipOf(n)} />
                <label className="mt-2 block text-xs">Voiceover</label>
                <textarea dir="auto" rows={3} value={s.voiceover ?? ""} onChange={(e) => setScene(n, { voiceover: e.target.value })} />
                <p className={`text-xs ${w > 25 ? "text-brick" : "text-concrete"}`}>{w} words {w > 25 ? "— too long for 10 s" : ""}</p>
                <label className="mt-2 block text-xs">On-screen text</label>
                <input dir="auto" value={s.on_screen_text ?? ""} onChange={(e) => setScene(n, { on_screen_text: e.target.value })} />
                <label className="mt-2 block text-xs">Shot (what we see)</label>
                <textarea dir="auto" rows={2} value={s.visual ?? ""} onChange={(e) => setScene(n, { visual: e.target.value })} />
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-ultra">Show Flow prompt & frames</summary>
                  <label className="mt-2 block text-xs">Starts on</label>
                  <input value={s.start_frame ?? ""} onChange={(e) => setScene(n, { start_frame: e.target.value })} />
                  <label className="mt-2 block text-xs">Ends on</label>
                  <input value={s.end_frame ?? ""} onChange={(e) => setScene(n, { end_frame: e.target.value })} />
                  <label className="mt-2 block text-xs">Flow prompt (English)</label>
                  <textarea rows={5} className="text-xs" value={s.video_prompt ?? ""} onChange={(e) => setScene(n, { video_prompt: e.target.value })} />
                  <div className="mt-1 flex gap-3">
                    <Copy text={[s.video_prompt, s.start_frame ? `Starts on: ${s.start_frame}.` : "", s.end_frame ? `Ends on: ${s.end_frame}.` : "", "Exactly 10 seconds."].filter(Boolean).join(" ")} label="Copy for Flow" />
                    <a href={FLOW} target="_blank" rel="noreferrer" className="text-sm text-ultra">
                      Open Flow
                    </a>
                  </div>
                </details>
                <p className="mt-2 text-xs text-concrete">Overlays: {(o.overlays ?? []).map((x: any) => `${x.asset_kind} ${x.position}`).join(", ") || "mask + logo"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button kind={s.approved ? "plain" : "primary"} onClick={() => save({ ...o, scenes: scenes.map((x) => (Number(x.n) === n ? { ...x, approved: !x.approved } : x)) })} busy={busy}>
                    {s.approved ? "Un-approve" : "Approve scene"}
                  </Button>
                  <Button kind="quiet" onClick={() => setRewrite(rewrite === n ? null : n)}>
                    Ask {aiName(manager)} to rewrite
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {rewrite != null && (
        <section className="mt-5">
          <label htmlFor="rnote">What should change in scene {rewrite}?</label>
          <input id="rnote" dir="auto" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. make it angrier, say the price out loud, shorter" />
          <div className="mt-3">
            <Relay
              to={manager}
              title={`Rewrite scene ${rewrite}`}
              why="Only this scene changes. The new version replaces it; the old one stays in the version history."
              makePack={() => rewritePartPack(brand, { ...item, output: o }, "scene", rewrite, note)}
              onAnswer={async (json) => {
                const part = json?.part;
                if (!part) throw new Error('No "part" in that answer.');
                await save({ ...o, scenes: scenes.map((x) => (Number(x.n) === rewrite ? { ...x, ...part, n: rewrite, approved: false } : x)) });
                setRewrite(null);
                setNote("");
                return "Scene replaced.";
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Clip({ media }: { media?: Media }) {
  const url = useUrl(media?.storage_path);
  return (
    <div className="mt-2 aspect-[9/16] max-h-56 w-full overflow-hidden rounded-ctl border border-rule bg-ash">
      {url ? <video src={url} controls playsInline className="h-full w-full object-cover" /> : <p className="grid h-full place-items-center px-4 text-center text-xs text-concrete">No clip yet. Approve the scene, make it in Flow, then upload it.</p>}
    </div>
  );
}

function FilmPlayer({ clips, onClose }: { clips: Media[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const url = useUrl(clips[i]?.storage_path);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    ref.current?.play().catch(() => undefined);
  }, [url]);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Full film">
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="aspect-[9/16] overflow-hidden rounded-panel bg-black">{url && <video ref={ref} key={url} src={url} playsInline controls className="h-full w-full object-cover" onEnded={() => setI(i + 1 < clips.length ? i + 1 : i)} />}</div>
        <p className="mt-2 flex justify-between text-sm text-concrete">
          <span>
            Scene {i + 1} of {clips.length}
          </span>
          <button onClick={onClose} className="hover:text-plaster">
            Close
          </button>
        </p>
      </div>
    </div>
  );
}

// ================================================================== MOTION CAROUSEL

export function MotionPage({ id }: { id: string }) {
  const { brand } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const { data, error, reload } = useLoaded(id);
  const [o, setO] = useState<Record<string, any> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rewrite, setRewrite] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);

  useEffect(() => {
    if (data && !dirty) setO(data.item.output ?? null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const slides: any[] = o?.slides ?? [];
  useEffect(() => {
    if (!playing || !slides.length) return;
    const t = setTimeout(() => (cur + 1 < slides.length ? setCur(cur + 1) : setPlaying(false)), (Number(slides[cur]?.seconds) || 5) * 1000);
    return () => clearTimeout(t);
  }, [playing, cur, slides]);

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;
  const { item, media } = data;
  if (!o) return <p className="text-concrete">The Motion designer hasn't written this carousel yet.</p>;

  const palette: string[] = (o.palette ?? []).filter((c: string) => /^#?[0-9a-f]{3,8}$/i.test(c)).map((c: string) => (c.startsWith("#") ? c : "#" + c));
  const bg = palette[0] ?? "#111111";
  const fg = palette[1] ?? "#ffffff";
  const accent = palette[2] ?? "#4a5bff";
  const renderOf = (n: number) => media.find((m) => m.slot === `slide-${n}`);
  const setSlide = (n: number, patch: Record<string, any>) => {
    setO({ ...o, slides: slides.map((s) => (Number(s.n) === n ? { ...s, ...patch } : s)) });
    setDirty(true);
  };
  const save = async (next = o) => {
    setBusy(true);
    setErr(null);
    try {
      await saveOutput(brand, item, next);
      setDirty(false);
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  const total = slides.reduce((t, s) => t + (Number(s.seconds) || 5), 0);
  const s = slides[cur];

  return (
    <div>
      <Head item={item} kind="Motion carousel" dirty={dirty} busy={busy} onSave={() => save()} onRestore={(v) => { setO(v); setDirty(true); }} />
      <ErrorNote msg={err} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-panel border border-rule" style={{ background: bg, color: fg }}>
            {s && (
              <div key={`${cur}-${playing}`} className="motion-in absolute inset-0 flex flex-col justify-center p-7">
                <span className="absolute left-0 top-0 h-1 motion-bar" style={{ background: accent, animationDuration: `${Number(s.seconds) || 5}s`, animationPlayState: playing ? "running" : "paused" }} />
                <p className="text-[11px] uppercase tracking-widest opacity-60">
                  {cur + 1}/{slides.length}
                </p>
                <p dir="auto" className="mt-3 text-2xl font-bold leading-snug">
                  {s.copy}
                </p>
                <p className="absolute bottom-3 right-4 text-[10px] font-bold tracking-widest opacity-70">TEMPORARY™</p>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button kind="primary" onClick={() => { setCur(0); setPlaying(true); }}>
              ▶ Play ({total}s)
            </Button>
            <Button kind="quiet" onClick={() => { setPlaying(false); setCur(Math.max(0, cur - 1)); }}>
              ‹
            </Button>
            <Button kind="quiet" onClick={() => { setPlaying(false); setCur(Math.min(slides.length - 1, cur + 1)); }}>
              ›
            </Button>
          </div>
          <p className="mt-2 text-xs text-concrete">A quick preview of text, order and timing. The final animation is rendered by the Motion designer and shows on each slide once uploaded.</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-xs text-concrete">Idea</dt>
              <dd dir="auto">{o.concept}</dd>
            </div>
            <div>
              <dt className="text-xs text-concrete">Through-line</dt>
              <dd dir="auto">{o.through_line}</dd>
            </div>
            <div>
              <dt className="text-xs text-concrete">Music · {o.bpm} BPM</dt>
              <dd dir="auto">{o.music}</dd>
            </div>
            {palette.length > 0 && (
              <div className="flex gap-1">
                {palette.map((c) => (
                  <span key={c} title={c} className="h-6 w-6 rounded border border-rule" style={{ background: c }} />
                ))}
              </div>
            )}
          </dl>
        </div>

        <ol className="space-y-3">
          {slides.map((sl, i) => {
            const n = Number(sl.n);
            return (
              <li key={n} className={`rounded-panel border bg-soot p-3 text-sm ${i === cur ? "border-ultra" : "border-rule"}`} onFocus={() => setCur(i)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button className="font-semibold" onClick={() => setCur(i)}>
                    Slide {n}
                    {n === 1 ? " · cover" : ""}
                  </button>
                  <div className="flex items-center gap-2 text-xs text-concrete">
                    <input aria-label="Seconds" type="number" min={2} max={15} className="w-16 py-1" value={sl.seconds ?? 5} onChange={(e) => setSlide(n, { seconds: Number(e.target.value) })} />
                    seconds
                    {renderOf(n) && <span className="text-moss">· rendered</span>}
                  </div>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div>
                    <label className="text-xs">Text on the slide</label>
                    <textarea dir="auto" rows={2} value={sl.copy ?? ""} onChange={(e) => setSlide(n, { copy: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs">Motion (what moves, on which beat)</label>
                    <textarea dir="auto" rows={2} value={sl.motion ?? ""} onChange={(e) => setSlide(n, { motion: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs">Transition to next</label>
                    <input dir="auto" value={sl.transition_out ?? ""} onChange={(e) => setSlide(n, { transition_out: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs">Sound effects</label>
                    <input value={(sl.sfx ?? []).join(", ")} onChange={(e) => setSlide(n, { sfx: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
                  </div>
                </div>
                <Button kind="quiet" onClick={() => setRewrite(rewrite === n ? null : n)}>
                  Ask {aiName(manager)} to rewrite this slide
                </Button>
              </li>
            );
          })}
        </ol>
      </div>

      {rewrite != null && (
        <section className="mt-5">
          <label htmlFor="mnote">What should change in slide {rewrite}?</label>
          <input id="mnote" dir="auto" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. shorter text, stronger question" />
          <div className="mt-3">
            <Relay
              to={manager}
              title={`Rewrite slide ${rewrite}`}
              why="Only this slide changes. The old version stays in the history."
              makePack={() => rewritePartPack(brand, { ...item, output: o }, "slide", rewrite, note)}
              onAnswer={async (json) => {
                const part = json?.part;
                if (!part) throw new Error('No "part" in that answer.');
                await save({ ...o, slides: slides.map((x) => (Number(x.n) === rewrite ? { ...x, ...part, n: rewrite } : x)) });
                setRewrite(null);
                setNote("");
                return "Slide replaced.";
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
