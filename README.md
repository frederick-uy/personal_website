# personal_website
Personal Website - www.frederickuy.com


Personal site for Frederick Uy: data engineer and FMU Photography.
It's a plain HTML/CSS site with no build step, hosted free on Cloudflare Pages.

**Preview it now:** double-click `index.html` and it opens in your browser. Every page link works locally.

---

## What's in here

| File / folder | What it is |
|---|---|
| `index.html`, `work.html`, `photography.html`, `about.html` | The four pages |
| `404.html` | "Page not found" page |
| `css/style.css` | All styling (colors and fonts are at the top) |
| `js/main.js` | Mobile menu, portfolio filters, contact-form toggle |
| `images/` | Web-optimized photos (WebP) |
| `files/` | Put `frederick-uy-resume.pdf` here |
| `sitemap.xml`, `robots.txt` | Tell Google which pages exist |
| `_redirects` | Sends old WordPress URLs to the new pages (keeps your rankings) |
| `_headers` | Caching and security settings for Cloudflare |
| `tools/optimize_images.py` | Turns full-size photos into website images |

---

## Before launch: fill these in

- [ ] **Photos:** replace the images in `images/` with high-quality versions from your originals using `tools/optimize_images.py`. The current ones were captured from the old site at reduced resolution. Keep the same file names, or update the `src="images/..."` lines.
- [ ] **Résumé:** add `files/frederick-uy-resume.pdf`.
- [ ] **Contact forms:** create a free form at formspree.io, then replace `YOUR_FORM_ID` in `photography.html` and `about.html`.
- [ ] **Placeholders in [brackets]:** your degree (work.html), the Google case-study result (work.html), and photo delivery days (photography.html).
- [ ] **Writing section:** the three essays show "coming soon". Paste in your old blog posts or remove the section.

---

## Launch steps

Button names in the Cloudflare and GitHub dashboards change now and then, so look for the closest match.

### 1. Put the site on GitHub
1. Create a free account at github.com.
2. Click **New repository**, name it `frederickuy.com`, and choose Public (or Private).
3. On the empty repo page, click **uploading an existing file**.
4. Drag **the contents** of this folder in (not the folder itself), then click **Commit changes**.

### 2. Publish with Cloudflare Pages
1. Create a free account at cloudflare.com.
2. Go to **Workers & Pages → Create → Pages → Connect to Git** and pick your repo.
3. Build settings: Framework preset **None**, build command **empty**, output directory **`/`**.
4. Click **Deploy**. You'll get a free preview address like `frederickuy.pages.dev`. Check every page there.

### 3. Point frederickuy.com at it (do this before Hostinger expires on Nov 30)
1. In Cloudflare, click **Add a domain**, enter `frederickuy.com`, and pick the **Free** plan.
2. Cloudflare shows you **two nameservers**. In Hostinger, go to Domains → frederickuy.com → **DNS / Nameservers → Change nameservers** and paste them in.
3. Wait until Cloudflare says the domain is **Active**. This takes minutes to a few hours.
4. In your Pages project, go to **Custom domains** and add both `frederickuy.com` and `www.frederickuy.com`.
5. Turn **off auto-renew** for the Hostinger *hosting* plan. Keep the *domain* registration active until it's transferred.

### 4. Free email at your domain
In Cloudflare, go to **Email → Email Routing**, create `hello@frederickuy.com`, and forward it to your Gmail.

### 5. SEO setup (about 15 minutes)
1. **Google Search Console:** add `frederickuy.com` as a Domain property. Cloudflare can add the verification record for you. Then submit `https://frederickuy.com/sitemap.xml`.
2. **Google Business Profile:** create "FMU Photography" as a service-area business covering Tacoma and Seattle, with the website set to `https://frederickuy.com/photography`. Ask past clients for reviews.
3. **Cloudflare Web Analytics:** turn it on for the site (free, no cookie banner needed).
4. Update your website link on LinkedIn, Instagram and Facebook.

### 6. Move the domain to Cloudflare Registrar (optional, saves about $10/yr)
1. In Hostinger, **unlock** the domain and get the **transfer / EPP code**.
2. In Cloudflare, go to **Domain Registration → Transfer**, enter the code, and pay one year (about $11). That year is added to your current term.
3. Domains can't be transferred within 60 days of being registered or last transferred.

---

## Making changes later

1. Edit the file (or ask Claude to).
2. On GitHub, open the file and click the pencil icon to edit, or use **Add file → Upload files** to replace it.
3. Click **Commit changes**. Cloudflare republishes automatically in about a minute.

**Adding photos:** run the optimizer, upload the new `.webp` files to `images/`, then copy one of the `<figure ...>` lines in `photography.html` and change the file name, alt text and `data-cat` (`portrait`, `grad`, `couple` or `street`). Always write real alt text, such as "Graduate tossing cap at UW Tacoma". Google reads it.

**After adding a page:** add it to `sitemap.xml`.
