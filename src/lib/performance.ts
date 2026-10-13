/**
 * PERFORMANCE — the paid-growth + profit system for TEMPORARY™ (from the owner's master brief).
 * Facts marked [source] were checked Oct 2026; everything marked HYPOTHETICAL is a planning example, not a forecast.
 * Supplier costs are INTERNAL. Never put them, margins or prices in content.
 */

export type Src = { label: string; url: string };
export const SOURCES: Record<string, Src> = {
  datareportal: { label: "DataReportal, Digital 2026 Egypt", url: "https://datareportal.com/reports/digital-2026-egypt" },
  napoleoncat: { label: "NapoleonCat, Instagram users in Egypt (Sep 2026)", url: "https://napoleoncat.com/stats/instagram-users-in-egypt/" },
  pwc: { label: "PwC Voice of the Consumer 2024 — Egypt", url: "https://www.pwc.com/m1/en/publications/voice-of-the-consumer-2024-survey-egypt-findings.html" },
  paymob: { label: "Paymob pricing", url: "https://paymob.com/en/pricing" },
  adamigo: { label: "AdAmigo 2026 CPM/CPC by country (vendor estimate)", url: "https://www.adamigo.ai/blog/meta-ads-cpm-cpc-benchmarks-by-country-2026" },
  ppro: { label: "PPRO Egypt payments (2022)", url: "https://www.ppro.com/?p=7967" },
  redseer: { label: "RedSeer — MENA Ramadan fashion", url: "https://redseer.com/articles/mena-gearing-up-for-ramadan-fashion-insights/" },
  meta_lal: { label: "Meta — Lookalike audiences (min. 100 source people)", url: "https://developers.facebook.com/documentation/ads-commerce/marketing-api/audiences/guides/lookalike-audiences" },
  meta_ai: { label: "Meta — AI labels in ads", url: "https://about.fb.com/news/2025/02/gen-ai-transparency-metas-ads-products/" },
  capi: { label: "Meta Conversions API", url: "https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api" },
  auc: { label: "AUC thesis — Franco/English among young Egyptians (2025)", url: "https://fount.aucegypt.edu/etds/2395/" },
};

export const SUMMARY = [
  "We are a new premium brand with ~0 audience. The first job is TRUST, then DEMAND, then ORDERS — in that order. Paid ads amplify what organic has already proven; they don't replace it.",
  "One simple structure: organic content every day + ONE prospecting campaign (boost the best trust post) from week 2 + ONE retargeting campaign once the warm audience passes ~1,000 people. No separate campaign per funnel stage until we have data.",
  "We judge everything on money that reaches the bank: completed (delivered, not returned) orders × contribution margin − ad spend. Likes, followers and platform ROAS are signals, not results.",
  "No discounts. We sell with proof (fabric, print, construction), scarcity that is real (200 pieces, no restock of the same edition) and belonging (FOUNDER / FOUNDER ELITE).",
  "The #1 blocker: the real unit cost per product. The selling prices and the 'supplier cost' list are the same numbers — if that's true, every sale loses money. Fill the costs in the calculator below before we spend on conversion ads.",
];

export const VERIFIED = [
  { fact: "Instagram ad reach in Egypt: 21.7M (28.4% of adults 18+), 53% male / 46% female.", src: "datareportal" },
  { fact: "≈71% of Instagram users in Egypt are 18–34 (estimate, third-party).", src: "napoleoncat" },
  { fact: "90% of Egyptian shoppers look for reviews on social media before buying; 90% say social ads influence purchases; better sizing info would reduce returns.", src: "pwc" },
  { fact: "Paymob: 2.75% + EGP 3 per successful transaction.", src: "paymob" },
  { fact: "Cash is still the biggest e-commerce payment method in Egypt (57% in 2022 data — dated).", src: "ppro" },
  { fact: "Egyptians buy clothes mostly the month BEFORE Ramadan and during it (earlier than the Gulf). Ramadan 2027 ≈ 8 Feb.", src: "redseer" },
  { fact: "Lookalike audiences need at least 100 people from one country in the source.", src: "meta_lal" },
  { fact: "Meta labels ads that show AI-generated photorealistic people.", src: "meta_ai" },
  { fact: "Young educated Cairenes mix English/Franco online; government-school graduates prefer Egyptian Arabic → use both.", src: "auc" },
];

export const ASSUMPTIONS = [
  "CPM ≈ $2.30–3.80 (≈ EGP 115–190 at ~EGP 50/$) — a vendor estimate, NOT a promise. Our first test replaces it.",
  "COD return-to-origin (refused / failed delivery) 15–35% in Egypt — unsourced industry blogs. We use 20% until we have our own number.",
  "Customer pays the EGP 90 delivery fee (Cairo + Alex). Courier's real charge to us: unknown — assumed EGP 90 (break-even on shipping).",
  "Orders come through Instagram DMs + the order form (Google Apps Script). No Shopify, no Pixel yet.",
];

