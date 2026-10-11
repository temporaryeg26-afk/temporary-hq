import { useBrand } from "../App";
import { loadContent, loadResearch } from "../lib/data";
import { loadAssets } from "../lib/assets";
import { list } from "../lib/store";
import type { Activity } from "../lib/types";
import { ErrorNote, Loading, PageHead, Panel, Status, useAsync } from "../components/ui";

export default function Overview() {
  const { brand } = useBrand();
  const { data, error } = useAsync(async () => {
    const [items, assets, research, activity] = await Promise.all([
      loadContent(brand.id),
      loadAssets(brand.id),
      loadResearch(brand.id),
      list<Activity>(brand.id, "activity"),
    ]);
    return { items, assets, research, activity: activity.slice(0, 15) };
  }, [brand.id]);

  if (error) return <ErrorNote msg={error} />;
  if (!data) return <Loading />;

  const count = (s: string) => data.items.filter((i) => i.status === s).length;
  const has = (k: string) => data.assets.some((a) => a.kind === k);
  const lab = data.research.find((r) => r.kind === "lab");
  const labAge = lab ? Math.round((Date.now() - new Date(lab.created_at).getTime()) / 86400000) : null;

  const steps: [boolean, string, string][] = [
    [has("logo"), "Upload the logo", "#/assets"],
    [has("artwork"), "Upload the product artwork", "#/assets"],
    [has("mask"), "Upload the founder mask", "#/assets"],
    [has("product_photo"), "Upload real product photos", "#/assets"],
    [Boolean(brand.order_form_url), "Add the Google Forms order link", "#/brands"],
    [Boolean(lab), "Run the Trend Radar", "#/research"],
    [data.items.length > 0, "Have the manager make the first plan", "#/plan"],
  ];

  // What to do next — the weekly loop
  const next =
    labAge == null || labAge > 7
      ? { text: labAge == null ? "Start with the Trend Radar so the plan is built on what's happening now." : `The trend research is ${labAge} days old. Refresh it.`, href: "#/research", cta: "Open Trend Radar" }
      : data.items.length === 0
      ? { text: "Have the manager make the plan.", href: "#/plan", cta: "Open Plan" }
      : count("brief") > 0
      ? { text: `${count("brief")} pieces are waiting to be written by ChatGPT.`, href: "#/content", cta: "Write the next batch" }
      : count("in_review") > 0
      ? { text: `${count("in_review")} drafts are waiting for the manager's review.`, href: "#/content", cta: "Send for review" }
      : count("needs_you") > 0
      ? { text: `${count("needs_you")} pieces need your approval and visuals.`, href: "#/content", cta: "Open the queue" }
      : { text: "Everything is up to date. Make the next plan when this one runs out.", href: "#/plan", cta: "Open Plan" };

  return (
    <div>
      <PageHead title={brand.name} sub="What the team is doing and what needs you." />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Panel>
          <p className="text-sm text-concrete">Next step</p>
          <p className="wide mt-1 text-xl font-semibold" dir="auto">
            {next.text}
          </p>
          <a href={next.href} className="mt-4 inline-block rounded-ctl bg-ultra px-4 py-2 text-sm font-medium text-white">
            {next.cta}
          </a>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {["brief", "in_review", "needs_you", "approved", "published"].map((s) => (
              <span key={s} className="flex items-center gap-2">
                <Status s={s} /> {count(s)}
              </span>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="wide mb-3 font-semibold">{steps.every((s) => s[0]) ? "Setup complete" : "Set up"}</h2>
          <ul className="space-y-2">
            {steps.map(([done, text, href]) => (
              <li key={text} className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${done ? "bg-moss" : "bg-rule"}`} />
                {done ? <span className="text-concrete line-through">{text}</span> : <a href={href} className="hover:text-ultra">{text}</a>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel className="mt-5">
        <h2 className="wide mb-3 font-semibold">Team log</h2>
        {data.activity.length === 0 && <p className="text-concrete">Nothing yet.</p>}
        <ul className="divide-y divide-rule">
          {data.activity.map((a) => (
            <li key={a.id} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[120px_1fr]">
              <time className="text-concrete">{new Date(a.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
              <span dir="auto" className={a.level === "error" ? "text-brick" : a.level === "warn" ? "text-ochre" : ""}>
                {a.message}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
