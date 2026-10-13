import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_REPO, getSession, repoUrl, signIn, signOut } from "./lib/github";
import { loadBrand, loadBrands, loadProducts, saveBrand, setActiveBrand } from "./lib/data";
import type { Brand, Product } from "./lib/types";
import { Button, ErrorNote } from "./components/ui";
import Home from "./pages/Home";
import ResearchPage from "./pages/Research";
import ResearchHQ from "./pages/ResearchHQ";
import PeriodPage from "./pages/Period";
import Studio from "./pages/Studio";
import PlaybookPage from "./pages/Playbook";
import RunGuide from "./pages/RunGuide";
import CommunityPage from "./pages/Community";
import { FilmPage, MotionPage } from "./pages/Storyboard";
import PlanPage from "./pages/Plan";
import ContentPage from "./pages/Content";
import ContentDetail from "./pages/ContentDetail";
import AssetsPage from "./pages/Assets";
import ProductsPage from "./pages/Products";
import BrandsPage from "./pages/Brands";
import SettingsPage from "./pages/Settings";
import SessionPage from "./pages/Session";
import DoctrinePage from "./pages/Doctrine";
import WeekPage from "./pages/Week";
import AdsPage from "./pages/Ads";
import OrdersPage from "./pages/Orders";
import PerformancePage from "./pages/Performance";

// ------------------------------------------------------------------ tiny hash router

