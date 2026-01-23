# Cloudflare Deployment Normalization Plan

## Objective

Fix the "White Screen" (missing CSS/JS) and "API Error" issues on Cloudflare Pages deployment for ToonSnap. Ensure a stable, reproducible build process.

## Root Cause Analysis

1.  **White Screen (UI Broken):** The previous deployment strategy (copying OpenNext assets) missed the actual Next.js static files (`_next/static`). The mismatch between Cloudflare's expected root and the build output caused 404s for CSS/JS.
2.  **API Errors:** The Cloudflare environment lacked Node.js compatibility flags, causing `node:http`, `child_process`, and `async_hooks` errors.
3.  **Infinite Loop:** Modifying the `build` script to call itself caused a recursion error.

## The Solution Architecture

We will enforce a **"Flat Root" structure** in `.vercel/output`.

| Component         | Source                        | Destination                   | Purpose                                                              |
| :---------------- | :---------------------------- | :---------------------------- | :------------------------------------------------------------------- |
| **Static Assets** | `.next/static`                | `.vercel/output/_next/static` | **Fixes UI/CSS.** Directly uses Next.js build artifacts.             |
| **Public Assets** | `.open-next/assets`           | `.vercel/output`              | Images, favicon, public files.                                       |
| **Server/API**    | `.open-next/server-functions` | `.vercel/output/_worker.js`   | **Fixes API.** Contains the Next.js server logic.                    |
| **Compatibility** | Script `copy-assets.js`       | (In-place patch)              | Renames `worker.js` -> `_worker.js` and prefixes `node:` to imports. |

## Implementation Steps

### 1. Codebase Verification (Completed)

- [x] **`wrangler.toml`**: Configured to point to `.vercel/output` (Root).
- [x] **`package.json`**: Restored standard `build` script. Added `cf-build` for custom Cloudflare deployment.
- [x] **`scripts/copy-assets.js`**:
  - **Logic Updated**: Now force-copies `.next/static` to ensure UI assets exist.
  - **Patching**: Auto-patches all Node.js built-in modules in the worker.

### 2. Cloudflare Configuration (User Action Required)

To apply this custom build logic, the Cloudflare Pages project **MUST** be configured to run our custom script instead of the default.

- **Build Command**: Change from `npm run build` to **`npm run cf-build`**.
  - _Why?_ `npm run build` only runs `next build`. It does NOT creating the `_worker.js` or moving the assets. `npm run cf-build` does everything.

### 3. Validation Checklist

After the next deployment:

1.  **Frontend**: Access `https://webtoon-converter.pages.dev/`.
    - Check: Is the background dark (Dark Mode)?
    - Check: Are buttons green/styled?
2.  **Backend Health**: Access `https://webtoon-converter.pages.dev/api/ai/start`.
    - Check: Expect JSON response `{"status": "alive", ...}`.
3.  **Feature Test**: Upload image -> Convert to Webtoon.
    - Check: Does it return a result image?

## Next Action

I will essentially wait for your confirmation that the **Cloudflare Build Command** has been updated to `npm run cf-build`. Once confirmed, we can trigger a new build (or just clicking "Retry" in Cloudflare dashboard will work if the setting is saved).
