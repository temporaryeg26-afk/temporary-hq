/**
 * Creation prompts — HQ writes them, you paste them into Claude / ChatGPT / Flow and make the asset.
 * Every prompt carries the brand look and rules so each tool gets the full brief in one paste.
 */
import type { ContentItem } from "./types";

const LOOK = `TEMPORARY™ look: premium limited-edition Egyptian streetwear. Black / bone (#ECE8E1) / chrome; one accent only (pink #D4567F for things we cross out, lime #B5E61D for data). Cinematic, minimal, expensive. No clutter, no stock-photo feel.`;
const RULES = `Rules: no prices, no discounts, no invented claims, no competitor names or logos. Never put any logo except leave the bottom-right corner clean for our real logo. The masked Founder is a character made with AI tools — never present him as real or filmed live.`;

const slidesText = (o: any) =>
  (o.slides ?? []).map((s: any, i: number) => `Slide ${i + 1} (${s.seconds ?? 5}s)\n  AR: ${s.copy ?? ""}\n  EN: ${s.copy_en ?? ""}${s.visual ? `\n  Visual idea: ${s.visual}` : ""}`).join("\n");
const framesText = (o: any) =>
  (o.frames ?? []).map((f: any, i: number) => `Frame ${i + 1}\n  AR: ${f.text ?? ""}\n  EN: ${f.text_en ?? ""}\n  Sticker: ${f.sticker ?? "none"}`).join("\n");
const scenesText = (o: any) =>
  (o.scenes ?? []).map((s: any, i: number) => `Scene ${i + 1} (${s.seconds ?? 2}s): ${s.visual ?? ""}\n  On screen AR: ${s.on_screen_text ?? ""}\n  On screen EN: ${s.on_screen_en ?? ""}`).join("\n");

export type ToolPrompt = { tool: "Claude" | "ChatGPT" | "Flow"; label: string; text: string; url: string };

export function promptsFor(item: ContentItem): ToolPrompt[] {
  const o = item.output ?? {};
  const hook = `Hook (first frame, must stop the scroll in <1s): ${o.hook ?? o.chosen_hook ?? ""}${o.hook_en ? ` / ${o.hook_en}` : ""}`;
  const out: ToolPrompt[] = [];

  if (item.format === "motion_carousel" || item.format === "carousel") {
    out.push({
      tool: "Claude",
      label: "Motion carousel → Claude",
      url: "https://claude.ai/new",
      text: `Make an Instagram MOTION-GRAPHIC CAROUSEL for TEMPORARY™ — each slide its own MP4, 1080×1350 (4:5), with original music (one track; each slide continues the next chord so swiping sounds like one piece). Attached: our Founder PNG (use on cover + last slide) and logo.

${hook}

${slidesText(o)}

Direction:
- Pick a FRESH motion style for this carousel (not the same as last time): e.g. kinetic typography, mask/liquid-chrome reveals, 3D parallax of the Founder cut-out, seamless panorama across slides, phone-UI scenes (DM, comments, poll), receipt / barcode / tag / measuring props that ACT OUT each slide's point.
- Every slide: headline visible from frame 1, one new idea, a visual that acts it out, a reason to swipe. Last slide: payoff + "احفظ البوست / ابعتها لصاحبك".
- *word* = chrome accent, ~word~ = pink + crossed out live. Arabic right-to-left, natural Egyptian Masri; English line under it.
- ${LOOK}
- ${RULES}
Export: TEMPORARY_${item.scheduled_for}_01.mp4 … one per slide.`,
    });
  }

  if (item.format === "reel" || item.format === "founder_video") {
    out.push({
      tool: "Flow",
      label: "Reel video → Flow (Veo)",
      url: "https://labs.google/fx/tools/flow",
      text: `${o.video_prompt ?? ""}

Vertical 9:16, 8–10 seconds, cinematic, premium streetwear. ${LOOK}
Scenes:
${scenesText(o)}
No text, no logos in the video (we add text after). ${RULES}`,
    });
    out.push({
      tool: "Claude",
      label: "Reel edit (text + music) → Claude",
      url: "https://claude.ai/new",
      text: `Make an Instagram REEL for TEMPORARY™: 9:16, 1080×1920, 8–12s, with original music and kinetic Arabic + English text. If I attach a Flow clip, use it as the background; otherwise build it as motion graphics with the attached Founder PNG.

${hook}

${scenesText(o)}

- Something must happen in the first 0.5s. Cut on the beat. End on the payoff + "تابع" / "ابعتها لصاحبك".
- ${LOOK}
- ${RULES}
Export: TEMPORARY_${item.scheduled_for}_reel.mp4`,
    });
  }

  if (item.format === "story") {
    out.push({
      tool: "Claude",
      label: "Animated story frames → Claude",
      url: "https://claude.ai/new",
      text: `Make ${(o.frames ?? []).length || 3} animated Instagram STORY frames for TEMPORARY™ — each its own MP4, 1080×1920 (9:16), 5–7s, with music. Leave room (top-middle or lower third) for the Instagram sticker I add myself.

${framesText(o)}

- Frame 1 must stop the tap-through. Arabic right-to-left Masri + English line.
- ${LOOK}
- ${RULES}
Export: TEMPORARY_${item.scheduled_for}_story_01.mp4 …`,
    });
    out.push({
      tool: "ChatGPT",
      label: "Story stills → ChatGPT",
      url: "https://chatgpt.com/",
      text: `Create ${(o.frames ?? []).length || 3} images, one per Instagram story frame, vertical 9:16 (1080×1920), for TEMPORARY™. Render the Arabic text exactly (right-to-left, letters connected) and the English line under it. Keep space for an Instagram sticker in the lower third.

${framesText(o)}

${LOOK}
${RULES}`,
    });
  }

  if (item.format === "static") {
    out.push({
      tool: "ChatGPT",
      label: "Static post image → ChatGPT",
      url: "https://chatgpt.com/",
      text: `Create an image. Luxury Instagram post for TEMPORARY™, vertical 4:5 (1080×1350).

${o.image_prompt ?? ""}

TEXT — render EXACTLY, nothing else:
1) Arabic headline, right-to-left, letters properly connected, bold modern Arabic sans-serif: «${o.headline ?? o.hook ?? ""}»
2) Under it, small elegant italic serif: «${o.headline_en ?? o.hook_en ?? ""}»

${LOOK}
${RULES}
Keep the bottom-right corner (220×220 px) completely empty and plain for our logo.`,
    });
  }

  return out;
}
