/**
 * PLAYBOOKS — how the agency grows the account. Written as steps you can read and Claude in Chrome can follow.
 * Organic first. Paid only after week 1, and only to push posts organic has already proven.
 * Numbers marked "≈" are planning estimates — the weekly report replaces them with your real numbers.
 */

export type Who = "YOU" | "CLAUDE IN CHROME";
export type Step = { who: Who; title: string; how: string[]; done_when?: string };
export type Rule = { if: string; then: string };

export const ORGANIC = {
  why: "With 0 followers, Instagram shows new posts to non-followers first. What decides reach: people SENDING the post to a friend, watching to the end and re-watching, and the first 1–3 seconds. Hashtags matter little; captions work like search.",
  hooks: [
    "Open with the question the buyer is already asking: «الهودي ده بـ 1,500… طب انت دافع في إيه؟»",
    "Show the problem in the first frame (a cracked print, a see-through shirt, a size label that lies) — no logo intro.",
    "Number it: «5 حاجات اسألها قبل ما تدفع» — numbered lists get saved and sent.",
    "Say it like a friend, not an ad: Egyptian Arabic, short, direct.",
  ],
  caption: [
    "Line 1 = the hook (it's all people see before “more”).",
    "Lines 2–4 = the useful part (the checklist, the fact, the proof).",
    "End with one ask that creates SENDS: «ابعتها لصاحبك اللي لسه دافع 1,500 في تيشيرت».",
    "Write the words people search: تيشيرت، هودي، براند مصري، جودة، قماش، مقاسات.",
    "Founder film? No AI note in the caption — switch on Instagram's 'AI info' label in the post settings instead.",
  ],
  hashtags: "3–5 niche tags, the same core set each time: #براند_مصري #ستريت_وير #اعرف_قبل_ما_تدفع + 1–2 topic tags. No giant generic tags.",
  times: [
    ["Reels / founder film", "20:00–22:00"],
    ["Carousels / motion carousels", "13:00–15:00 or 20:00"],
    ["Image posts", "18:00–19:00"],
    ["Stories", "every day, 3–5 frames, 21:00–23:00"],
    ["Ramadan", "after iftar, 21:00–01:00"],
  ] as [string, string][],
  routine: [
    "First 60 minutes after posting: reply to every comment (a question back keeps the thread going).",
    "Pin a comment that starts a debate or asks people to tag a friend.",
    "Share the post to Stories with a poll or question sticker.",
    "Daily Stories: 1 poll (e.g. «حصلك قبل كده الطباعة باظت؟»), 1 behind-the-scenes, 1 reply to a DM question (no names).",
    "Never buy followers, never use engagement pods, never repost others' content as ours (reposts are removed from recommendations).",
  ],
  week1: "Week 1 is organic only: no ads. We let the algorithm show us which post people send and save, then we push that one.",
};

export const PAID_UNLOCK_DAYS = 7;

export const PAID_STEPS: Step[] = [
  {
    who: "YOU",
    title: "One-time setup (5 minutes)",
    how: [
      "Instagram → Settings → Account type: switch to a Professional (Creator/Business) account if not already.",
      "Open business.facebook.com → connect the Instagram account → Billing: add your payment method.",
      "Claude never enters passwords or card details — this step is yours.",
    ],
    done_when: "Ads Manager opens with the TEMPORARY Instagram account connected.",
  },
  {
    who: "CLAUDE IN CHROME",
    title: "Pull the last 7 days of numbers",
    how: [
      "Instagram → Professional dashboard → Insights → Content you shared → last 7 days.",
      "For every post copy: reach, sends (shares), saves, comments, profile visits, follows, average watch time.",
      "Paste them into Growth → Reports.",
    ],
    done_when: "This week's numbers are in Reports.",
  },
  {
    who: "CLAUDE IN CHROME",
    title: "Pick the post to push",
    how: [
      "Score = (sends + saves) ÷ reach. The highest score wins — not the most likes.",
      "Only trust-building posts (doctrine, checklist, founder film). No product ads before launch.",
      "If no post reached 2% (sends + saves ÷ reach), don't spend: make better organic content first.",
    ],
    done_when: "One winning post is written in Reports with its score.",
  },
  {
    who: "CLAUDE IN CHROME",
    title: "Prepare the ad — stop before Publish",
    how: [
      "Ads Manager → Create → Objective: Engagement (goal: Instagram profile visits) — or Awareness for a founder film.",
      "Use existing post: choose the winning Instagram post (keeps its likes and comments).",
      "Location: Cairo + Giza (+25 km) and Alexandria. Age 18–30. Language: Arabic + English.",
      "Audience: start broad (Advantage+ audience on) — the post itself finds the right people. Exclude people who already follow the account.",
      "Placements: Instagram only — Feed, Reels, Stories, Explore.",
      "Budget: EGP 250–500 a day for 3 days (≈ EGP 750–1,500 per test). At a Meta Egypt CPM of ≈$2.90 and ≈ EGP 50 per $, that buys roughly 5,000–10,000 impressions per test (estimate — the first test gives us the real number).",
      "If the creative is realistic AI video (the founder films), switch on Meta's AI label in the ad settings — required for ads.",
      "Fill everything, then STOP. Show the summary to the owner.",
    ],
    done_when: "Everything is filled and the summary is shown — Publish not pressed.",
  },
  {
    who: "YOU",
    title: "Check the summary and press Publish",
    how: ["Read the budget, dates, audience and the post. If it's right, press Publish. This is the only step that spends money."],
    done_when: "The ad is in review / active.",
  },
  {
    who: "CLAUDE IN CHROME",
    title: "Check after 48 hours",
    how: ["Ads Manager → the campaign → cost per profile visit, cost per follow, CPM, frequency.", "Apply the rules below and write the verdict in Reports."],
    done_when: "Verdict (cut / keep / scale / fix) is in Reports.",
  },
  {
    who: "CLAUDE IN CHROME",
    title: "From week 3: retarget the people who care",
    how: [
      "Audiences → Custom audience → Instagram account: people who engaged in the last 30 days; Video: people who watched 50%+ of the founder film.",
      "Show them the next trust post (proof, wash test, founder film #2) — not a sales ad before launch.",
      "At launch: retarget these audiences with the drop announcement.",
    ],
  },
];

export const PAID_RULES: Rule[] = [
  { if: "After 48 h, cost per follow is more than 2× the cheapest test so far", then: "CUT — stop it, try the next best organic post." },
  { if: "Cost per follow is around the best so far and frequency is under 2", then: "KEEP — let it run to the end of the test." },
  { if: "Cost per follow is the best so far and comments are positive", then: "SCALE — raise the budget by 20% every 48 h (never double at once)." },
  { if: "Lots of reach but few profile visits", then: "FIX — the hook works but the post doesn't make people curious; change the first frame or the caption, re-test." },
  { if: "Negative comments about price or quality", then: "Answer every one honestly within the hour. Pause if it turns into a pile-on and tell the owner." },
];

export const NEVER = [
  "Never spend before week 1 of organic is done.",
  "Never run product ads before launch — we sell trust first.",
  "Never make claims in an ad that we can't show (fabric weight, wash tests, limited numbers).",
  "Never use fake testimonials or fake 'was' prices.",
  "Never target by competitor brand names.",
  "Claude never presses Publish, never enters payment details.",
];