export const MISSING = [
  "Real supplier unit cost per product (CRITICAL — see the warning in the calculator).",
  "Courier contract: what the courier charges us, who pays on a refused COD parcel, COD collection fee.",
  "Paymob live? Which share of orders will be online vs COD.",
  "Return / exchange policy (final wording) and its cost.",
  "Allocated packaging cost per item (box, bag, card) beyond the EGP 10.",
  "Stock per product/colour/size for the Founder Drops.",
  "Any tracking on the order form (UTM capture, order IDs).",
];

export type Stage = { key: string; name: string; objective: string; audience: string; campaign: string; creative: string; message: string; cta: string; metrics: string; tracking: string; decide: string };
export const FUNNEL: Stage[] = [
  {
    key: "A", name: "Awareness", objective: "Get the right people in Cairo/Alex to see TEMPORARY™ for the first time.",
    audience: "Broad 18–30, Cairo + Giza + Alexandria (Advantage+ on). Interest hints: streetwear, sneakers, fashion — as hints only.",
    campaign: "Organic Reels/motion carousels every day. Paid from week 2: Engagement or Awareness boosting the best organic post.",
    creative: "Motion carousels (curiosity covers), founder film, «اعرف قبل ما تدفع» checklists.",
    message: "Know what you're paying for. Everything is temporary.", cta: "Follow / send it to a friend",
    metrics: "Reach, CPM, 3-sec view rate, sends per reach, follows per 1,000 reach.",
    tracking: "Instagram Insights + Ads Manager.", decide: "Stop a creative if sends+saves ÷ reach < 1% after 3,000 reach.",
  },
  {
    key: "B", name: "Interest", objective: "Profile visits, saves, DMs, questions.",
    audience: "People reached in A + lookalike of engagers later.", campaign: "Same campaign (profile-visit goal). No separate campaign yet.",
    creative: "Construction close-ups, GSM/print explainers, drop countdown stories.", message: "Here's exactly what you get.",
    cta: "Visit the profile / ask us anything in DM", metrics: "Profile visits, cost per profile visit, DM starts, saves.",
    tracking: "Insights + a simple DM log (Community page).", decide: "If profile visits are cheap but follows don't come → fix the grid/bio, not the ad.",
  },
  {
    key: "C", name: "Consideration", objective: "Answer quality, fit, price, delivery and exclusivity questions before they become objections.",
    audience: "Profile visitors, engagers, DM starters.", campaign: "Organic highlights (Size, Fabric, Delivery, Archive) + stories. Paid only as retargeting once audience ≥ ~1,000.",
    creative: "Size chart in cm, wash test, fabric weight on a scale, FAQ carousels, honest delivery info.", message: "No surprises: size, fabric, delivery, returns.",
    cta: "Check the size guide → order", metrics: "DM → qualified lead rate, response time, common objections.",
    tracking: "DM log tags: price / size / delivery / quality.", decide: "Any objection in >20% of DMs gets its own post within a week.",
  },
  {
    key: "D", name: "Conversion", objective: "Confirmed and COMPLETED orders.",
    audience: "Warm: engagers 30d, video viewers 50%+, DM leads.", campaign: "From the drop: one Sales/Messages campaign to warm audiences. Before the drop: none.",
    creative: "Product on body, price shown, limited count, how to order in 2 steps.", message: "200 pieces. No restock of this edition. FOUNDER status included.",
    cta: "Order now — link in bio / DM 'ORDER'", metrics: "Orders, cost per completed order, checkout completion, AOV, RTO rate.",
    tracking: "Order form with UTM + order ID; COD confirmation call status; courier delivered/refused.", decide: "Pause if cost per completed order > max allowed CAC (calculator) for 3 days.",
  },
  {
    key: "E", name: "Retargeting", objective: "Bring back people who showed intent.",
    audience: "IG engagers 30d, video 50%+, DM'd but didn't order, (later) site visitors / checkout starters with Pixel.", campaign: "One retargeting ad set, frequency cap mindset ≤ 3/week, exclude buyers.",
    creative: "Sequence: proof → answer their objection → drop reminder.", message: "Still thinking? Here's what you asked about.",
    cta: "Finish your order", metrics: "Frequency, cost per completed order, conversion rate of the audience.", tracking: "Ads Manager + order log.",
    decide: "Frequency > 4 with falling CTR → new creative.",
  },
  {
    key: "F", name: "Retention", objective: "Keep buyers close: next drop, FOUNDER / FOUNDER ELITE, referrals.",
    audience: "Customers (with consent), Close Friends list, broadcast channel.", campaign: "No paid. Broadcast channel, Close Friends early access, thank-you card in the box.",
    creative: "Archive number, member card, unboxing reposts (with permission).", message: "You were here first. Drop 2 opens to FOUNDERS first.",
    cta: "Join the FOUNDER list", metrics: "Repeat purchase rate, FOUNDER → ELITE progression, referral orders.", tracking: "Customer sheet (order count per phone, hashed for any upload).",
    decide: "If <10% of Drop 1 buyers open Drop 2 early access → rethink the member perk.",
  },
];

