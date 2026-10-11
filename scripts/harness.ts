// Browser self-test for the locked-file protection (run with: npx vite, then open /scripts/harness.html)
import { composite, verifyAgainstBase, restoreProtected, toPNG } from "../src/lib/media";

async function draw(w: number, h: number, fn: (c: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d")!; fn(ctx); return toPNG(c);
}
const out: Record<string, unknown> = {};
(async () => {
  try {
    const logo = await draw(400, 160, (c) => { c.fillStyle = "#d4ff3a"; c.fillRect(10, 10, 380, 140); c.fillStyle = "#111"; c.font = "bold 90px sans-serif"; c.fillText("TMP", 30, 115); c.fillStyle = "#e11"; c.beginPath(); c.arc(340, 80, 40, 0, 7); c.fill(); });
    const scene = await draw(1024, 1536, (c) => { const g = c.createLinearGradient(0, 0, 1024, 1536); g.addColorStop(0, "#223"); g.addColorStop(1, "#a86"); c.fillStyle = g; c.fillRect(0, 0, 1024, 1536); });
    const r = await composite(scene, "4:5", [
      { assetId: "logo", file: logo, position: "bottom-right", widthPct: 20 },
      { assetId: "logo2", file: logo, position: "top-left", widthPct: 37 },
    ]);
    out.composite = { pass: r.pass, checks: r.checks };
    // add text away from logos → pass; over a logo → fail
    const bmp = await createImageBitmap(r.blob);
    const ok = await draw(bmp.width, bmp.height, (c) => { c.drawImage(bmp, 0, 0); c.fillStyle = "rgba(0,0,0,.5)"; c.fillRect(80, 600, 900, 200); c.fillStyle = "#fff"; c.font = "bold 64px sans-serif"; c.fillText("كل حاجة مؤقتة", 120, 720); });
    out.textAway = (await verifyAgainstBase(ok, r.blob, r.placements)).pass;
    const p = r.placements[0];
    const bad = await draw(bmp.width, bmp.height, (c) => { c.drawImage(bmp, 0, 0); c.fillStyle = "#fff"; c.fillRect(p.left + 5, p.top + 5, 60, 30); });
    out.textOverLogo = (await verifyAgainstBase(bad, r.blob, r.placements)).pass;
    // protected regions
    const photo = await draw(800, 1000, (c) => { c.fillStyle = "#ccc"; c.fillRect(0, 0, 800, 1000); c.fillStyle = "#123"; c.fillRect(250, 300, 300, 300); c.fillStyle = "#fa0"; c.font = "60px serif"; c.fillText("ART", 280, 470); });
    const region = { x: 250 / 800, y: 0.3, w: 300 / 800, h: 0.3 };
    const edited = await draw(800, 1000, (c) => { const i = new Image(); c.fillStyle = "#36c"; c.fillRect(0, 0, 800, 1000); c.fillStyle = "#123"; c.globalAlpha = 0.97; c.fillRect(250, 300, 300, 300); c.globalAlpha = 1; c.fillStyle = "#f90"; c.font = "60px serif"; c.fillText("ART", 281, 471); void i; });
    const rr = await restoreProtected(photo, edited, [region]);
    const A = (await createImageBitmap(photo)), B = (await createImageBitmap(rr.blob));
    const ca = document.createElement("canvas"); ca.width = 800; ca.height = 1000; const xa = ca.getContext("2d")!; xa.drawImage(A, 0, 0);
    const cb = document.createElement("canvas"); cb.width = 800; cb.height = 1000; const xb = cb.getContext("2d")!; xb.drawImage(B, 0, 0);
    const da = xa.getImageData(250, 300, 300, 300).data, db = xb.getImageData(250, 300, 300, 300).data;
    let diff = 0; for (let i = 0; i < da.length; i++) if (da[i] !== db[i]) diff++;
    out.restore = { pass: rr.pass, checks: rr.checks, regionDiffPixels: diff };
    const ruined = await draw(800, 1000, (c) => { c.fillStyle = "#ccc"; c.fillRect(0, 0, 800, 1000); c.fillStyle = "#f0f"; c.fillRect(250, 300, 300, 300); });
    out.restoreRuined = (await restoreProtected(photo, ruined, [region])).pass;
    (window as any).__composite = URL.createObjectURL(ok);
  } catch (e) { out.error = String(e); }
  (window as any).__result = out;
})();
