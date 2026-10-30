import { useState } from "react";
import { useBrand } from "../App";
import { Button, ErrorNote, PageHead, Panel, useAsync } from "../components/ui";
import { addWeekly, loadSnapshot, WeeklyEntry } from "../lib/agencyos";

const monday = () => { const d = new Date(); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.toISOString().slice(0, 10); };
const FIELDS: [keyof WeeklyEntry, string, string][] = [
  ["followers", "Followers (total)", "Instagram profile"],
  ["views", "Views (7 days)", "Insights → Views"],
  ["profile_visits", "Profile visits", "Insights → Profile"],
  ["link_clicks", "Link taps", "Insights → Profile → External link taps"],
  ["saves", "Saves", "sum of the week's posts"],
  ["shares", "Shares / sends", "sum of the week's posts"],
  ["new_follows", "New follows", "Insights → Followers"],
  ["founder_dms", "FOUNDER comments / DMs", "count them"],
  ["site_visits", "Website visitors", "Admin → dashboard"],
  ["add_to_bag", "Add to bag", "Admin → analytics"],
  ["orders", "Orders", "Admin → orders"],
  ["pieces", "Pieces sold", "Admin → orders"],
  ["ad_spend", "Ad spend (EGP)", "Ads Manager"],
];

/** Weekly numbers: one row per week. The weekly Chrome check-in fills this for you; you can also type it. */
export default function GrowthWeek() {
  const { brand, products } = useBrand();
  const snap = useAsync(() => loadSnapshot(brand, products), [brand.id]);
  const [f, setF] = useState<Record<string, string>>({ week_of: monday() });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const weeks = snap.data?.weekly ?? [];

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const n = (k: string) => Math.max(0, Number(f[k]) || 0);
      await addWeekly(brand.id, { week_of: f.week_of, followers: n("followers"), views: n("views"), profile_visits: n("profile_visits"), link_clicks: n("link_clicks"), saves: n("saves"), shares: n("shares"), new_follows: n("new_follows"), founder_dms: n("founder_dms"), site_visits: n("site_visits"), add_to_bag: n("add_to_bag"), orders: n("orders"), pieces: n("pieces"), ad_spend: n("ad_spend"), notes: (f.notes ?? "").trim() });
      setF({ week_of: monday() });
      await snap.reload();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <div>
      <PageHead title="Weekly numbers" sub="One row per week. The weekly Chrome check-in fills it for you; you can also type it here. Every employee uses these numbers." />
      <Panel className="mb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm"><span className="text-xs text-concrete">Week of (Monday)</span><input type="date" value={f.week_of} onChange={(e) => setF({ ...f, week_of: e.target.value })} className="mt-1 w-full" /></label>
          {FIELDS.map(([k, label, hint]) => (
            <label key={k} className="block text-sm"><span className="text-xs text-concrete">{label} · <i>{hint}</i></span><input type="number" min={0} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="mt-1 w-full" /></label>
          ))}
          <label className="block text-sm sm:col-span-3"><span className="text-xs text-concrete">Notes</span><input value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} className="mt-1 w-full" /></label>
        </div>
        <div className="mt-3"><Button kind="primary" busy={busy} onClick={save}>Save week</Button></div>
        <ErrorNote msg={err} />
      </Panel>
      <div className="overflow-x-auto rounded-panel border border-rule">
        <table className="w-full text-sm">
          <thead className="bg-soot text-left text-xs text-concrete"><tr><th className="p-2">Week</th>{FIELDS.map(([k, l]) => <th key={k} className="p-2">{l.replace(/ \(.*\)/, "")}</th>)}</tr></thead>
          <tbody>{weeks.map((w) => <tr key={w.id} className="border-t border-rule"><td className="whitespace-nowrap p-2">{w.week_of}</td>{FIELDS.map(([k]) => <td key={k} className="p-2">{Number(w[k]).toLocaleString()}</td>)}</tr>)}</tbody>
        </table>
        {!weeks.length && <p className="p-4 text-sm text-concrete">No weeks yet.</p>}
      </div>
    </div>
  );
}