export type Term = { key: string; name: string; type: "Marketing KPI" | "Advertising KPI" | "Sales KPI" | "Optimization technique" | "Profit KPI"; meaning: string; formula: string; example: string; measure: string; poor: string; action: string; sheet?: string };
export const TERMS: Term[] = [
  {
    key: "A", name: "Funnel conversion rate", type: "Sales KPI",
    meaning: "The % of people who move from one step to the next. Each step uses the step before it as the denominator.",
    formula: "Step rate = people at step N+1 ÷ people at step N × 100",
    example: "HYPOTHETICAL: 20,000 impressions → 200 link clicks (1%) → 160 form views (80%) → 16 orders started (10%) → 12 confirmed (75%) → 9 delivered (75%). Overall 9 ÷ 20,000 = 0.045% tells you nothing about WHERE it breaks; the step rates do.",
    measure: "Ads Manager (impressions, clicks) + order form views + order sheet + courier status.",
    poor: "A weak step hides inside a good-looking total; mixing different traffic (organic + paid) in one number.",
    action: "Fix the worst step first. One change at a time.",
    sheet: "=IFERROR(C3/C2,0) for each pair of rows",
  },
  {
    key: "B", name: "A/B testing", type: "Optimization technique",
    meaning: "Show two versions that differ in ONE thing to similar people at the same time, and keep the one that wins on the metric that matters.",
    formula: "Lift = (B − A) ÷ A × 100. Trust a result only after each side has enough events (rule of thumb: ≥ 100 clicks or ≥ 20–30 conversions per side) and ≥ 3–4 days.",
    example: "HYPOTHETICAL: Hook A «البياع مش هيقولك» 2.1% sends/reach vs Hook B «٥٠٠٠ ولا ٥٠٠؟» 2.9% on 5,000 reach each → B wins (+38%). On 400 reach each it's noise.",
    measure: "Meta A/B test tool or two ad sets with identical budget/audience; organic: same time slot on different days.",
    poor: "Changing 3 things at once; stopping after one day; declaring a winner on likes.",
    action: "Write the hypothesis first (Reports page), change one variable, wait for enough data, keep a test log.",
  },
  {
    key: "C", name: "Cost per lead (CPL)", type: "Advertising KPI",
    meaning: "What we pay for one inquiry. A RAW lead = any DM/comment asking; a QUALIFIED lead = asks about size/colour/delivery to their city/how to order AND is in Cairo/Alex.",
    formula: "CPL = ad spend ÷ leads. Cost per qualified lead = ad spend ÷ qualified leads.",
    example: "HYPOTHETICAL: EGP 3,000 → 60 DMs (CPL 50) → 24 qualified (CPQL 125).",
    measure: "DM log with a 'qualified' tick (Community page).",
    poor: "Ad attracts curiosity, not buyers (e.g. 'price?' then silence); slow replies.",
    action: "Judge on CPQL and lead→order rate, not CPL. Put the price + delivery info in the auto-reply.",
    sheet: "=IFERROR(Spend/Leads,0)  and  =IFERROR(Spend/QualifiedLeads,0)",
  },
  {
    key: "D", name: "Click-through rate (CTR)", type: "Advertising KPI",
    meaning: "% of impressions that click. Use LINK CTR (clicks to the order form/link). 'CTR (all)' also counts likes, profile taps, 'see more' — not comparable.",
    formula: "CTR = clicks ÷ impressions × 100",
    example: "HYPOTHETICAL: 300 link clicks ÷ 25,000 impressions = 1.2%.",
    measure: "Ads Manager → column 'CTR (link click-through rate)'.",
    poor: "Weak first frame; wrong audience; ad looks like every other ad.",
    action: "Read CTR WITH CPC and what happens after the click. High CTR + no orders = the page/DM is the problem.",
    sheet: "=IFERROR(LinkClicks/Impressions,0)",
  },
  {
    key: "E", name: "Cost per mille (CPM)", type: "Advertising KPI",
    meaning: "Cost of 1,000 impressions — the price of attention.",
    formula: "CPM = spend ÷ impressions × 1,000",
    example: "HYPOTHETICAL: EGP 1,500 ÷ 10,000 impressions × 1,000 = EGP 150.",
    measure: "Ads Manager.",
    poor: "Narrow audiences, peak seasons (Ramadan, White Friday), low-quality creative, conversion objectives (cost more per 1,000).",
    action: "Low CPM is NOT success — cheap views of the wrong people. Judge on cost per completed order.",
    sheet: "=IFERROR(Spend/Impressions*1000,0)",
  },
  {
    key: "F", name: "CPC (and 'CTC')", type: "Advertising KPI",
    meaning: "Cost of one click. 'CTC' has no standard definition — if an agency reports it, ask: cost per click? click-to-conversion? which click (link or all)?",
    formula: "CPC = spend ÷ link clicks",
    example: "HYPOTHETICAL: EGP 1,500 ÷ 150 link clicks = EGP 10.",
    measure: "Ads Manager → 'CPC (cost per link click)'.",
    poor: "Low CTR or expensive audience.",
    action: "Use CPC (link). Reject reports that use undefined terms.",
    sheet: "=IFERROR(Spend/LinkClicks,0)",
  },
  {
    key: "G", name: "Lead conversion rate", type: "Sales KPI",
    meaning: "% of leads that become customers. Separate: inquiry → qualified lead → confirmed order (customer said yes) → completed order (delivered, paid, not returned).",
    formula: "Lead conversion = completed orders ÷ qualified leads × 100",
    example: "HYPOTHETICAL: 24 qualified → 10 confirmed → 8 completed = 33%.",
    measure: "DM log + order sheet + courier status.",
    poor: "Slow replies, no size chart, price surprise, delivery fee surprise, no online payment option, trust.",
    action: "Reply < 15 min, saved replies with size chart + delivery fee 90 + delivery time, offer Paymob/InstaPay to cut COD refusals.",
    sheet: "=IFERROR(CompletedOrders/QualifiedLeads,0)",
  },
  {
    key: "H", name: "ROAS", type: "Advertising KPI",
    meaning: "Revenue the ad platform credits to ads ÷ ad spend. It is NOT profit and NOT ROI.",
    formula: "ROAS = attributed revenue ÷ ad spend",
    example: "HYPOTHETICAL on EGP 10,000 spend: ROAS 1.5 = EGP 15,000 revenue (probably a loss); ROAS 3 = 30,000; ROAS 5 = 50,000. Whether any of these is profitable depends on the break-even ROAS in the calculator.",
    measure: "Platform ROAS (Meta, needs Pixel) vs our own: completed-order revenue from tagged orders ÷ spend.",
    poor: "Meta counts conversions it can't prove (view-through, modelled); COD orders that are later refused still count as 'purchases'.",
    action: "Use COMPLETED revenue, compare to break-even ROAS, and watch blended MER.",
    sheet: "=IFERROR(CompletedRevenue/Spend,0)",
  },
  {
    key: "I", name: "Retargeting", type: "Optimization technique",
    meaning: "Showing ads again to people who already showed interest.",
    formula: "Audience must exist and be big enough: IG engagers 30–90d, video viewers (50%+), DM'd, (with Pixel) visitors / initiated checkout. Exclude buyers of the last 30d.",
    example: "HYPOTHETICAL: 1,800 engagers → EGP 150/day, 7 days, frequency ~2.5 → 3 completed orders → cost per order EGP 350.",
    measure: "Ads Manager by ad set + order log.",
    poor: "Audience too small (delivery stalls, frequency explodes); same creative over and over; not excluding buyers.",
    action: "Start only when warm audience ≥ ~1,000. Sequence creative: proof → objection answer → drop reminder. Max ~20–30% of spend.",
  },
  {
    key: "J", name: "Lookalike audiences", type: "Optimization technique",
    meaning: "Meta finds new people similar to a source list.",
    formula: "Source ≥ 100 people from one country (Meta minimum); quality order: completed purchasers > qualified leads > checkout starters > top engagers.",
    example: "After Drop 1: 150 completed buyers (hashed phones) → 1% lookalike Egypt vs broad Advantage+ — test both, same budget.",
    measure: "Cost per completed order of LAL vs broad.",
    poor: "Tiny or low-quality source (random likers); at launch broad Advantage+ often beats it.",
    action: "Until we have ~100 buyers: broad + good creative. Then test a buyer lookalike.",
  },
];

