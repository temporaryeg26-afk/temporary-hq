/**
 * CONTENT METHODS — how the best marketers make content, studied (2 Nov 2026) and turned into TEMPORARY rules.
 * Used by: the Run agency week command, the Creative Director + Growth Analyst, the 5-judge Council,
 * the Content methods page and the methods check on every piece.
 */

export type Method = { who: string; area: string; method: string; steps: string[]; temporary: string; source: string };

export const METHODS: Method[] = [
  {
    who: "Alex Hormozi", area: "Content units & hooks",
    method: "Every piece is a content unit: HOOK → RETAIN → REWARD. Open with proof, promise, plan; keep people with ONE method (a list, steps or a story); pay off exactly what the hook promised. Educate (change what they do), make it 'for you', go narrow, and volume beats perfection.",
    steps: [
      "Spend most of the effort on the hook (frame 1 + caption line 1).",
      "Pick one retention method: list (completion), steps (sequence) or story (what happens next).",
      "The last beat pays off the first line — never a bigger hook than the reward.",
      "Teach something they can use today (fabric check, fit, care) — give the know-how away free.",
      "Ship every day; judge the mechanism over 3+ posts, not one.",
    ],
    temporary: "Every piece names its retention_method; Reels end on the payoff + 23.11; carousels teach a check the viewer can do in a shop.",
    source: "https://margin-notes-site.pages.dev/p/framework/content-unit-hook-retain-reward.html",
  },
  {
    who: "Gary Vaynerchuk", area: "Volume, documenting & community",
    method: "Document, don't create. One pillar → many micro pieces, each native to its platform. Jab, jab, jab, right hook: give value and story first, ask for the sale later. Grow by showing up in the comments of your community every day.",
    steps: [
      "Film what really happens (samples, vendor, packing, website) instead of inventing scenes.",
      "One shoot = a Reel + carousel photos + 3 story frames + a static (repurpose list on every piece).",
      "Make each version native: Instagram Reel, TikTok, YouTube Short, story — each with its own first line.",
      "Before the reveal ~3 jabs : 1 right hook; drop week flips to more right hooks.",
      "20 minutes a day: thoughtful comments on Cairo outfit / streetwear posts + reply to everyone.",
    ],
    temporary: "Nightly BUILDING THE DROP story frame; every piece is tagged jab or right_hook; daily engagement block in Community.",
    source: "https://getgist.com/gary-vee-content-model/",
  },
  {
    who: "Seth Godin", area: "Who it's for",
    method: "Serve the smallest viable audience. 'People like us do things like this.' Say clearly who it is NOT for. Make something remarkable (worth remarking on) — people spread what raises their status.",
    steps: [
      "Write for one person: Cairo, 18–30, would rather own 1 piece nobody has than 5 everybody has.",
      "Use the tension of the in-group: NOT FOR EVERYONE, 200 pieces, never again.",
      "Give them something to say when they share it (a line, a number, a stance).",
    ],
    temporary: "Every piece answers 'who is this for?'; identity posts say NOT FOR EVERYONE; scarcity is always true (200 per design).",
    source: "https://dma.org.uk/article/go-big-by-going-small-finding-your-smallest-viable-audience",
  },
  {
    who: "Neil Patel", area: "Social is search",
    method: "People search on Instagram, TikTok, YouTube and Google. Answer the questions they type, in their words; plan repurposing from the start; make posts skimmable (subtitles, alt text, searchable titles).",
    steps: [
      "Caption line 1 = hook + the words people search (هودي تقيل، براند مصري، ستريت وير، oversized hoodie Egypt).",
      "On-screen text and subtitles on every video (works muted, readable by search).",
      "Build carousels around real questions ('how to know a good hoodie', 'what you pay for').",
    ],
    temporary: "Every piece carries keywords + alt_text; carousels answer questions from Customer pains and DMs.",
    source: "https://entrepreneur.com/growing-a-business/the-social-media-trends-that-will-define-2026/501682",
  },
  {
    who: "Ahrefs", area: "Search intent & keywords",
    method: "Match search intent and prioritise topics with business potential. Find the words people actually use (search-bar suggestions), group them into topic clusters, and own a cluster.",
    steps: [
      "Type the topic into the Instagram / TikTok / Google search bar — copy the suggestions as keywords.",
      "Score topics: does it lead to our product? (high = fabric, fit, hoodie price, limited edition).",
      "Own one cluster at a time (e.g. 'hoodie quality') with a series, not a single post.",
    ],
    temporary: "Since 10 Jul 2025 Google indexes public Instagram business posts — captions, alt text and hashtags count. Indexing toggle must stay ON.",
    source: "https://www.searchengineworld.com/its-live-instagram-posts-are-ranking-and-showing-in-google-and-bing-seo-meets-social",
  },
  {
    who: "HubSpot", area: "Content pillars",
    method: "Pick 3–5 content pillars that serve one goal, turn 10–20 audience questions per pillar into ideas, give every idea 2 formats, rotate pillars across the week, and keep/kill pillars by results.",
    steps: [
      "Our pillars: THE MATERIAL (proof), THE DECISION (why we built it this way), THE LIMIT (200, never again), BUILDING THE DROP (documenting), THE CIRCLE (community).",
      "Never two posts of the same pillar on the same day.",
      "Monthly: compare follows + saves per pillar; double the winner.",
    ],
    temporary: "Every piece names its series/pillar; the week mixes all five.",
    source: "https://consultevo.com/hubspot-social-content-pillars-guide/",
  },
  {
    who: "vidIQ", area: "Outliers & packaging",
    method: "Find outliers — posts that did several times better than that account's normal — from accounts your size, then remake the FORMAT (not the copy) with your own angle. Package first: the idea, the cover and the first line decide the views.",
    steps: [
      "Weekly: find 3 outliers (≥3× their usual views) from Egyptian fashion / lifestyle accounts of similar size; log them in Trend lab with the multiple.",
      "Remake the mechanism with TEMPORARY's angle; note which outlier a piece is based on.",
      "Write the cover text and first line before filming.",
    ],
    temporary: "Trend lab gets an 'outlier ×' field; each piece can name its outlier_source.",
    source: "https://vidiq.com/blog/post/vidiq-outliers-tool/",
  },
  {
    who: "Think Media", area: "Systems & speed",
    method: "Short-form needs a hook in 2–5 seconds and its own format (not a cut-down of something long). Consistency comes from systems: batch filming, templates, a fixed weekly rhythm. Package with topic, title, thumbnail and timing.",
    steps: [
      "One batch shoot covers the week (shoot list in HQ).",
      "Same light, same background, same opening style = recognisable and fast.",
      "Every Reel gets a cover with 3–5 words.",
    ],
    temporary: "Weekly batch shoot from the HQ shoot list; covers with the hook text.",
    source: "https://modcreator-app.vercel.app/2026-05-06-think-media-what-s-actually-working-on-youtube-in-2026-ai-shorts-live-streaming",
  },
  {
    who: "Social Media Examiner", area: "Platform updates",
    method: "Follow platform changes weekly and test new features early (they often get extra reach while new).",
    steps: [
      "Every Sunday meeting: list new Instagram/TikTok features and pick one to test.",
      "Use native features (countdown sticker, Trial Reels, music on carousels, polls) instead of outside tools.",
    ],
    temporary: "The Sunday meeting adds platform updates to Team knowledge; stories always use a native sticker.",
    source: "https://socialbee.com/blog/instagram-updates/",
  },
];

