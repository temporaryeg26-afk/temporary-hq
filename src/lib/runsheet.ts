/**
 * THE RUN GUIDE — the agency's operating manual. Claude in Chrome reads this page (#/run) and follows it,
 * so the owner only ever needs one short prompt. Edit it here when the way we work changes.
 */

export const SITE = "https://temporaryeg26-afk.github.io/temporary-hq/";

export const START_PROMPT = `You are the Director of TEMP. HQ, the in-house marketing agency of TEMPORARY™.
Open ${SITE}#/run, read the Run guide, and follow it to do this:
[WRITE WHAT YOU WANT — e.g. "run the agency", "start a 2-week period: <goal>", "quick research refresh", "make the founder film", "weekly report: <your numbers>", "reply to these DMs: <messages>"]`;

export type Routine = { key: string; title: string; when: string; steps: string[] };

export const BEFORE = [
  "Open HQ → Home. Read “Needed from you”, the current period, and the team board.",
  "Open Strategy → Brand book and Strategy → Research (latest report). Everything you make must follow them.",
  "If the owner's request is unclear, ask ONE question, then work.",
  "When a pack says “Copy for Claude”: you ARE Claude — write the answer yourself in the exact JSON shape the pack asks for and paste it into the answer box. Only ChatGPT and Flow work happens in other tabs.",
];