export const EXTRA_METRICS: [string, string, string, "diagnostic" | "profit"][] = [
  ["Reach / impressions", "unique people / total views", "=Reach  ·  =Impressions", "diagnostic"],
  ["Frequency", "impressions ÷ reach", "=IFERROR(Impressions/Reach,0)", "diagnostic"],
  ["Cost per purchase / CAC", "ad spend ÷ completed orders (new customers)", "=IFERROR(Spend/CompletedOrders,0)", "profit"],
  ["Qualified lead rate", "qualified ÷ all leads", "=IFERROR(QualifiedLeads/Leads,0)", "diagnostic"],
  ["Checkout completion", "orders submitted ÷ order-form starts (or confirmed ÷ DM order requests)", "=IFERROR(Submitted/Started,0)", "diagnostic"],
  ["AOV", "completed revenue ÷ completed orders (excl. delivery fee)", "=IFERROR(CompletedRevenue/CompletedOrders,0)", "profit"],
  ["Revenue per visitor", "completed revenue ÷ link clicks (or form views)", "=IFERROR(CompletedRevenue/LinkClicks,0)", "diagnostic"],
  ["Gross profit / order", "AOV − product cost − print/embroidery/label/packaging", "=AOV-UnitCosts", "profit"],
  ["Contribution margin / order", "gross profit − payment fee − delivery cost not paid by customer − RTO losses", "=GrossProfit-PayFee-DeliveryGap-RTOcost", "profit"],
  ["Contribution after ads", "contribution × completed orders − ad spend", "=Contribution*CompletedOrders-Spend", "profit"],
  ["CAC payback", "CAC ÷ contribution per order (orders needed to earn back acquisition)", "=IFERROR(CAC/Contribution,0)", "profit"],
  ["Repeat purchase rate", "customers with 2+ orders ÷ all customers", "=IFERROR(Repeat/Customers,0)", "profit"],
  ["RTO / cancellation / refund rate", "refused+failed+cancelled ÷ confirmed orders", "=IFERROR((Refused+Failed+Cancelled)/Confirmed,0)", "profit"],
  ["Blended MER", "ALL revenue (any source) ÷ ALL marketing spend — the honest top-line check vs platform ROAS", "=IFERROR(TotalRevenue/TotalMarketingSpend,0)", "profit"],
];

