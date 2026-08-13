# DirectRefer Chrome Extension

Get verified employee referrers at top Indian tech companies — right from LinkedIn and Naukri.

## Install (Developer Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder
5. The DirectRefer icon appears in your toolbar

## How It Works

- Visit a job listing on **LinkedIn** or **Naukri**
- The extension detects the company name
- A sidebar appears showing how many verified referrers are available on DirectRefer
- Click **Request a Referral** to go to the company's referral page on DirectRefer

## Create Icons

Before publishing to Chrome Web Store, generate PNG icons:

1. Open `icons/create-icons.html` in a browser
2. Right-click each canvas → Save as PNG
3. Save as `icon16.png`, `icon48.png`, `icon128.png`

Or use any 16x16, 48x48, 128x128 PNG files.

## Files

```
manifest.json      — Extension config (Manifest V3)
content.js         — Runs on LinkedIn/Naukri, detects company, fetches referrers
content.css        — Sidebar styles
popup.html         — Extension popup UI
popup.js           — Popup logic
background.js      — Service worker
icons/             — Extension icons (add your own PNGs)
```

## Privacy

- No data is collected or tracked
- The extension only reads the company name from job pages
- Referrer data comes from DirectRefer's public Supabase API
- No browsing history is stored
