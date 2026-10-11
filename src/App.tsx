import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { configured, sb } from "./lib/supabase";
import { loadBrand, loadBrands, loadProducts, setActiveBrand } from "./lib/data";
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
    await sb.from("brands").update({ settings: { ...brand.settings, manager: next } }).eq("id", brand.id);
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
            <p className="truncate">{email}</p>
            <button className="mt-1 hover:text-plaster" onClick={() => sb.auth.signOut()}>
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

// ------------------------------------------------------------------ login (email + 6-digit code)

function Login({ notice }: { notice?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(notice ?? null);

  const send = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.href.split("#")[0] },
    });
    setBusy(false);
    if (error) setErr(/signups not allowed|not found|otp_disabled/i.test(error.message) ? "This email doesn't have access to TEMP. HQ." : error.message);
    else setSent(true);
  };
  const verify = async () => {
    setBusy(true);
    setErr(null);
    const { error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setErr("That code didn't work. Check the latest email, or send a new code.");
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <p className="wide mb-1 text-3xl font-bold">TEMP. HQ</p>
        <p className="mb-8 text-concrete">Private. Team members only.</p>
        {!sent ? (
          <>
            <label htmlFor="em">Your email</label>
            <input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <div className="mt-4">
              <Button kind="primary" onClick={send} busy={busy} disabled={!email.includes("@")}>
                Email me a login code
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm">We sent a code to {email}. Enter it here, or tap the link in the email.</p>
            <label htmlFor="code">Login code</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verify()} />
            <div className="mt-4 flex gap-2">
              <Button kind="primary" onClick={verify} busy={busy} disabled={code.trim().length < 6}>
                Log in
              </Button>
              <Button kind="quiet" onClick={() => setSent(false)}>
                Use another email
              </Button>
            </div>
          </>
        )}
        <ErrorNote msg={err} />
      </div>
    </main>
  );
}

function NotConfigured() {
  return (
    <main className="mx-auto max-w-xl px-4 py-20">
      <p className="wide text-2xl font-bold">TEMP. HQ isn't connected yet</p>
      <p className="mt-3 text-concrete">
        Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> as repository variables on GitHub (Settings → Secrets and variables → Actions → Variables), then re-run the
        “Deploy website” action. SETUP.md step 4 shows exactly where.
      </p>
    </main>
  );
}

// ------------------------------------------------------------------ app

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const route = useRoute();

  useEffect(() => {
    if (!configured) return;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const email = session?.user?.email ?? "";
      const { data: team } = await sb.from("team_members").select("email").limit(1);
      if (!team?.length) {
        await sb.auth.signOut();
        setDenied("This email doesn't have access to TEMP. HQ.");
        return;
      }
      const [brand, brands] = await Promise.all([loadBrand(), loadBrands()]);
      const products = await loadProducts(brand.id);
      setCtx({ brand, brands, products, email, refresh });
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [session]);

  useEffect(() => {
    if (session) refresh();
    else setCtx(null);
  }, [session, refresh]);

  if (!configured) return <NotConfigured />;
  if (session === undefined) return null;
  if (!session) return <Login notice={denied ?? undefined} />;
  if (err)
    return (
      <main className="mx-auto max-w-xl px-4 py-20">
        <ErrorNote msg={err} />
        <Button onClick={refresh}>Try again</Button>
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