export const CREATIVES: { name: string; stage: string; audience: string; hook: string; message: string; visual: string; copy: string; cta: string; kpi: string; hypothesis: string }[] = [
  { name: "Brand introduction", stage: "A", audience: "Broad 18–30 Cairo/Alex", hook: "«مش لكل الناس.» / NOT FOR EVERYONE.", message: "Limited pieces, built to last, part of an archive.", visual: "Dark luxury, single piece in hard light, slow push-in.", copy: "Short, bilingual, no hype words.", cta: "Follow for Drop 01", kpi: "Follows per 1,000 reach", hypothesis: "Exclusivity framing gets more follows than product-first." },
  { name: "Founder story (AI character)", stage: "A–B", audience: "Broad", hook: "«ليه واحد يعمل ٢٠٠ قطعة بس؟»", message: "Why the brand exists; scarcity on purpose.", visual: "Masked founder, cinematic. AI-info label ON, never claim he's real.", copy: "Egyptian Arabic voice-over / captions.", cta: "Watch till the end", kpi: "Avg watch time, 50% views", hypothesis: "A face (even masked) holds attention longer than product B-roll." },
  { name: "Quality & construction", stage: "B–C", audience: "Engagers + broad", hook: "«٥٠٠٠ ولا ٥٠٠؟ تقدر تفرق؟»", message: "Fabric weight, print, stitching you can check.", visual: "Macro: GSM scale, stretch test, seam close-up (verified specs only).", copy: "Facts only, numbers we can show.", cta: "Save it before your next order", kpi: "Saves + sends ÷ reach", hypothesis: "Proof content drives more saves than lifestyle." },
  { name: "Fit & sizing", stage: "C", audience: "Profile visitors / DMs", hook: "«المقاس بالسنتي… مش S M L»", message: "Size chart in cm, model height + size worn.", visual: "Flat lay with ruler, on-body front/side.", copy: "Clear table, Arabic + English.", cta: "Find your size → DM", kpi: "Size questions in DMs (should drop)", hypothesis: "A cm size chart cuts size DMs and returns." },
  { name: "Styling & lifestyle", stage: "B–D", audience: "Engagers", hook: "«٣ طرق تلبس بيها نفس الهودي»", message: "How it fits a real Cairo life.", visual: "Street at night, Zamalek/New Cairo textures, no real locations' brands.", copy: "Minimal.", cta: "Which one is you?", kpi: "Comments + sends", hypothesis: "Styling raises perceived value without discounts." },
  { name: "Design story", stage: "B", audience: "Followers", hook: "«الرسمة دي ليها حكاية»", message: "Meaning behind the drop.", visual: "Sketch → print process.", copy: "Story in 3 lines.", cta: "Save", kpi: "Saves", hypothesis: "Story raises save rate on product posts." },
  { name: "Drop announcement", stage: "D", audience: "Warm + followers", hook: "«٢٠٠ قطعة. مفيش restock.»", message: "Date, count, how to order, FOUNDER status.", visual: "Countdown, numbered tag 001/200.", copy: "Price shown, delivery 90 EGP shown.", cta: "Turn on notifications / order", kpi: "Orders in first 48h", hypothesis: "Real numbered scarcity converts without discount." },
  { name: "Membership & archive", stage: "D–F", audience: "Warm + buyers", hook: "«FOUNDER ولا FOUNDER ELITE؟»", message: "1 piece from any Founder Drop = FOUNDER; 1 from each of the 3 = ELITE.", visual: "Member card, archive wall.", copy: "Simple rules, no fine print.", cta: "Which one will you be?", kpi: "Poll votes, repeat intent", hypothesis: "Membership raises multi-drop purchase intent." },
  { name: "Social proof (only when real)", stage: "C–E", audience: "Warm", hook: "Real customer photo/quote, with permission.", message: "Others received it and it's as promised.", visual: "UGC, unboxing.", copy: "Never invented.", cta: "Your turn", kpi: "Conversion rate of retargeting", hypothesis: "Real UGC lowers cost per order in retargeting." },
  { name: "FAQ / objections", stage: "C–E", audience: "DM'd, didn't buy", hook: "«ليه أدفع ١٥٠٠ في هودي؟»", message: "Honest answers: price, delivery 90, payment, returns.", visual: "Clean Q&A carousel.", copy: "Answer exactly what DMs ask.", cta: "Still have a question? DM", kpi: "Lead → order rate", hypothesis: "Answering the top objection lifts conversion." },
];