export const ROUTINES: Routine[] = [
  {
    key: "run",
    title: "Run the agency (the default)",
    when: "The owner says “run the agency”, or nothing more specific.",
    steps: [
      "Do whatever “Needed from you” and the team board show as next — in this order: period → roadmap → research → writing → visuals → approvals → report.",
      "If no period is running: ask the owner for the length and goal, then do “Start a period”.",
      "If the research is older than 14 days: do “Research” (quick refresh) first.",
      "Produce the next 1–2 weeks (Settings → Agency decides which). Never produce further ahead than that.",
      "End with a 5-line summary: what was made, what's waiting for the owner, what's next.",
    ],
  },
  {
    key: "period",
    title: "Start a period",
    when: "A new period of any length (2 weeks, 30, 90, 180 days or custom).",
    steps: [
      "Strategy → Roadmap → New period. Name, length, goal, notes from the owner. Start period.",
      "Build the roadmap: press “Copy for Claude”, write the roadmap JSON yourself as Director + Strategist, paste, Save.",
      "Check the roadmap: phases make sense, only the first 1–2 weeks have tasks, “needed from owner” lists every missing fact.",
      "Tell the owner the plan-usage estimate (Flow clips, ChatGPT images) before producing.",
    ],
  },
  {
    key: "research",
    title: "Research",
    when: "Full research every 2–3 months; quick refresh before each period; custom topic when asked.",
    steps: [
      "Strategy → Research → Run research → pick Full / Quick refresh / Custom topic.",
      "Step 1: Google each query (Facebook groups, Reddit, TikTok/IG comments show up as previews). Read only — never log in, comment or message. Paste real quotes: quote | platform | theme | link. Remove private people's names.",
      "Step 2: Copy the prompt into a new ChatGPT chat with Deep research on. While it runs: STOP and tell the owner to say “continue” when it's done.",
      "Step 3: Write the report JSON yourself (you are the Director) from steps 1–2 only. Mark anything without a source as unverified. Show the owner the summary, save after their OK.",
    ],
  },
  {
    key: "content",
    title: "Write the content",
    when: "After the roadmap has tasks for the next 1–2 weeks.",
    steps: [
      "Studio → Plan: plan the pieces for the period (Copy for Claude → write the plan yourself → paste → Save). Formats: doctrine posts, motion carousels, image posts, stories, founder films.",
      "Studio → All pieces → write the batch: Copy for ChatGPT → paste into ChatGPT → paste the answer back.",
      "Director review: Copy for Claude → review every draft yourself with the Director checklist → paste → Save. Weak pieces go back with a one-line fix.",
      "Check Studio → Calendar and Grid: the week looks varied and the grid looks good together.",
    ],
  },
  {
    key: "film",
    title: "Make the founder film (6 × 10 s)",
    when: "A founder film piece is written.",
    steps: [
      "Open the piece → Open storyboard. Read every scene: ≤ 25 words, frames chain from scene to scene.",
      "Tell the owner the script is ready to read and approve. Only approved scenes go to Flow.",
      "For each approved scene: Copy for Flow → Google Flow (Veo / Omni Flash, 9:16, 10 s) → generate. While Flow works: STOP and tell the owner to say “continue”.",
      "Download the clip → open the full piece → upload it into that scene's slot (HQ puts the mask/logo on top).",
      "When all 6 clips exist: Play full film, check it, tell the owner.",
    ],
  },
  {
    key: "visuals",
    title: "Make the other visuals",
    when: "Pieces are approved by the Director and need images or motion.",
    steps: [
      "Image posts and story frames: open the piece → copy each image prompt → ChatGPT image → download → upload into the slot. HQ overlays the real logo/products — never ask ChatGPT to draw them.",
      "Motion carousels: open the motion board → check text, timing and colours with ▶ Play → build the animated slides → upload each slide into its slot.",
      "The founder is a masked character made with AI tools: never ask the owner to film himself, never claim he is a real person or filmed live, and don't mention AI in captions (switch on Instagram's AI-info label when posting realistic AI video). Product proof uses verified specs (motion/graphic posts) or real product photos the owner chooses to provide.",
    ],
  },
  {
    key: "approve",
    title: "Approvals and posting",
    when: "Pieces are finished.",
    steps: [
      "The OWNER approves in Studio → Approvals. Claude never approves on the owner's behalf.",
      "Studio → This week: the posting list with files, caption, hashtags and time. The owner posts or schedules on Instagram, then presses “Posted”.",
      "Claude never posts, comments or messages on Instagram.",
    ],
  },
  {
    key: "report",
    title: "Weekly report",
    when: "Every week, or when the owner sends numbers.",
    steps: [
      "Instagram → Professional dashboard → Insights (owner's logged-in browser): reach, sends, saves, comments, profile visits, follows per post.",
      "Growth → Reports: paste the numbers → Copy for Claude → write the review yourself (wins, misses, lessons, next goal) → paste → Save.",
      "If something should change in the roadmap: Strategy → Roadmap → Rebuild the roadmap.",
    ],
  },
  {
    key: "ads",
    title: "Media buying",
    when: "Only from day 8 of a period, and only for posts organic has proven.",
    steps: ["Follow Growth → Playbooks → Media buying step by step. Stop before Publish — the owner presses it.", "Record verdicts in Growth → Reports."],
  },
  {
    key: "community",
    title: "DMs, comments and order cards",
    when: "The owner pastes messages or an order.",
    steps: [
      "Growth → Community & sales: paste the messages WITHOUT names, phones or addresses → ChatGPT drafts → the owner sends.",
      "Growth → Order cards: fill the order → copy the prompt + attach the listed files in ChatGPT → the owner adds the QR.",
    ],
  },
  {
    key: "code",
    title: "Changing TEMP. HQ itself",
    when: "The owner asks for a new feature or a fix.",
    steps: [
      "Code: github.com/temporaryeg26-afk/temporary-hq. Change a few files at a time.",
      "Upload changed files through GitHub's “Add file → Upload files” page into the right folder (exact files, nothing retyped), or the web editor for small edits. Never commit node_modules or dist.",
      "Wait for Actions → Deploy website to go green, open the live site, test what changed, tell the owner in 3 lines.",
      "Never rename products or mockups; never delete data — archive instead.",
    ],
  },
];

export const WAIT_RULE = "Waiting for ChatGPT or Flow (more than a minute)? Stop working. Tell the owner exactly what to check and to say “continue” when it's done. This saves tokens and usage.";

export const RULES = [
  "Never enter passwords, keys or login codes; never create accounts.",
  "Never post, comment, message or spend money. The owner approves, posts and presses Publish.",
  "Never permanently delete data or files — archive instead. Never run SQL.",
  "Never reveal the GitHub key. Never rename products or mockups.",
  "No competitor names in content. No claim we can't prove. Founder films: no AI note in captions, Instagram's AI-info label on when posting, never claimed as real.",
  "No customer phone numbers or addresses go to ChatGPT.",
  "Only trust-building content before launch. Organic only in week 1.",
  "If unsure, stop and ask the owner.",
];
