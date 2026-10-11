# Setup guide — TEMP. HQ

About 30–40 minutes, once. Everything here is **free**.

**What you're setting up**

- **GitHub** hosts the website, using GitHub Pages.
  - The repo holds only the site's code: no brand data, files or keys.
  - Anyone who finds the address sees only a login screen.
- **Supabase** (free plan) holds your data:
  - brand bible, products, plans and content
  - logo, artwork, mask, photos and videos
  - It's locked inside the database to **seifelkasseify@gmail.com** and **temporary.eg26@gmail.com**. Any other email gets nothing.
- **Claude, ChatGPT and Flow** are used through the plans you already pay for, by copy and paste. No API keys and no extra cost.

---

## 1. Create the Supabase project (your private data)

1. Go to **supabase.com** → **Start your project** → sign up with **seifelkasseify@gmail.com**.
2. Click **New project**:
   - Name: `temporary-hq`.
   - Database password: choose one and save it somewhere safe.
   - Region: **Central EU (Frankfurt)**, the closest to Egypt.
   - Click **Create new project** and wait about 2 minutes.
3. Left menu → **SQL Editor** → **New query**.
4. Open `supabase-setup/schema.sql` from the zip (it stays on your computer — don't upload it to GitHub), copy **all** of it, paste it in, and click **Run**. You should see *Success*.

   This creates:
   - the private tables and file storage
   - the 2-email lock
   - TEMPORARY™ with its brand bible and 9 products

## 2. Lock the login to your two emails

1. **Authentication → Users → Add user → Create new user**.
   - Email: `seifelkasseify@gmail.com`. Tick **Auto Confirm User**. Leave the password empty or set any password; you'll log in with an email code.
   - Repeat for `temporary.eg26@gmail.com`.
2. **Authentication → Sign In / Providers**: turn **off** “Allow new users to sign up”. Leave **Email** enabled.
3. **Authentication → Emails → Templates → Magic Link**. Replace the message body with:

   ```
   <h2>TEMP. HQ</h2>
   <p>Your login code: <strong>{{ .Token }}</strong></p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to log in</a>.</p>
   ```

   Click **Save**.

The lock now has three layers:
- only these two accounts exist
- sign-ups are off
- the database refuses every request that doesn't come from one of the two emails

## 3. Put the website on GitHub

1. Sign in to **github.com** and click **New repository**:
   - Name: `temporary-hq`.
   - Choose **Public**. Free GitHub Pages needs that; the repo contains only website code, never your data.
   - Click **Create repository**.
2. On the new repo page click **uploading an existing file**.
3. Unzip `temporary-hq.zip`. Open the `temporary-hq` folder and drag **everything inside it** onto the GitHub page. Then click **Commit changes**.
   - The `.github` folder is hidden on Mac. Press **Cmd + Shift + .** in Finder to show it, and make sure it's included.
   - If it didn't upload, use **Add file → Create new file**:
     1. Name the file `.github/workflows/deploy.yml`.
     2. Paste in the contents of that file from the zip.
     3. Commit.
4. **Settings → Pages**: under *Build and deployment → Source*, choose **GitHub Actions**.

## 4. Connect the website to Supabase

1. In Supabase, open **Project Settings → API Keys**. Copy:
   - your **Project URL** (also shown under *Project Settings → Data API*), e.g. `https://abcdxyz.supabase.co`
   - the **Publishable key** (older projects call it the **anon public** key)

   Both values are meant to be public. The database lock is what protects your data. **Never** copy the *secret* / *service_role* key anywhere.
2. In GitHub, open the repo → **Settings → Secrets and variables → Actions → Variables** tab → **New repository variable**. Add two:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your publishable / anon key |

3. Go to the **Actions** tab → **Deploy website** → **Run workflow**. After about 1 minute it's live at:

   **`https://<your-github-username>.github.io/temporary-hq/`**

4. Back in Supabase: **Authentication → URL Configuration**:
   - Set **Site URL** to that address.
   - Add it under **Redirect URLs** too.

   This makes the “tap here to log in” link in the email work.

## 5. First login

Open the website, enter your email, and type the 6-digit code from the email. That's it. Do the same on your phone. You stay logged in on each device.

## 6. Set up chat with the team (Claude and ChatGPT Projects)

1. In the website go to **Settings → Download knowledge file**.
2. In **Claude**, go to **Projects → New project**, name it `TEMPORARY™ HQ`, and add the file to **Project knowledge**.
3. In **ChatGPT**, go to **Projects (sidebar) → New project**, name it `TEMPORARY™ HQ`, and add the same file.
4. Chat there any time. Both will know the brand, products, current plan and latest trends. Re-upload the file after each new plan or trend analysis.

---

## How you'll use it (the weekly loop)

The **Overview** page always tells you the next step.

1. **Trend Radar.** Copy the research pack to **ChatGPT** with web search on, then paste its answer back. Then copy the analysis pack to **Claude**, which picks trends and **invents new ones**, and paste its answer back.
2. **Plan.** Write the goal, copy the pack to **Claude**, and paste the answer back. You get a full calendar of briefs.
3. **Content → Write the next pieces.** Copy to **ChatGPT**, which writes 5 pieces per paste, and paste back. The site checks every brand rule automatically:
   - prices against the catalogue
   - no discounts or fake urgency
   - no stock numbers
   - no website mentions
   - no invented specs
4. **Content → Final review.** Copy to **Claude**. Approved pieces come to you. Sent-back pieces return to step 3 with Claude's note.
5. **Open each piece:**
   - Copy each image prompt into **Flow** (Nano Banana) or **ChatGPT**, and copy the video prompt into **Flow** (Veo).
   - Download each result and press **Upload result**. The site pastes your original logo on top and checks it pixel by pixel.
   - Add the slide text.
   - **Approve**, post it, then press **Mark as posted**.

**If Claude hits its limit:** tick “Claude at its limit — send manager work to ChatGPT” in the top bar. Untick it when Claude is back.

## Before your first plan

- **Brands**: paste your Google Forms order link.
- **Products**: confirm each price (tick *Confirmed*), add sizes and colours, set availability, and add only verified materials. The Long Sleeve price is blank on purpose; it's never mentioned until you fill it in.
- **Assets**: upload the logo (transparent PNG), the artwork files, the founder mask (cut-out PNG) and real product photos. On each product photo, click **Protect area** and draw a box over the print.

---

## Free-plan limits to know

- **Supabase free**: 1 GB of files and 500 MB of database. Images are small, but videos add up. Download finished videos and remove old drafts from time to time.
- A free Supabase project **pauses after 7 days with no activity**. If the site says it can't connect, open supabase.com and click **Restore project**. Using HQ weekly avoids this.
- **Login emails**: Supabase's built-in email sender allows only a few emails per hour. That's fine for two people, who stay logged in.

## Changing who has access

In Supabase → **SQL Editor**, run:

```sql
-- add someone
insert into team_members (email) values ('new.person@gmail.com');
-- remove someone
delete from team_members where email = 'old.person@gmail.com';
```

For a new person, also add them under **Authentication → Users → Add user**.

## Updating the website

Edit or upload files in the GitHub repo. The **Deploy website** action republishes automatically within a minute.

## If something doesn't work

| You see | Do this |
|---|---|
| “TEMP. HQ isn't connected yet” | Step 4: check both variables, then re-run **Actions → Deploy website**. |
| “This email doesn't have access” | Step 2.1: the email must be added as a user, and it must be in `team_members`. |
| No email arrives | Check spam. Wait a minute; the free sender is rate-limited. |
| The login link opens the wrong page | Step 4.4: set the Site URL and Redirect URL. |
| “That answer isn't valid JSON” | Copy ChatGPT's or Claude's **whole** reply. If it was cut off, type “continue the JSON” there, then paste both parts together. Or lower *Pieces per paste* in Settings. |
| A video won't process | Download it from Flow as **MP4**. The first video takes longer while the browser loads the video engine once. |
| “Mark the design” / edit rejected | Draw the protect boxes tightly around the print. Ask Flow/ChatGPT to change only the background. |