/** Compact version for every prompt (week command, employees, Council). */
export const METHODS_RULE = `CONTENT METHODS (studied from the best — apply on every piece):
- HORMOZI: Hook → Retain → Reward. Proof/promise/plan in the opening; ONE retention method per piece (list | steps | story); the end pays off the first line; teach something usable; volume over perfection.
- GARYVEE: document, don't create (real moments: samples, vendor, packing, website); one shoot → many native pieces (repurpose list); jab, jab, jab, right hook (before the reveal ~3 value/story pieces per 1 ask); 20 min/day of real comments in the community.
- SETH GODIN: write for the smallest viable audience (Cairo 18–30 who want what nobody else has); "people like us"; say who it is NOT for; make it remarkable enough to share.
- NEIL PATEL + AHREFS: social is search — caption line 1 = hook + the words people search (Masri + English), on-screen text/subtitles, alt text on every post; answer real questions; own one topic cluster with a series. Google indexes public Instagram business posts (since 10 Jul 2025).
- HUBSPOT: rotate 5 pillars — THE MATERIAL, THE DECISION, THE LIMIT, BUILDING THE DROP, THE CIRCLE; never two of the same pillar in one day.
- VIDIQ: remake proven outliers (≥3× an account's usual views, accounts our size) as a FORMAT with our angle; package first (cover + first line).
- THINK MEDIA: hook in 2–5 s; short-form is its own format; batch-shoot the week; same light/background/opening = recognisable; cover with 3–5 words.
- SOCIAL MEDIA EXAMINER: test one new native feature a week (stickers, Trial Reels, carousel music).`;