export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || "/");
  useEffect(() => {
    const on = () => setHash(window.location.hash.slice(1) || "/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}
export const go = (path: string) => (window.location.hash = path);

// ------------------------------------------------------------------ brand context

type Ctx = { brand: Brand; products: Product[]; brands: Brand[]; email: string; refresh: () => Promise<void> };
const BrandCtx = createContext<Ctx | null>(null);
export const useBrand = () => useContext(BrandCtx)!;

type Room = { key: string; label: string; what: string; pages: [string, string][] };

/** The agency: 4 rooms + a small Library. Old routes all still work — they just live inside a room now. */
export const ROOMS: Room[] = [
  { key: "home", label: "Home", what: "", pages: [["/", "Home"]] },
  {
    key: "studio",
    label: "Studio",
    what: "Everything that gets posted: calendar, the Instagram grid, approvals and this week's posting list.",
    pages: [
      ["/calendar", "Calendar"],
      ["/grid", "Grid"],
      ["/approve", "Approvals"],
      ["/week", "This week"],
      ["/content", "All pieces"],
      ["/plan", "Plan"],
    ],
  },
  {
    key: "strategy",
    label: "Strategy",
    what: "Where we are going and what we know: the period roadmap, research, the brand book and trends.",
    pages: [
      ["/period", "Roadmap"],
      ["/research", "Research"],
      ["/doctrine", "Brand book"],
      ["/trends", "Trend radar"],
    ],
  },
  {
    key: "growth",
    label: "Growth",
    what: "Reach and sales: performance & profit, playbooks, media buying, reports, replies to people and order cards.",
    pages: [
      ["/performance", "Performance"],
      ["/playbook", "Playbooks"],
      ["/ads", "Media buying"],
      ["/session", "Reports"],
      ["/community", "Community & sales"],
      ["/orders", "Order cards"],
    ],
  },
];

export const LIBRARY: Room = {
  key: "library",
  label: "Library",
  what: "How the agency runs, your files and settings.",
  pages: [
    ["/run", "Run guide"],
    ["/assets", "Assets"],
    ["/products", "Products"],
    ["/brands", "Brands"],
    ["/settings", "Settings"],
  ],
};

const matches = (route: string, href: string) => (href === "/" ? route === "/" : route === href || route.startsWith(href + "/"));
export function roomOf(route: string): Room {
  if (/^\/(film|motion)\//.test(route)) return ROOMS[1];
  return [...ROOMS, LIBRARY].find((r) => r.pages.some(([h]) => matches(route, h))) ?? ROOMS[0];
}

function Shell({ children }: { children: ReactNode }) {
  const route = useRoute();
  const { brand, brands, email, refresh } = useBrand();
  const room = roomOf(route);
  const manager = brand.settings?.manager ?? "claude";

  const toggleManager = async () => {
    const next = manager === "claude" ? "chatgpt" : "claude";
    await saveBrand(brand.id, { settings: { ...brand.settings, manager: next } });
    await refresh();
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-rule bg-ash/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 md:px-8">
          <a href="#/" className="wide text-lg font-bold tracking-wide">
            TEMP. HQ
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Rooms">
            {ROOMS.map((r) => (
              <a
                key={r.key}
                href={`#${r.pages[0][0]}`}
                className={`rounded-ctl px-3 py-1.5 text-sm ${room.key === r.key ? "bg-rule text-plaster" : "text-concrete hover:text-plaster"}`}
              >
                {r.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {brands.length > 1 && (
              <select
                aria-label="Brand"
                className="w-auto py-1"
                value={brand.id}
                onChange={async (e) => {
                  setActiveBrand(e.target.value);
                  await refresh();
                }}
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <a
              href="#/run"
              title="Library: assets, products, brands, settings"
              className={`rounded-ctl border px-3 py-1.5 ${room.key === "library" ? "border-concrete text-plaster" : "border-rule text-concrete hover:text-plaster"}`}
            >
              Library
            </a>
          </div>
        </div>
        {room.pages.length > 1 && (
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 md:px-8" role="tablist" aria-label={room.label}>
            {room.pages.map(([href, label]) => (
              <a
                key={href}
                href={`#${href}`}
                role="tab"
                aria-selected={matches(route, href)}
                className={`whitespace-nowrap border-b-2 px-3 py-1.5 text-sm ${matches(route, href) ? "border-ultra text-plaster" : "border-transparent text-concrete hover:text-plaster"}`}
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {room.what && <p className="mb-5 text-sm text-concrete">{room.what}</p>}
        {children}
        <footer className="mt-16 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule pt-4 text-xs text-concrete">
          <span>@{email}</span>
          <label className="mb-0 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={manager === "chatgpt"} onChange={toggleManager} />
            Claude at its limit — give the Director's work to ChatGPT
          </label>
          <a className="hover:text-plaster" href={repoUrl()} target="_blank" rel="noreferrer">
            Data on GitHub
          </a>
          <button
            className="hover:text-plaster"
            onClick={() => {
              signOut();
              window.location.reload();
            }}
          >
            Log out
          </button>
        </footer>
      </main>

      {/* phone: rooms at the bottom */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-rule bg-ash md:hidden" aria-label="Rooms">
        {ROOMS.map((r) => (
          <a key={r.key} href={`#${r.pages[0][0]}`} className={`py-3 text-center text-sm ${room.key === r.key ? "text-plaster" : "text-concrete"}`}>
            {r.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

// ------------------------------------------------------------------ login (personal GitHub key)

const TOKEN_URL = "https://github.com/settings/tokens/new?scopes=repo&description=TEMP.%20HQ";

function Login({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signIn(token, repo);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="wide mb-1 text-3xl font-bold">TEMP. HQ</p>
        <p className="mb-8 text-concrete">Private. Team members only.</p>
        <ol className="mb-5 space-y-2 text-sm text-concrete">
          <li>
            1.{" "}
            <a className="text-ultra hover:underline" href={TOKEN_URL} target="_blank" rel="noreferrer">
              Create your GitHub key
            </a>{" "}
            (signed in to your own GitHub account). Set Expiration to 1 year, keep the <b className="text-plaster">repo</b> box ticked, click Generate token.
          </li>
          <li>2. Copy the key (starts with ghp_) and paste it below. You do this once per device.</li>
        </ol>
        <label htmlFor="tk">Your GitHub key</label>
        <input id="tk" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="ghp_..." />
        {more && (
          <div className="mt-3">
            <label htmlFor="rp">Private data repository</label>
            <input id="rp" value={repo} onChange={(e) => setRepo(e.target.value)} />
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button kind="primary" onClick={go} busy={busy} disabled={token.trim().length < 20}>
            Open HQ
          </Button>
          {!more && (
            <button className="text-sm text-concrete hover:text-plaster" onClick={() => setMore(true)}>
              Different data repo?
            </button>
          )}
        </div>
        <ErrorNote msg={err} />
        <p className="mt-6 text-xs text-concrete">Your key stays in this browser only. Only accounts invited to the private data repo can open HQ.</p>
      </div>
    </main>
  );
}

// ------------------------------------------------------------------ app

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const route = useRoute();

  const refresh = useCallback(async () => {
    try {
      const [brand, brands] = await Promise.all([loadBrand(), loadBrands()]);
      const products = await loadProducts(brand.id);
      setCtx({ brand, brands, products, email: getSession()?.login ?? "", refresh });
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (session) refresh();
  }, [session, refresh]);

  if (!session) return <Login onDone={() => setSession(getSession())} />;
  if (err)
    return (
      <main className="mx-auto max-w-xl px-4 py-20">
        <ErrorNote msg={err} />
        <div className="flex gap-2">
          <Button onClick={refresh}>Try again</Button>
          <Button
            kind="quiet"
            onClick={() => {
              signOut();
              setSession(null);
            }}
          >
            Log out
          </Button>
        </div>
      </main>
    );
  if (!ctx) return <p className="p-8 text-concrete">Opening HQ…</p>;

  const [path, id] = (() => {
    const m = route.match(/^\/(content|film|motion)\/(.+)$/);
    return m ? [`/${m[1]}/:id`, m[2]] : [route, ""];
  })();

  const page = (() => {
    switch (path) {
      case "/calendar": return <Studio view="calendar" />;
      case "/grid": return <Studio view="grid" />;
      case "/approve": return <Studio view="approve" />;
      case "/week": return <WeekPage />;
      case "/ads": return <AdsPage />;
      case "/playbook": return <PlaybookPage />;
      case "/performance": return <PerformancePage />;
      case "/run": return <RunGuide />;
      case "/community": return <CommunityPage />;
      case "/orders": return <OrdersPage />;
      case "/session": return <SessionPage />;
      case "/doctrine": return <DoctrinePage />;
      case "/period": return <PeriodPage />;
      case "/period/new": return <PeriodPage isNew />;
      case "/research": return <ResearchHQ />;
      case "/trends": return <ResearchPage />;
      case "/plan": return <PlanPage />;
      case "/content": return <ContentPage />;
      case "/content/:id": return <ContentDetail id={id} />;
      case "/film/:id": return <FilmPage id={id} />;
      case "/motion/:id": return <MotionPage id={id} />;
      case "/assets": return <AssetsPage />;
      case "/products": return <ProductsPage />;
      case "/brands": return <BrandsPage />;
      case "/settings": return <SettingsPage />;
      default: return <Home />;
    }
  })();

  return (
    <BrandCtx.Provider value={ctx}>
      <Shell>{page}</Shell>
    </BrandCtx.Provider>
  );
}