export const BUDGETS = [
  {
    name: "Conservative", egp: 10000,
    split: "≈70% prospecting (boost proven trust posts / drop teaser), ≈30% creative tests. Retargeting only if warm audience ≥ 1,000.",
    objectives: "Engagement (profile visits) + Messages at the drop.", testing: "EGP 3,000 = 4 creatives × 3 days × EGP 250.",
    measure: "Weekly sheet, DM log, order form UTMs.", risk: "Too little data to judge conversion; learn on attention metrics only.",
    up: "Cost per completed order < max CAC for 2 weeks.", down: "No creative reaches 2% (sends+saves ÷ reach).",
    note: "HYPOTHETICAL: at EGP 115–190 CPM ≈ 53,000–87,000 impressions. Not a forecast.",
  },
  {
    name: "Moderate", egp: 25000,
    split: "≈55% prospecting, ≈25% retargeting (once eligible), ≈20% testing.",
    objectives: "Profile visits (pre-drop) → Messages / Sales (drop).", testing: "EGP 5,000: hooks + formats.",
    measure: "Add order IDs + courier outcomes per ad.", risk: "Scaling before unit economics are confirmed.",
    up: "Contribution after ads > 0 for 2 consecutive weeks.", down: "RTO > 30% or CAC > max CAC.",
    note: "HYPOTHETICAL: ≈130,000–215,000 impressions.",
  },
  {
    name: "Aggressive", egp: 50000,
    split: "≈50% prospecting, ≈30% retargeting, ≈20% testing; only around a drop.",
    objectives: "Sales/Messages with Pixel/CAPI live.", testing: "EGP 10,000.",
    measure: "Needs Pixel + Conversions API, UTMs and daily order reconciliation.", risk: "Burning cash on cold traffic; frequency fatigue on small warm audiences; stock-outs.",
    up: "Only with stock to sell, tracking reliable, CAC < max CAC.", down: "Any 3-day stretch above max CAC.",
    note: "HYPOTHETICAL: ≈260,000–435,000 impressions.",
  },
];

export const DECISIONS: [string, string][] = [
  ["Continue a test", "< 3 days or < 100 link clicks / < 3,000 reach per variant → keep running, don't judge."],
  ["Pause a creative", "After enough data: sends+saves ÷ reach under half of our best, or cost per completed order > max CAC for 3 days."],
  ["Make new creative", "Frequency > 3–4 with CTR falling 30% from its first 3 days, or no winner after 4 variants."],
  ["Change the audience", "Creative works organically but paid cost per profile visit is 2× the best — try broad vs interest vs lookalike, one at a time."],
  ["Fix the ordering experience", "Link CTR fine but form completion < 30% or DM→order < 20% — the problem is after the click."],
  ["Scale a winner", "+20% budget every 48 h (never double) while cost per completed order stays < max CAC."],
];

