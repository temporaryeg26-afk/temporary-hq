import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_REPO, getSession, repoUrl, signIn, signOut } from "./lib/github";
import { loadBrand, loadBrands, loadProducts, saveBrand, setActiveBrand } from "./lib/data";
import type { Brand, Product } from "./lib/types";
import { Button, ErrorNote } from "./components/ui";
import Overview from "./pages/Overview";
import ResearchPage from "./pages/Research";
import PlanPage from "./pages/Plan";
import ContentPage from "./pages/Content";
import ContentDetail from "./pages/ContentDetail";
import AssetsPage from "./pages/Assets";
import ProductsPage from "./pages/Products";
import BrandsPage from "./pages/Brands";
import SettingsPage from "./pages/Settings";

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

const NAV = [
  ["/", "Overview"],
  ["/research", "Trend Radar"],
  ["/plan", "Plan"],
  ["/content", "Content"],
  ["/assets", "Assets"],
  ["/products", "Products"],
  ["/brands", "Brands"],
  ["/settings", "Settings"],
];

function Shell({ children }: { children: ReactNode }) {
  const route = useRoute();
  const { brand, brands, email, refresh } = useBrand();
  const [open, setOpen] = useState(false);
  const manager = brand.settings?.manager ?? "claude";

  const toggleManager = async () => {
    const next = manager === "claude" ? "chatgpt" : "claude";
    await saveBrand(brand.id, { settings: { ...brand.settings, manager: next } });
    await refresh();
  };

  return (
    <div className="min-h-screen md:grid md:grid-cols-[210px_1fr]">
      <aside className="border-b border-rule md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-5">
          <a href="#/" className="wide text-lg font-bold tracking-wide">
            TEMP. HQ
          </a>
          <button className="text-concrete md:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
            Menu
          </button>
        </div>
        <nav className={`${open ? "block" : "hidden"} px-3 pb-4 md:block`}>
          {NAV.map(([href, label]) => {
            const active = href === "/" ? route === "/" : route.startsWith(href);
            return (
              <a
                key={href}
                href={`#${href}`}
                onClick={() => setOpen(false)}
                className={`block rounded-ctl px-3 py-2 text-sm ${active ? "bg-rule text-plaster" : "text-concrete hover:text-plaster"}`}
              >
                {label}
              </a>
            );
          })}
          <div className="mt-6 px-3 text-xs text-concrete">
            <p className="truncate">@{email}</p>
            <a className="mt-1 block hover:text-plaster" href={repoUrl()} target="_blank" rel="noreferrer">
              Data on GitHub
            </a>
            <button
              className="mt-1 hover:text-plaster"
              onClick={() => {
                signOut();
                window.location.reload();
              }}
            >
              Log out
            </button>
          </div>
        </nav>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-rule px-6 py-3 text-sm">
          {brands.length > 1 ? (
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
          ) : (
            <span className="wide font-semibold">{brand.name}</span>
          )}
          <div className="flex items-center gap-2" aria-label="AI team">
            <Node role="Manager" name={manager === "claude" ? "Claude" : "ChatGPT"} lit={manager === "claude"} />
            <span aria-hidden className="text-rule">—</span>
            <Node role="Writer" name="ChatGPT" />
            <span aria-hidden className="text-rule">—</span>
            <Node role="Visuals" name="Flow · ChatGPT images" />
          </div>
          <label className="mb-0 ml-auto flex cursor-pointer items-center gap-2 text-sm text-plaster">
            <input type="checkbox" checked={manager === "chatgpt"} onChange={toggleManager} />
            Claude at its limit — send manager work to ChatGPT
          </label>
        </div>
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}

function Node({ role, name, lit }: { role: string; name: string; lit?: boolean }) {
  return (
    <span className={`rounded-ctl border px-2 py-1 ${lit ? "border-ultra" : "border-rule"}`}>
      <span className="text-concrete">{role}: </span>
      <span className="text-plaster">{name}</span>
    </span>
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
    const m = route.match(/^\/content\/(.+)$/);
    return m ? ["/content/:id", m[1]] : [route, ""];
  })();

  const page = (() => {
    switch (path) {
      case "/research": return <ResearchPage />;
      case "/plan": return <PlanPage />;
      case "/content": return <ContentPage />;
      case "/content/:id": return <ContentDetail id={id} />;
      case "/assets": return <AssetsPage />;
      case "/products": return <ProductsPage />;
      case "/brands": return <BrandsPage />;
      case "/settings": return <SettingsPage />;
      default: return <Overview />;
    }
  })();

  return (
    <BrandCtx.Provider value={ctx}>
      <Shell>{page}</Shell>
    </BrandCtx.Provider>
  );
}
