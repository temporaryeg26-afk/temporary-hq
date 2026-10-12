import { useState } from "react";
import { go, useBrand } from "../App";
import Relay from "../components/Relay";
import { aiName, Button, ErrorNote, Loading, useAsync } from "../components/ui";
import { TEAM } from "../lib/agency";
import { applyRoadmap, createPeriod, latestLab, loadPeriods, loadTasks, movePeriod, updateTask } from "../lib/data";
import { roadmapPack } from "../lib/packs";
import type { Period, Task, TaskStatus } from "../lib/types";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(s + "T12:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
};
const fmt = (s: string) => (s ? new Date(s + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");
const span = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

const PRESETS: [string, number][] = [
  ["2 weeks", 14],
  ["30 days", 30],
  ["90 days", 90],
  ["180 days", 180],
];

const TASK_STATUS: Record<TaskStatus, [string, string]> = {
  todo: ["To do", "text-concrete border-rule"],
  working: ["Working", "text-ultra border-ultra/50"],
  review: ["Director reviewing", "text-plaster border-plaster/40"],
  needs_you: ["Needs you", "text-ochre border-ochre/60"],
  done: ["Done", "text-moss border-moss/60"],
};

/** /period = the current period and its roadmap · /period/new = start a new one */
export default function PeriodPage({ isNew }: { isNew?: boolean }) {
  const { brand, products } = useBrand();
  const manager = brand.settings?.manager ?? "claude";
  const { data, error, reload } = useAsync(async () => {
    const periods = await loadPeriods(brand.id);
    const active = periods.find((p) => p.status === "active") ?? null;
    const tasks = active ? await loadTasks(brand.id, active.id) : [];
    return { periods, active, tasks };
  }, [brand.id]);

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;
  if (isNew || !data.active) return <NewPeriod hasActive={Boolean(data.active)} onDone={async () => { await reload(); go("/period"); }} />;

  const p = data.active;
  const last = data.periods.find((x) => x.status === "done") ?? null;
  const today = iso(new Date());
  const total = span(p.start, p.end);
  const elapsed = Math.min(total, Math.max(0, span(p.start, today) - (today < p.start ? total : 0)));
  const done = data.tasks.filter((t) => t.status === "done").length;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-concrete">What this is: the period you're in — its goal, the roadmap in phases and every task the team is working on.</p>
          <h1 className="wide mt-2 text-2xl font-semibold" dir="auto">
            {p.name}
          </h1>
          <p className="text-concrete">
            {fmt(p.start)} → {fmt(p.end)} · {total} days · day {elapsed} · {done}/{data.tasks.length} tasks done
          </p>
          <p className="mt-2 max-w-3xl" dir="auto">
            <span className="text-concrete">Goal: </span>
            {p.goal}
          </p>
        </div>
        <div className="flex gap-2">
          <EditPeriod p={p} onDone={reload} />
          <Button onClick={() => { go("/period/new"); }}>New period</Button>
        </div>
      </header>

      {p.needs.length > 0 && (
        <section className="mb-6 rounded-panel border border-ochre/40 bg-soot p-4">
          <h2 className="font-semibold text-ochre">Needed from you</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {p.needs.map((n, i) => (
              <li key={i} dir="auto">
                {n}
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.phases.length === 0 ? (
        <Relay
          to={manager}
          title={`Build the roadmap with ${aiName(manager)}`}
          why="The Director and Strategist split the period into phases, write the tasks for each employee (detailed for the first 2 weeks) and list what they need from you."
          makePack={async () => roadmapPack(brand, products, await latestLab(brand.id), p, last, brand.settings?.detail_days ?? 14)}
          onAnswer={async (json) => {
            const n = await applyRoadmap(brand, p, json, manager);
            await reload();
            return `Roadmap saved: ${n} tasks.`;
          }}
        />
      ) : (
        <>
          <Timeline p={p} today={today} />
          {p.budget && (
            <p className="mt-3 text-sm text-concrete">
              Plan usage for the detailed part: <span className="text-plaster">{p.budget.flow_clips} Flow clips</span> · <span className="text-plaster">{p.budget.chatgpt_images} ChatGPT images</span>
              {p.budget.notes ? ` · ${p.budget.notes}` : ""}
            </p>
          )}
          <TaskBoard tasks={data.tasks} onChange={reload} />
          <details className="mt-8">
            <summary className="cursor-pointer text-sm text-concrete">Rebuild the roadmap (replaces open tasks, keeps finished ones)</summary>
            <div className="mt-3">
              <Relay
                to={manager}
                title="Rebuild the roadmap"
                why="Use this at each review: the Director adjusts the phases and writes the next 1–2 weeks of tasks."
                makePack={async () => roadmapPack(brand, products, await latestLab(brand.id), p, last, brand.settings?.detail_days ?? 14)}
                onAnswer={async (json) => {
                  const n = await applyRoadmap(brand, p, json, manager);
                  await reload();
                  return `Roadmap updated: ${n} tasks.`;
                }}
              />
            </div>
          </details>
        </>
      )}

      {data.periods.length > 1 && (
        <section className="mt-10">
          <h2 className="mb-2 text-sm text-concrete">Earlier periods</h2>
          <ul className="space-y-1 text-sm">
            {data.periods
              .filter((x) => x.id !== p.id)
              .map((x) => (
                <li key={x.id} className="rounded-ctl border border-rule px-3 py-2" dir="auto">
                  <span className="text-concrete">
                    {fmt(x.start)} → {fmt(x.end)} ·{" "}
                  </span>
                  {x.name} — <span className="text-concrete">{x.goal}</span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NewPeriod({ hasActive, onDone }: { hasActive: boolean; onDone: () => void | Promise<void> }) {
  const { brand } = useBrand();
  const today = iso(new Date());
  const [name, setName] = useState("");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(addDays(today, brand.settings?.period_days ?? 14));
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const len = span(start, end);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await createPeriod(brand, { name: name.trim(), start, end, goal: goal.trim(), notes: notes.trim() });
      await onDone();
      return;
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-concrete">What this is: start a period of any length. The Director turns it into a roadmap and tasks for the team.</p>
      <h1 className="wide mt-2 text-2xl font-semibold">New period</h1>
      {hasActive && <p className="mt-2 text-sm text-ochre">Starting a new period marks the current one as done. Nothing is deleted.</p>}

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="pname">Name</label>
          <input id="pname" dir="auto" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. اعرف قبل ما تدفع — Know before you pay" />
        </div>
        <div>
          <label>Length</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(([label, n]) => (
              <button key={n} onClick={() => setEnd(addDays(start, n))} className={`rounded-ctl border px-3 py-2 text-sm ${len === n ? "border-ultra text-plaster" : "border-rule text-concrete hover:border-concrete"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pstart" className="text-xs">
                Start
              </label>
              <input
                id="pstart"
                type="date"
                value={start}
                onChange={(e) => {
                  setEnd(addDays(e.target.value, len));
                  setStart(e.target.value);
                }}
              />
            </div>
            <div>
              <label htmlFor="pend" className="text-xs">
                End (custom)
              </label>
              <input id="pend" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <p className="mt-1 text-xs text-concrete">{len} days. Longer periods get a roadmap in phases; the team produces 1–2 weeks at a time.</p>
        </div>
        <div>
          <label htmlFor="pgoal">Goal</label>
          <textarea id="pgoal" dir="auto" rows={2} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Build trust before launch: people learn what to check before paying for a local brand. 1,000 followers, 300 sends." />
        </div>
        <div>
          <label htmlFor="pnotes">Notes for the Director (optional)</label>
          <textarea id="pnotes" dir="auto" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What must happen, what to avoid, dates that matter…" />
        </div>
        <ErrorNote msg={err} />
        <div className="flex gap-3">
          <Button kind="primary" onClick={save} busy={busy}>
            Start period
          </Button>
          {hasActive && (
            <Button kind="quiet" onClick={() => { go("/period"); }}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Timeline({ p, today }: { p: Period; today: string }) {
  const total = span(p.start, p.end);
  const pos = (d: string) => Math.min(100, Math.max(0, (span(p.start, d) / total) * 100));
  const nowPct = today < p.start ? 0 : pos(today);
  return (
    <section>
      <h2 className="wide mb-3 text-lg font-semibold">Roadmap</h2>
      <div className="relative rounded-panel border border-rule bg-soot p-4">
        <div className="relative h-2 rounded-full bg-rule">
          <div className="absolute inset-y-0 left-0 rounded-full bg-ultra" style={{ width: `${nowPct}%` }} />
        </div>
        <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(p.phases.length, 4)}, minmax(0, 1fr))` }}>
          {p.phases.map((ph, i) => {
            const current = today >= ph.start && today <= ph.end;
            return (
              <div key={i} className={`rounded-ctl border p-3 text-sm ${current ? "border-ultra" : "border-rule"}`}>
                <p className="text-xs text-concrete">
                  {fmt(ph.start)} → {fmt(ph.end)}
                  {current && <span className="ml-2 text-ultra">now</span>}
                </p>
                <p className="mt-1 font-semibold" dir="auto">
                  {ph.name}
                </p>
                <p className="mt-1" dir="auto">
                  {ph.goal}
                </p>
                {ph.focus && (
                  <p className="mt-1 text-concrete" dir="auto">
                    {ph.focus}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TaskBoard({ tasks, onChange }: { tasks: Task[]; onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="mt-8">
      <h2 className="wide mb-3 text-lg font-semibold">Team tasks</h2>
      <div className="space-y-5">
        {TEAM.map((e) => {
          const mine = tasks.filter((t) => t.employee === e.id).sort((a, b) => a.due.localeCompare(b.due));
          if (!mine.length) return null;
          return (
            <div key={e.id}>
              <p className="mb-2 text-sm">
                <span className="font-semibold">{e.name}</span> <span className="text-concrete">· {e.runsOn}</span>
              </p>
              <ul className="divide-y divide-rule overflow-hidden rounded-panel border border-rule bg-soot">
                {mine.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => setOpen(open === t.id ? null : t.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left text-sm sm:grid-cols-[70px_1fr_auto]">
                      <span className="hidden text-concrete sm:block">{fmt(t.due)}</span>
                      <span dir="auto">{t.title}</span>
                      <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${TASK_STATUS[t.status][1]}`}>{TASK_STATUS[t.status][0]}</span>
                    </button>
                    {open === t.id && <TaskDetail t={t} onChange={onChange} />}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TaskDetail({ t, onChange }: { t: Task; onChange: () => void }) {
  const { brand } = useBrand();
  const [output, setOutput] = useState(t.output);
  const [note, setNote] = useState(t.director_note);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async (patch: Partial<Task>) => {
    setBusy(true);
    setErr(null);
    try {
      await updateTask(brand, t, patch);
      onChange();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="space-y-3 border-t border-rule px-4 py-4 text-sm">
      {t.input && (
        <div>
          <p className="text-xs text-concrete">Brief</p>
          <p className="whitespace-pre-wrap" dir="auto">
            {t.input}
          </p>
        </div>
      )}
      <div>
        <label htmlFor={`o-${t.id}`} className="text-xs">
          Result
        </label>
        <textarea id={`o-${t.id}`} dir="auto" rows={4} value={output} onChange={(e) => setOutput(e.target.value)} />
      </div>
      <div>
        <label htmlFor={`n-${t.id}`} className="text-xs">
          Director's note
        </label>
        <input id={`n-${t.id}`} dir="auto" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => save({ output, director_note: note })} busy={busy}>
          Save
        </Button>
        {(Object.keys(TASK_STATUS) as TaskStatus[]).map((s) => (
          <button key={s} disabled={busy} onClick={() => save({ output, director_note: note, status: s })} className={`rounded-full border px-2.5 py-1 text-xs ${t.status === s ? TASK_STATUS[s][1] : "border-rule text-concrete hover:text-plaster"}`}>
            {TASK_STATUS[s][0]}
          </button>
        ))}
      </div>
      {t.versions.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-concrete">{t.versions.length} earlier versions</summary>
          <ul className="mt-2 space-y-2">
            {t.versions.map((v, i) => (
              <li key={i} className="rounded-ctl border border-rule p-2">
                <p className="text-xs text-concrete">
                  {new Date(v.at).toLocaleString("en-GB")} · {v.by}{" "}
                  <button className="ml-2 text-ultra" onClick={() => setOutput(v.output)}>
                    Restore
                  </button>
                </p>
                <p className="mt-1 whitespace-pre-wrap" dir="auto">
                  {v.output}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
      <ErrorNote msg={err} />
    </div>
  );
}


function EditPeriod({ p, onDone }: { p: Period; onDone: () => void }) {
  const { brand } = useBrand();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(p.name);
  const [goal, setGoal] = useState(p.goal);
  const [start, setStart] = useState(p.start);
  const [end, setEnd] = useState(p.end);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!open) return <Button onClick={() => setOpen(true)}>Edit period</Button>;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Edit period">
      <div className="w-full max-w-lg space-y-3 rounded-panel border border-rule bg-ash p-5">
        <h2 className="wide text-lg font-semibold">Edit period</h2>
        <div>
          <label htmlFor="ep-n">Name</label>
          <input id="ep-n" dir="auto" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ep-s">Start</label>
            <input
              id="ep-s"
              type="date"
              value={start}
              onChange={(e) => {
                setEnd(addDays(e.target.value, span(start, end)));
                setStart(e.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="ep-e">End</label>
            <input id="ep-e" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-concrete">Changing the start moves the roadmap phases and every open task by the same number of days.</p>
        <div>
          <label htmlFor="ep-g">Goal</label>
          <textarea id="ep-g" dir="auto" rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
        <ErrorNote msg={err} />
        <div className="flex gap-2">
          <Button
            kind="primary"
            busy={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await movePeriod(brand, p, { name: name.trim(), goal: goal.trim(), start, end });
                setOpen(false);
                onDone();
              } catch (e) {
                setErr((e as Error).message);
              }
              setBusy(false);
            }}
          >
            Save
          </Button>
          <Button kind="quiet" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