export const PLAN_30: { week: string; focus: string; setup: string; creative: string; measure: string; gate: string }[] = [
  { week: "Week 1 (14–20 Oct)", focus: "Organic trust — «اعرف قبل ما تدفع». No ads.", setup: "Professional account, Business Manager connected (you), DM saved replies, order form UTM fields, Google Sheet dashboard.", creative: "Daily: motion carousels, statics, stories (already in Studio).", measure: "Sends+saves ÷ reach per post, follows, DM questions.", gate: "Pick the post with the best (sends+saves) ÷ reach ≥ 2%." },
  { week: "Week 2 (21–27 Oct)", focus: "First paid test on the winner.", setup: "Ads Manager: Engagement → profile visits, Cairo+Giza+Alex, 18–30, Advantage+, IG placements. EGP 250–500/day × 3 days.", creative: "2 new hooks on the winning idea (A/B).", measure: "Cost per profile visit, follows per EGP 100.", gate: "Keep if cost per follow ≤ 2× cheapest; else new creative." },
  { week: "Week 3", focus: "Consideration + warm audience building.", setup: "Custom audiences: engagers 30d, video 50%+. Highlights: Size, Fabric, Delivery, Archive.", creative: "Construction proof, size chart in cm, FAQ from DMs.", measure: "Warm audience size, DM qualified rate.", gate: "Warm audience ≥ 1,000 → retargeting allowed." },
  { week: "Week 4", focus: "Drop readiness (only if unit costs confirmed).", setup: "Order form + COD confirmation script + courier status column. Optional: Paymob link / InstaPay.", creative: "Drop teaser, FOUNDER explainer, countdown.", measure: "Waitlist / 'notify me' count, DM intent.", gate: "No conversion spend until the calculator shows positive contribution per order." },
];

export const DASHBOARD: [string, string][] = [
  ["Spend", "From Ads Manager (EGP)"],
  ["Reach", "Ads Manager"],
  ["Impressions", "Ads Manager"],
  ["Frequency", "=IFERROR(Impressions/Reach,0)"],
  ["CPM", "=IFERROR(Spend/Impressions*1000,0)"],
  ["Link CTR", "=IFERROR(LinkClicks/Impressions,0)"],
  ["CPC", "=IFERROR(Spend/LinkClicks,0)"],
  ["Leads", "DM log: new conversations asking about product"],
  ["Qualified leads", "DM log: tick 'qualified'"],
  ["CPL", "=IFERROR(Spend/Leads,0)"],
  ["Orders (confirmed / completed)", "Order sheet + courier status"],
  ["Lead conversion rate", "=IFERROR(Completed/QualifiedLeads,0)"],
  ["Cost per purchase", "=IFERROR(Spend/Completed,0)"],
  ["Revenue (completed)", "=SUMIFS(Order!Amount,Order!Status,\"Delivered\")"],
  ["ROAS (ours)", "=IFERROR(Revenue/Spend,0)"],
  ["AOV", "=IFERROR(Revenue/Completed,0)"],
  ["Contribution after ads", "=Completed*ContributionPerOrder-Spend"],
];

export const TRACKING = [
  "Ads Manager: columns preset — Spend, Reach, Impressions, Frequency, CPM, Link clicks, CTR (link), CPC (link), Messaging conversations started, Profile visits.",
  "Instagram Insights: per post — reach, sends, saves, profile visits, follows, avg watch time (Claude pulls weekly into Reports).",
  "Order form (Google Apps Script): add hidden fields utm_source / utm_campaign / utm_content read from the URL + an auto order ID + 'how did you hear about us'.",
  "UTM format: link-in-bio → ?utm_source=instagram&utm_medium=bio ; ads → utm_medium=paid&utm_campaign=<campaign>&utm_content=<ad name>.",
  "DM orders: Meta shows which ad started a conversation — copy the ad name into the order row.",
  "COD: confirmation call/WhatsApp before shipping; columns: Confirmed (Y/N), Shipped, Delivered / Refused / Failed, Cash collected.",
  "Meta Pixel + Conversions API: optional later. CAPI is an HTTPS call with hashed phone/email — possible from Apps Script, but only after the basics above work. Respect privacy: hash before sending, no raw phone numbers anywhere outside the order sheet.",
  "Attribution limits: Meta over-credits (view-through, modelled), COD refusals still count as 'purchase'. Our truth = delivered orders in the sheet.",
];