/** Extra fields the week command asks for (kept in the piece's output). */
export const METHODS_SCHEMA = `"keywords": ["3–5 search words people type, Masri + English"], "alt_text": "1–2 sentence description for Instagram alt text (Advanced settings)", "retention_method": "list|steps|story", "intent": "jab|right_hook", "series": "THE MATERIAL|THE DECISION|THE LIMIT|BUILDING THE DROP|THE CIRCLE", "cover_text": "3–5 words on the Reel cover", "repurpose": ["the other pieces cut from the same shoot"], "outlier_source": "the proven format it is based on, or 'ours'", "distribution": "where and how it is posted natively (IG, Trial Reel, TikTok, Shorts, story)", "repeat_reason": "ONLY if it deliberately repeats an already-posted idea to emphasise something important — otherwise leave out"`;

export type MethodCheck = { label: string; ok: boolean; who: string };

/** Soft checklist shown on every piece (never blocks approval). */
export function methodChecks(o: any, format: string): MethodCheck[] {
  if (!o) return [];
  const cap = String(o.caption_ar ?? o.caption ?? "");
  const line1 = cap.split("\n")[0] ?? "";
  const kws: string[] = Array.isArray(o.keywords) ? o.keywords : [];
  const story = format === "story";
  const checks: MethodCheck[] = [
    { who: "Hormozi", label: "Hook written (frame 1 / slide 1)", ok: !!(o.hook || o.chosen_hook) },
    ...(story ? [] : [{ who: "Hormozi", label: "One retention method named (list / steps / story)", ok: /^(list|steps|story)$/i.test(String(o.retention_method ?? "")) }]),
    ...(story ? [] : [{ who: "Neil Patel / Ahrefs", label: "Caption line 1 carries search words", ok: kws.length ? kws.some((k) => line1.toLowerCase().includes(String(k).toLowerCase())) : /(هودي|براند|ستريت|streetwear|hoodie|limited)/i.test(line1) }]),
    ...(story ? [] : [{ who: "Neil Patel / Ahrefs", label: "Alt text ready", ok: !!o.alt_text }]),
    { who: "HubSpot", label: "Pillar / series named", ok: !!(o.series || /^(THE MATERIAL|THE DECISION|THE LIMIT|BUILDING THE DROP|THE CIRCLE)/i.test(String(o.title ?? ""))) },
    { who: "GaryVee", label: "Jab or right hook decided", ok: /^(jab|right_hook)$/i.test(String(o.intent ?? "")) },
    ...(story ? [{ who: "GaryVee", label: "A real 'BUILDING THE DROP' moment in the stories", ok: (o.frames ?? []).some((f: any) => /BUILDING THE DROP/i.test(String(f.text_en ?? f.text ?? ""))) }] : [{ who: "GaryVee / Think Media", label: "Native distribution planned (IG + TikTok + Shorts)", ok: !!o.distribution }]),
    ...(format === "reel" || format === "founder_video" ? [{ who: "Think Media / vidIQ", label: "Cover text (3–5 words)", ok: !!o.cover_text }] : []),
  ];
  return checks;
}

// ------------------------------------------------------------------ PRODUCT VIDEO PLAYBOOK (Fash Studio "Steal Our Prompts", rebuilt 2 Nov 2026)

export type VideoStyle = { n: number; name: string; family: "Movement" | "Camera" | "Reveal" | "Fast-cut" | "Still life"; seconds: string; best: string; prompt: string };

