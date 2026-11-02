/**
 * The agency's three living boards, refreshed by the employees and the Sunday team meeting:
 *  - INTEL: competitors and other brands (local, international, mass-market): what they do, their ads, what we take from it.
 *  - PAINS: every complaint customers have with clothing brands in Egypt, and TEMPORARY's answer to each one.
 *  - TRENDLAB: trends we follow and formats we invent so TEMPORARY leads instead of copying.
 */
import type { AgentKey } from "./agencyos";

export type BoardKey = "intel" | "pains" | "trendlab";
export type Field = { key: string; label: string; kind?: "text" | "long" | "select"; options?: string[] };
export type BoardDef = { key: BoardKey; title: string; sub: string; owner: AgentKey; fields: Field[]; statusKey: string; titleKey: string; seed: Record<string, string>[] };

export const BOARDS: Record<BoardKey, BoardDef> = {
  intel: {
    key: "intel", title: "Competitor & ads intel", owner: "growth", titleKey: "name", statusKey: "tier",
    sub: "Brands we study every week: how they post, engage and advertise, and what TEMPORARY takes from it. Internal only — we never name them in content.",
    fields: [
      { key: "name", label: "Brand" },
      { key: "tier", label: "Type", kind: "select", options: ["local streetwear", "international drop brand", "mass-market"] },
      { key: "positioning", label: "Positioning / look", kind: "long" },
      { key: "what_works", label: "What works for them (posts, engagement, community)", kind: "long" },
      { key: "ads", label: "Their ads (from Meta Ad Library: format, message, how long it runs)", kind: "long" },
      { key: "fit", label: "How we make it fit TEMPORARY", kind: "long" },
      { key: "source", label: "Source link" },
      { key: "checked", label: "Last checked (date)" },
    ],
    seed: [
      { name: "Marsy", tier: "local streetwear", positioning: "Pop culture, puns and memes; every piece makes a statement; reinvented logos.", what_works: "Started with shareable Instagram content before merch; culture-first humour; regional presence (Sole DXB 2025).", ads: "To check in Ad Library.", fit: "Masri wit and culture in the Founder's voice — but with our dark/chrome identity, not memes on the product.", source: "https://complex.me/style/egyptian-streetwear-brands-to-know/", checked: "2026-10-30" },
      { name: "UNTY", tier: "local streetwear", positioning: "Graphic-design-led label since 2013 with a clear point of view.", what_works: "Collabs with photographers, musicians and creatives; pop-ups; anniversary collections.", ads: "To check in Ad Library.", fit: "One creative collab per drop (a Cairo artist or musician) + a small pop-up moment after Founder Drop 1.", source: "https://complex.me/style/egyptian-streetwear-brands-to-know/", checked: "2026-10-30" },
      { name: "Fear2F*ckup", tier: "local streetwear", positioning: "Skate-driven, bold palettes, in-your-face graphics with a message.", what_works: "The founder built a whole subculture (skaters) around the label.", ads: "To check in Ad Library.", fit: "Build a subculture around the FOUNDER circle: rituals, codes (Street Code), insider language.", source: "https://complex.me/style/egyptian-streetwear-brands-to-know/", checked: "2026-10-30" },
      { name: "Al Camileon", tier: "local streetwear", positioning: "Raw, embossed, shape-shifting identity.", what_works: "Frequent cross-brand collaborations (records labels, cafés, other brands).", ads: "To check in Ad Library.", fit: "Collab drops later (Founder Drop 2 or 3) to reach new audiences.", source: "https://complex.me/style/egyptian-streetwear-brands-to-know/", checked: "2026-10-30" },
      { name: "Corteiz", tier: "international drop brand", positioning: "Underground London streetwear, community first.", what_works: "Early-access password hidden in Instagram Stories; guerrilla drops and city scavenger hunts; low grid posting; price ladder tee → outerwear.", ads: "Very little paid; hype is earned.", fit: "A Stories password for early access (rewards story viewers), and one Cairo street moment.", source: "https://www.latterly.org/corteiz-marketing-strategy/", checked: "2026-10-30" },
      { name: "Scuffers", tier: "international drop brand", positioning: "Premium European streetwear advertising in Egypt.", what_works: "Polished seasonal collection films.", ads: "Egypt Ad Library (30 Oct 2026): about 18 short video variants (9–17 s) of one FW26 message live at once, 'Shop now'.", fit: "Make many short versions of each winning concept (different first seconds) — Meta's system rewards variety.", source: "https://www.facebook.com/ads/library/", checked: "2026-10-30" },
      { name: "Mass-market Instagram stores", tier: "mass-market", positioning: "Cheap hoodies/oversized sets sold on Facebook/Instagram.", what_works: "Feature lists (fabric, zip, pockets), 'trend 2027', free shipping.", ads: "Egypt Ad Library: 'inspect before you pay' (معاينة قبل الاستلام), free shipping, daily offers, discounts.", fit: "Answer the same trust fear WITHOUT discounts: real close-ups, exact specs, delivery promise, defect/wrong-item exchange.", source: "https://www.facebook.com/ads/library/", checked: "2026-10-30" },
      { name: "Defacto / LC Waikiki / Shein", tier: "mass-market", positioning: "Fast fashion at scale.", what_works: "Price, range, constant newness.", ads: "To check in Ad Library.", fit: "Be the opposite: few pieces, real design, exact sizes, made for you.", source: "", checked: "2026-10-30" },
    ],
  },
  pains: {
    key: "pains", title: "Customer pain board", owner: "community", titleKey: "pain", statusKey: "status",
    sub: "Every complaint Egyptians have with clothing brands (local and international) and TEMPORARY's answer. Every open pain must be answered before early access (15 Nov).",
    fields: [
      { key: "pain", label: "The complaint" },
      { key: "answer", label: "TEMPORARY's answer", kind: "long" },
      { key: "where", label: "Where we answer it (site, content, DM, policy)" },
      { key: "status", label: "Status", kind: "select", options: ["open", "in progress", "answered"] },
      { key: "source", label: "Source" },
    ],
    seed: [
      { pain: "The size doesn't match the size chart", answer: "Size guide in cm for every garment (tee, oversized, hoodie, crewneck) on the product page + a Founder 'find your size' story + DM help.", where: "Website + stories + DMs", status: "open", source: "https://egyptianstreets.com/2026/06/24/the-rise-of-online-shopping-how-e-commerce-became-one-of-egypts-fastest-growing-industries/" },
      { pain: "Photos hide the real fabric, colour and cut", answer: "Real sample close-ups and on-body photos/videos only (no AI for products), shown in teasers and on the site.", where: "Content (8–14 Nov) + website", status: "open", source: "https://ososs.com/ar/blog/online-clothing-sales-issues/" },
      { pain: "Vague product details (material, fit, care)", answer: "Exact specs on every product page: fabric, weight, fit, print method, care.", where: "Website", status: "open", source: "https://ososs.com/ar/blog/online-clothing-sales-issues/" },
      { pain: "Late delivery / no idea when it arrives", answer: "Said upfront everywhere: made for you after you order, arrives within 10–14 days. Confirmation email at order.", where: "Website + content + email", status: "answered", source: "" },
      { pain: "Wrong item delivered", answer: "Order email lists design, garment and size; team checks every order before the vendor; wrong item = we fix it at our cost.", where: "Email + policy", status: "in progress", source: "https://ososs.com/ar/blog/online-clothing-sales-issues/" },
      { pain: "Sellers refuse returns after cash on delivery", answer: "POLICY: made to order, so no returns for change of mind — but if a piece is defective or we sent the wrong item, we exchange or refund it. Say it clearly on the site and in a pinned story.", where: "Website FAQ + highlight + DMs", status: "open", source: "https://egyptianstreets.com/2026/06/24/the-rise-of-online-shopping-how-e-commerce-became-one-of-egypts-fastest-growing-industries/" },
      { pain: "Distrust of new stores and online payment", answer: "Secure card payment (Paymob), Google sign-in, the Founder's honest story, real samples, the FOUNDER circle answering fast.", where: "Website + content + DMs", status: "open", source: "https://www.egrow.com/en/blog/egypt-cod-ecommerce-2026" },
      { pain: "Fake 'limited' and counterfeits", answer: "A real number: 200 pieces per design, never restocked; edition stated on every product.", where: "Content + website", status: "answered", source: "" },
      { pain: "Local brands priced like imports for generic items", answer: "We sell the design, the story and the edition — show the process and why it costs what it costs.", where: "Founder content", status: "answered", source: "https://sugarfreetalks.blogspot.com/2023/06/the-price-paradox-egyptian-local-brands.html" },
      { pain: "Narrow size range / bigger sizes ignored", answer: "Publish the full size range per garment; offer DM size help.", where: "Website + stories", status: "open", source: "https://egyptianstreets.com/2021/08/24/the-pros-and-cons-of-clothes-shopping-locally-in-egypt/" },
    ],
  },
  trendlab: {
    key: "trendlab", title: "Trend lab", owner: "content", titleKey: "name", statusKey: "status",
    sub: "Trends we follow and formats we invent so TEMPORARY leads the market. Each idea is tested, measured, and becomes ours or gets dropped.",
    fields: [
      { key: "name", label: "Format / trend" },
      { key: "kind", label: "Follow or invent", kind: "select", options: ["invent (ours)", "follow"] },
      { key: "what", label: "What it is", kind: "long" },
      { key: "how", label: "How TEMPORARY does it", kind: "long" },
      { key: "outlier", label: "Outlier × (vidIQ: how many times better than that account's usual — and the link)" },
      { key: "metric", label: "How we judge it" },
      { key: "status", label: "Status", kind: "select", options: ["idea", "planned", "testing", "ours", "dropped"] },
    ],
    seed: [
      { name: "Street Code (كود الشارع)", kind: "invent (ours)", what: "A numbered weekly style rule from the masked Founder.", how: "One rule per Reel, always making the bold graphic the hero; pinned Part 1 + highlight.", metric: "Follows per 1k views vs our average", status: "testing" },
      { name: "Stories password (الكلمة السر)", kind: "invent (ours)", what: "The early-access link only works with a word hidden in our Stories.", how: "Reveal the word in stories on 15 Nov morning; FOUNDER circle gets it first.", metric: "Story views on launch day, sign-ins", status: "planned" },
      { name: "«جبتها منين؟» challenge", kind: "invent (ours)", what: "Buyers post the moment someone asks where they got it.", how: "After the first deliveries: repost real ones (with permission), Founder replies 'مش هتلاقيها'.", metric: "UGC count, sends", status: "idea" },
      { name: "Founder replies to comments", kind: "invent (ours)", what: "The Founder answers real comments in short Reels.", how: "Pick the best comment of the week; 3-clip reply.", metric: "Comments per post", status: "idea" },
      { name: "Masri streetwear dictionary", kind: "invent (ours)", what: "Streetwear words explained in Masri.", how: "Carousel series; part 2 from follower requests.", metric: "Saves per 1k", status: "testing" },
      { name: "Trial Reels hook tests", kind: "follow", what: "Instagram shows Trial Reels to non-followers first.", how: "Every Founder Reel gets a second hook (alt_hook) as a Trial Reel.", metric: "Sends + follows per 1k per hook", status: "testing" },
      { name: "Outfit reviews in DMs", kind: "follow", what: "Followers send outfits, the brand replies.", how: "Founder-voice tips; best 3 on stories with permission.", metric: "DMs, story replies", status: "testing" },
      { name: "Numbered series (no Reel linking)", kind: "follow", what: "Instagram removed Reel-to-Reel links (28 Oct 2026).", how: "Number parts, name the next part in the caption, pin Part 1.", metric: "Profile visits from series", status: "ours" },
    ],
  },
};
