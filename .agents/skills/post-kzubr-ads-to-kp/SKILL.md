---
name: post-kzubr-ads-to-kp
description: Dynamically synchronizes Kzubr products from Convex to KupujemProdajem using Chrome Profile 3.
---

# post-kzubr-ads-to-kp

Dynamically checks active Kzubr ads on your KupujemProdajem profile and posts any missing ones from the Convex database.

## Overview

This skill automates the synchronization between your Convex database and KupujemProdajem:
1. It logs in via Playwright using Chrome `Profile 3`.
2. It fetches all Kzubr products from Convex.
3. It searches your active ads on KupujemProdajem for "Kzubr".
4. It identifies products in Convex that are missing on KupujemProdajem (e.g. never posted, expired, or deleted).
5. It posts the missing products to KupujemProdajem, including title, price, upscaled images (min 1000px width), and formatted description (without phone numbers/contacts).

## Utility Scripts

All poster commands should be executed from the `kp-poster/` directory.

### 1. Dry Run / Synchronization Check
To check which Kzubr products are currently active and which ones are missing without making any changes:
```powershell
python post_kzubr_ads.py --dry-run
```
*(Or specify `--count 0`)*

### 2. Post Missing Ads
To post the next `N` missing products (for example, 3 products):
```powershell
python post_kzubr_ads.py --count 3
```

## Common Mistakes

- **Chrome already running**: Make sure to close any Chrome windows using Profile 3 before running the script, otherwise remote debugging port `9222` will be blocked.
- **Phone numbers in descriptions**: KupujemProdajem blocks submissions containing phone numbers in the description text area. The script automatically filters these out, but raw database entries should ideally keep phone numbers out of description fields.
- **Image Size Limits**: KupujemProdajem rejects images under 1000px in width. The script automatically upscales them using PIL Lanczos filter.