/** 19 shot styles. [PRODUCT] [MODEL] [STYLING] [COLOUR] [PROP] are placeholders. */
export const VIDEO_STYLES: VideoStyle[] = [
  { n: 1, name: "Golden Hour Wall", family: "Reveal", seconds: "6", best: "Jackets, knitwear, autumn drops, moody brand posts", prompt: "[MODEL] wearing [PRODUCT] with [STYLING] walks slowly past a warm golden-hour light beam on a plain wall, then leans back against a sunlit brick wall and glances at the camera. Long shadows, warm orange light, cinematic film look, 9:16." },
  { n: 2, name: "Outfit Check", family: "Fast-cut", seconds: "7.5", best: "Reels/TikTok fit checks, full looks", prompt: "Fast-cut outfit check of [MODEL] wearing [PRODUCT] with [STYLING] in front of an old carved wooden door. Shot 1 full body; shot 2 close-up of [PRODUCT] fabric and details; shot 3 close-up of accessories; shot 4 face, confident look; shot 5 model turns to show the back. Natural daylight, handheld feel, 9:16." },
  { n: 3, name: "Runway Walk", family: "Movement", seconds: "8", best: "E-commerce: fit and drape in motion", prompt: "[MODEL] wearing [PRODUCT] walks confidently straight toward the camera like on a runway, plain white studio wall and grey floor, even soft lighting, camera static at waist height, full body in frame, 9:16." },
  { n: 4, name: "Minimal Motion", family: "Still life", seconds: "10", best: "Product pages: a living photo", prompt: "[MODEL] wearing [PRODUCT] stands still in front of a softly draped [COLOUR] fabric backdrop, hands in pockets. Only subtle motion: breathing, a slight weight shift, a small head tilt, fabric moving gently. Static camera, studio light, 9:16." },
  { n: 5, name: "Walk Right", family: "Movement", seconds: "5", best: "Menswear, basics, side silhouette", prompt: "[MODEL] wearing [PRODUCT] walks from left to right through a modern concrete building with large windows. Camera tracks alongside at the same speed, full body side view, natural daylight, 9:16." },
  { n: 6, name: "The Approach", family: "Movement", seconds: "6", best: "Outerwear and tops where the front detail matters", prompt: "[MODEL] wearing [PRODUCT] walks slowly toward the camera on a clean white background, starting full body and ending in a chest-up close-up that shows the fabric and details. Serious expression, soft studio light, 9:16." },
  { n: 7, name: "Smile & Pose", family: "Reveal", seconds: "6", best: "Lifestyle posts, warm brands", prompt: "[MODEL] wearing [PRODUCT] with [STYLING] stands on a city rooftop at sunset with the skyline behind, starts in profile, turns to the camera, smiles and puts a hand on the hip to show the outfit. Warm light, static camera, 9:16." },
  { n: 8, name: "Arc Right", family: "Camera", seconds: "5", best: "3D view of a jacket/hoodie, street style", prompt: "Slow camera orbit to the right around [MODEL] wearing [PRODUCT], standing still on a tree-lined city street. The model looks off-camera. Overcast daylight, shallow depth of field, 9:16." },
  { n: 9, name: "Effortless Flip", family: "Reveal", seconds: "5", best: "Tops; attention in the first second", prompt: "Close-up of [MODEL] flipping their hair, then the camera pulls back smoothly to a full-body shot showing [PRODUCT] with [STYLING]. Plain grey studio background, soft light, 9:16." },
  { n: 10, name: "Shoulder Sequence", family: "Fast-cut", seconds: "9", best: "Products with one key detail", prompt: "Sequence of [MODEL] wearing [PRODUCT] on a warm brown studio backdrop: full-body pose, a slow push to the shoulder and neckline, a tight close-up of the fabric texture, then a new full-body pose showing the silhouette. Editorial lighting, 9:16." },
  { n: 11, name: "Outfit Reveal", family: "Reveal", seconds: "9", best: "Launches, the reveal", prompt: "Opens in darkness, then light sweeps in to reveal [MODEL] wearing [PRODUCT] against a deep backdrop. Alternate between close-up and full-body poses, with a light-trail transition. High-contrast lighting, 9:16." },
  { n: 12, name: "Face Rush", family: "Camera", seconds: "6", best: "Bold campaign hero clips, ads", prompt: "Wide shot of [MODEL] wearing [PRODUCT] standing in an open landscape under a bright sky, then the camera rushes quickly in to a close-up of the face, then cuts to a view of the back as wind moves the fabric. Bright sun, vivid colours, 9:16." },
  { n: 13, name: "Doberman Gaze", family: "Still life", seconds: "5", best: "Bold artistic brand image, colour blocking", prompt: "[MODEL] wearing [PRODUCT] stands completely still in front of a large flat [COLOUR] wall under a clear sky, staring straight into the camera. Only the fabric and hair move slightly in the wind. Strong colour blocking, graphic composition, 9:16." },
  { n: 14, name: "Walk Left", family: "Movement", seconds: "5", best: "Street style, on-the-go looks", prompt: "[MODEL] wearing [PRODUCT] with [STYLING] walks from right to left across a busy city crosswalk between classic stone buildings. Camera tracks with them, full body, natural daylight, 9:16." },
  { n: 15, name: "Head-to-Toe Shot", family: "Camera", seconds: "5", best: "Full-look reveals, trousers, shoes", prompt: "Camera starts low on the shoes and [PRODUCT], then tilts slowly up to reveal [MODEL]'s full outfit and face. Elegant indoor arcade with a mosaic floor and warm lights, 9:16." },
  { n: 16, name: "Step Back", family: "Movement", seconds: "6.5", best: "Menswear, relaxed attitude", prompt: "[MODEL] wearing [PRODUCT] with [STYLING] stands close to the camera, then takes a few relaxed steps backward, going from medium shot to full body. Bright midday sun, clear sky, 9:16." },
  { n: 17, name: "Arc Left", family: "Camera", seconds: "7", best: "Accessories, conceptual posts", prompt: "Slow camera orbit to the left around [MODEL] wearing [PRODUCT], standing still in front of a surreal landscape under a soft teal sky. Conceptual styling, muted colours, 9:16." },
  { n: 18, name: "Studio Pose", family: "Still life", seconds: "8", best: "Product page, catalogue", prompt: "[MODEL] wearing [PRODUCT] with [STYLING] on a seamless white studio background, changing between three relaxed poses: hands in pockets, a slight turn, a look at the camera. Static camera, even soft light, full body, 9:16." },
  { n: 19, name: "Turn Around", family: "Reveal", seconds: "5", best: "Anything with a back design", prompt: "[MODEL] wearing [PRODUCT] stands next to a [PROP] in a large sunlit industrial warehouse, then turns slowly all the way around to show the back of the outfit. Natural light from high windows, cinematic, 9:16." },
];

