# Setup guide — TEMP. HQ (GitHub only, free)

**How it's set up**

- **Website**: hosted free on GitHub Pages from the public repo **`temporary-hq`**. That repo holds only website code, never your data.
- **Data**: lives in a **private** repo, **`temporary-hq-data`**. It holds the brand bible, products, plans, content, research, logo, artwork, mask, photos and videos.
- **Who can open HQ**: only GitHub accounts invited to the private repo. Each person creates a personal GitHub key once and pastes it into the website once per device. Anyone else sees only the login screen and can't read anything.
- **Claude, ChatGPT and Flow** are used through your existing plans, by copy and paste.

---

## 1. Create the private data repo

1. On GitHub, click **+**, then **New repository**:
   - **Name:** `temporary-hq-data`
   - **Visibility:** **Private**
   - Tick **Add a README file**
   - Click **Create repository**.
2. Click **Add file**, then **Upload files**.
3. On your computer, open the folder **`temporary-hq-data`** from the zip. Select **everything inside it** (`brands.json`, the `temporary` folder and `README.md`) and drag it onto the page.
4. Click **Commit changes**.

## 2. Invite the second account

1. In the private repo, go to **Settings**, then **Collaborators**, then **Add people**.
2. Type **seifelkasseify@gmail.com**, or that person's GitHub username, and choose **Write** access.
3. That person opens the invite email from GitHub and clicks **Accept invitation**. They need a free GitHub account on that email first.

## 3. The website repo (`temporary-hq`, public)

1. Upload the contents of the zip's **`temporary-hq`** folder to the repo, replacing what's there.
2. **Settings → Pages → Source**: choose **GitHub Actions**.
3. The **Actions → Deploy website** run must be green. Your site is then at **`https://<your-username>.github.io/temporary-hq/`**.

## 4. Log in (each person, once per device)

1. Open the website and click **Create your GitHub key**. Do this while signed in to **your own** GitHub account.
2. On the GitHub page that opens:
   - **Note:** `TEMP. HQ`
   - **Expiration:** 1 year
   - Keep the **repo** box ticked.
   - Click **Generate token** at the bottom.
3. Copy the key (it starts with `ghp_`), paste it into the website, and click **Open HQ**.

Your key stays only in that browser. On a new phone or laptop, create another key the same way.

> The key can read and write your GitHub repos, so keep it private: don't paste it anywhere except HQ. If a device is lost, delete that key at **GitHub → Settings → Developer settings → Personal access tokens**.

## 5. Chat with the team (Claude and ChatGPT Projects)

1. In HQ, go to **Settings**, then **Download knowledge file**.
2. In **Claude**, go to **Projects**, then **New project** (`TEMPORARY™ HQ`), and add the file to **Project knowledge**.
3. In **ChatGPT**, go to **Projects**, then **New project** (`TEMPORARY™ HQ`), and add the same file.
4. Re-upload it after each new plan or trend analysis.

---

## The weekly loop

The **Overview** page always shows the next step.

1. **Trend Radar**:
   - Copy the research pack to **ChatGPT** with web search on, then paste the answer back.
   - Copy the analysis pack to **Claude**, then paste the answer back. Claude picks trends to ride and **invents new ones**.
2. **Plan**: write the goal, copy the pack to **Claude**, and paste the answer back.
3. **Content → Write**: copy to **ChatGPT**, which writes 5 pieces per paste, then paste back. Every brand rule is checked automatically.
4. **Content → Final review**: copy to **Claude**. Approved pieces come to you; sent-back pieces return to step 3.
5. **Each piece**:
   - Copy the image prompts to **Flow** (Nano Banana) or **ChatGPT**, and the video prompt to **Flow** (Veo).
   - Upload the results. Your original logo is added and pixel-checked.
   - Add the slide text, then **Approve**.
   - Post it, then click **Mark as posted**.

**If Claude hits its limit:** tick "Claude at its limit — send manager work to ChatGPT" in the top bar.

## Before the first plan

- **Brands**: add your Google Forms order link.
- **Products**:
  - Confirm each price (tick *Confirmed*).
  - Add sizes, colours and availability.
  - Add materials only if verified.
  - The Long Sleeve price stays blank until you fill it in.
- **Assets**:
  - Upload the logo (transparent PNG), the artwork, the founder mask (a cut-out PNG) and real product photos.
  - On each product photo, click **Protect area** and draw a box over the print.

## Limits

- Each file must be **under 50 MB**. Export Reels at 720p or 1080p from Flow; that's well under the limit.
- Keep the private repo under about **1 GB**. Download finished videos and remove old drafts now and then.
- GitHub allows 5,000 actions per hour per person, far more than you'll use.

## If something doesn't work

| You see | Do this |
|---|---|
| "GitHub didn't accept that key" / "invalid or expired" | Create a new key (step 4) and paste it again. |
| "This account has no access to temporary-hq-data" | Accept the GitHub invitation (step 2). Make sure the key has **repo** ticked. |
| "…is PUBLIC" | Make the data repo private: repo **Settings → General → Danger zone → Change visibility**. |
| "That answer isn't valid JSON" | Copy the AI's **whole** reply. If it was cut off, type "continue the JSON" there and paste both parts. Or lower *Pieces per paste* in Settings. |
| A video won't process | Download it from Flow as **MP4**. The first video takes longer because the browser loads the video engine once. |
| Website shows an old version | Hard-refresh: **Ctrl + Shift + R**. |