export const SCORECARD: [string, string][] = [
  ["Owns", "Strategy, creative production, campaign setup, testing log, weekly report, community replies (drafts), tracking setup."],
  ["Reports weekly", "Spend, reach, CPM, link CTR, CPC, leads, qualified leads, CPQL, completed orders, cost per completed order, AOV, RTO rate, contribution after ads, MER."],
  ["Experiments", "Each test: hypothesis, variable, audience, budget, dates, result, decision — in the Reports page."],
  ["Decisions", "Every budget change cites a rule from the decision table above."],
  ["Vanity check", "Followers, likes and impressions are never the headline. Headline = completed orders and contribution after ads."],
  ["Red flags", "Only platform ROAS shown; 'CTC' undefined; results without spend; 'reach' presented as customers; no completed-vs-confirmed split."],
  ["You keep ownership", "Business Manager, ad account, payment method, Pixel, page/IG admin, creative files (HQ assets), customer sheet. Agency = partner access only."],
  ["Outside agency control", "Product-market fit, price, stock, fulfilment speed, courier performance, customer service tone."],
];

export const RISKS = [
  "Unit cost = selling price (if true) → negative margin; ads would multiply losses.",
  "COD refusals (15–35% industry claims) eat contribution — require confirmation before shipping; offer prepaid options.",
  "Small warm audiences → high frequency, ad fatigue.",
  "AI founder: must keep AI-info label on; never claim he's real.",
  "Claims we can't prove (GSM etc.) — only verified specs.",
  "Seasonality: CPM rises before Ramadan and around White Friday (late Nov).",
];

export const NEXT = [
  "YOU: confirm the real supplier cost for each product (calculator below).",
  "YOU: confirm courier charge, who pays refused parcels, and whether Paymob/InstaPay is live.",
  "CLAUDE: add UTM + order ID fields to the order form plan; set up the weekly Google Sheet columns from the dashboard spec.",
  "CLAUDE: run week 1 organic (already scheduled) and log sends+saves ÷ reach per post.",
  "Day 8: pick the winner → first paid test (Media buying page).",
];

/** Unit economics. Prices come from the owner's sheet (Oct 2026). Costs are blank until confirmed. */
export type UERow = { name: string; price: number; cost: number | null; emb: boolean; dtf: boolean };
export type UE = { rows: UERow[]; delivery_fee: number; courier_cost: number; embroidery: number; dtf: number; label: number; packaging: number; pay_pct: number; pay_fixed: number; prepaid_share: number; rto_rate: number };
export const UE_DEFAULT: UE = {
  rows: [
    { name: "Regular T-Shirt", price: 900, cost: null, emb: true, dtf: true },
    { name: "Parasola Oversized", price: 900, cost: null, emb: true, dtf: true },
    { name: "Regular Long Sleeve", price: 900, cost: null, emb: true, dtf: true },
    { name: "Boulevard Oversized", price: 1100, cost: null, emb: true, dtf: true },
    { name: "Standard Oversized Hoodie", price: 1300, cost: null, emb: true, dtf: true },
    { name: "Premium Oversized Crewneck", price: 1400, cost: null, emb: true, dtf: true },
    { name: "Premium Oversized Hoodie", price: 1500, cost: null, emb: true, dtf: true },
    { name: "Kids Regular T-Shirt", price: 600, cost: null, emb: true, dtf: true },
    { name: "Kids Regular Hoodie", price: 800, cost: null, emb: true, dtf: true },
  ],
  delivery_fee: 90,
  courier_cost: 90,
  embroidery: 125,
  dtf: 55,
  label: 35,
  packaging: 10,
  pay_pct: 2.75,
  pay_fixed: 3,
  prepaid_share: 30,
  rto_rate: 20,
};

/** Contribution per COMPLETED order, and the numbers that follow from it. */
export function unitMath(u: UE, r: UERow) {
  const extras = (r.emb ? u.embroidery : 0) + (r.dtf ? u.dtf : 0) + u.label + u.packaging;
  const pay = (u.prepaid_share / 100) * ((r.price + u.delivery_fee) * (u.pay_pct / 100) + u.pay_fixed);
  const deliveryGap = u.courier_cost - u.delivery_fee;
  // each refused COD parcel: we pay courier both ways (assume 2× courier) and get nothing; spread over completed orders
  const rto = u.rto_rate / 100;
  const codShare = 1 - u.prepaid_share / 100;
  const refusedPerCompleted = (codShare * rto) / Math.max(0.01, 1 - codShare * rto);
  const rtoCost = refusedPerCompleted * (u.courier_cost * 2 + u.packaging);
  if (r.cost == null) return { extras, pay, deliveryGap, rtoCost, gross: null, contribution: null, breakevenRoas: null, maxCac: null };
  const gross = r.price - r.cost - extras;
  const contribution = gross - pay - Math.max(0, deliveryGap) - rtoCost;
  const breakevenRoas = contribution > 0 ? r.price / contribution : null;
  return { extras, pay, deliveryGap, rtoCost, gross, contribution, breakevenRoas, maxCac: contribution > 0 ? contribution : 0 };
}