export const VIDEO_PLACEMENT: [string, string, string][] = [
  ["Product page (website)", "Studio Pose, Runway Walk, Minimal Motion, Turn Around", "Fit, front and back, no distractions"],
  ["Reels / TikTok", "Outfit Check, Effortless Flip, Face Rush", "Movement in the first second stops the scroll"],
  ["Paid ads", "Face Rush, The Approach, Outfit Reveal", "One strong hook, product big in frame"],
  ["Brand mood / feed", "Golden Hour Wall, Doberman Gaze, Arc Left", "A recognisable look"],
  ["One detail", "Shoulder Sequence, Head-to-Toe Shot, The Approach", "Camera goes to the detail that sells"],
  ["Menswear / basics", "Walk Right, Step Back, Runway Walk", "Simple movement, natural attitude"],
  ["Accessories", "Arc Left, Arc Right, Doberman Gaze", "Camera moves around a still pose"],
];

export const VIDEO_WEEK = [
  "Day 1: Outfit Reveal or Face Rush — launch hook for Reels/TikTok",
  "Day 2: Studio Pose + Turn Around — product page and stories",
  "Day 3: Outfit Check — full styled look",
  "Day 4: Shoulder Sequence or Head-to-Toe — the key detail",
  "Day 5: Golden Hour Wall — mood post",
  "Day 6: Walk Left / Walk Right — street style",
  "Day 7: best performer of days 1–6 re-cut as the paid ad",
];

export const VIDEO_RULE = `PRODUCT VIDEO PLAYBOOK (19 shot styles in 5 families — Movement: Runway Walk, Walk Right, Walk Left, The Approach, Step Back · Camera: Arc Right, Arc Left, Head-to-Toe, Face Rush · Reveal: Smile & Pose, Effortless Flip, Turn Around, Outfit Reveal, Golden Hour Wall · Fast-cut: Outfit Check, Shoulder Sequence · Still life: Minimal Motion, Studio Pose, Doberman Gaze). Format: 9:16, 5–10 s, works silent and loops, one model, one outfit, ONE action + ONE camera move per clip.
- Pick by placement: website → Studio Pose / Runway Walk / Minimal Motion / Turn Around; Reels/TikTok → Outfit Check / Effortless Flip / Face Rush; ads → Face Rush / The Approach / Outfit Reveal; mood → Golden Hour Wall / Doberman Gaze; one detail → Shoulder Sequence / Head-to-Toe / The Approach.
- TEMPORARY: our designs live on the BACK and FRONT of the piece → Turn Around and The Approach are the reveal shots (23 Nov); Outfit Reveal (dark → light) is the reveal-day hero. Before 23 Nov only detail/close-up styles with the print hidden.
- DOCTRINE: products are REAL footage. Use these styles as camera directions for real filming (name the style in "video_style"). AI-generated product video (from a product photo) only if the founder explicitly allows it for that piece — then: clean well-lit product photo, lock the still first, then animate; check print, logo and fabric frame by frame; AI label on; never in captions.`;
