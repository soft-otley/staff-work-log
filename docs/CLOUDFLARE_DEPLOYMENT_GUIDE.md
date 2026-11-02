# Cloudflare Pages & GitHub Deployment Guide

This guide details how to deploy the Staff Work Log & Team Management Web Application to Cloudflare Pages with Cloudflare Pages Functions for edge backend routing.

---

## 1. Prerequisites
- A [GitHub](https://github.com) account.
- A [Cloudflare](https://dash.cloudflare.com) account.
- Deployed Google Apps Script Web App URL (see `docs/DATABASE_SETUP_GUIDE.md`).

---

## 2. Push Code to GitHub

1. Initialize git in your project directory (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Staff Work Log & Team Management System"
   ```

2. Create a new repository on GitHub:
   - Repository name: `staff-work-log-system`
   - Visibility: Private or Public

3. Push your repository:
   ```bash
   git remote add origin https://github.com/<your-username>/staff-work-log-system.git
   git branch -M main
   git push -u origin main
   ```

---

## 3. Deploy on Cloudflare Pages

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. On the left navigation, select **Workers & Pages**.
3. Click **Create application** &rarr; select the **Pages** tab &rarr; click **Connect to Git**.
4. Authorize Cloudflare to access your GitHub account and select your `staff-work-log-system` repository.
5. In the **Set up builds and deployments** section:
   - **Project name**: `staff-work-log`
   - **Production branch**: `main`
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave blank or default)

6. Click **Environment variables (advanced)** and define the required secrets:

| Variable Name | Value | Description |
|---|---|---|
| `APPS_SCRIPT_URL` | `https://script.google.com/macros/s/.../exec` | Your Google Apps Script Web App URL |
| `APPS_SCRIPT_SECRET` | `sec_7f9c381a8b3e4d819e62319f07d2` | Shared HMAC-SHA256 signature secret |
| `SESSION_SECRET` | `<random-32-char-string>` | Edge cryptographic session key |
| `NODE_VERSION` | `20` | Recommended Node.js runtime version |

7. Click **Save and Deploy**.
8. Cloudflare Pages will execute `npm run build` and compile the `/functions/api/[[catchall]].ts` edge function automatically.

---

## 4. Production Domain & Verification

1. Once the deployment finishes, Cloudflare provides a production URL (e.g. `https://staff-work-log.pages.dev`).
2. Visit the URL in your browser.
3. Sign in using the Administrator credentials or bootstrap your production administrator account.
4. Go to **Google Sheets & Sync** in the navigation and click **Test HMAC Handshake** to confirm that the Cloudflare edge is signing and dispatching requests directly to Google Sheets!
