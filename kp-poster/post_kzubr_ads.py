import asyncio
import os
import sys
import shutil
import json
import subprocess
from playwright.async_api import async_playwright

def clean_line(line):
    line = line.strip()
    while line.startswith('-') or line.startswith('*') or line.startswith('•'):
        line = line[1:].strip()
    return line

def format_description(raw_desc):
    if not raw_desc:
        return ""
    
    # Normalize newlines
    normalized = raw_desc.replace('\r\n', '\n').replace('\r', '\n')
    raw_lines = normalized.split('\n')
    
    # Analyze lines
    analyzed_lines = []
    for line in raw_lines:
        trimmed = line.strip()
        if trimmed:
            starts_with_bullet = line.strip().startswith('-') or line.strip().startswith('*') or line.strip().startswith('•')
            analyzed_lines.append({
                "text": clean_line(trimmed),
                "starts_with_bullet": starts_with_bullet
            })
        else:
            analyzed_lines.append(None)
            
    # Group into blocks
    blocks = []
    current_list = []
    
    for i, line_info in enumerate(analyzed_lines):
        if line_info is None:
            if current_list:
                blocks.append(("list", current_list))
                current_list = []
            continue
            
        text = line_info["text"]
        starts_with_bullet = line_info["starts_with_bullet"]
        
        # Heading check
        # Phone number / contact check
        is_contact = False
        lower_text = text.lower()
        if "kontakt" in lower_text or any(char.isdigit() for char in text) and len([c for c in text if c.isdigit()]) >= 9:
            is_contact = True
            
        if is_contact:
            if current_list:
                blocks.append(("list", current_list))
                current_list = []
            continue
            
        # Heading check (ends with colon)
        if text.endswith(':'):
            if current_list:
                blocks.append(("list", current_list))
                current_list = []
            blocks.append(("heading", text))
            continue
            
        # Check if it was separated by blank lines in original text
        was_separated = (i == 0 or analyzed_lines[i-1] is None) and (i == len(analyzed_lines) - 1 or analyzed_lines[i+1] is None)
        
        # If it starts with bullet or is separated, it's an ordinary sentence
        if starts_with_bullet or was_separated:
            if current_list:
                blocks.append(("list", current_list))
                current_list = []
            blocks.append(("sentence", text))
        else:
            current_list.append(text)
            
    if current_list:
        blocks.append(("list", current_list))
        
    # Construct HTML paragraphs
    html_paragraphs = []
    for block_type, content in blocks:
        if block_type == "heading":
            # Headings DO NOT start with a dash!
            html_paragraphs.append(f"<p>{content}</p>")
        elif block_type == "sentence":
            html_paragraphs.append(f"<p>- {content}</p>")
        elif block_type == "list":
            list_items = [f"- {item}" for item in content]
            html_paragraphs.append(f"<p>{'<br>'.join(list_items)}</p>")
            
    return "".join(html_paragraphs)


def copy_profile():
    src_dir = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data")
    dst_dir = os.path.expandvars(r"%LOCALAPPDATA%\Temp\chrome_temp_profile")
    
    print(f"Copying profile from {src_dir} to {dst_dir}...")
    if os.path.exists(dst_dir):
        try:
            shutil.rmtree(dst_dir)
        except Exception as e:
            print(f"Warning: could not remove existing temp dir: {e}")
            
    os.makedirs(dst_dir, exist_ok=True)
    
    # Copy Local State
    local_state = os.path.join(src_dir, "Local State")
    if os.path.exists(local_state):
        shutil.copy2(local_state, os.path.join(dst_dir, "Local State"))
    
    # Copy Profile 3 excluding large dirs
    src_profile = os.path.join(src_dir, "Profile 3")
    dst_profile = os.path.join(dst_dir, "Profile 3")
    os.makedirs(dst_profile, exist_ok=True)
    
    exclude_dirs = {"Cache", "Code Cache", "Service Worker"}
    
    for item in os.listdir(src_profile):
        s = os.path.join(src_profile, item)
        d = os.path.join(dst_profile, item)
        if os.path.isdir(s):
            if item in exclude_dirs:
                continue
            try:
                shutil.copytree(s, d)
            except Exception as e:
                pass
        else:
            try:
                shutil.copy2(s, d)
            except Exception as e:
                pass
    print("Profile copied successfully!")

async def main():
    import sys
    import argparse
    sys.stdout.reconfigure(encoding="utf-8")
    
    parser = argparse.ArgumentParser(description="KP Kzubr Poster Automation")
    parser.add_argument("--count", type=int, default=1, help="Number of products to post")
    parser.add_argument("--dry-run", action="store_true", help="Perform a dry run (list active/missing ads without posting)")
    args, unknown = parser.parse_known_args()
    
    count_val = args.count
    dry_run_val = args.dry_run
    
    # --- PHASE 1: PREPARATION & SCRAPING ---
    print("Terminating existing Chrome processes...")
    os.system("taskkill /f /im chrome.exe")
    await asyncio.sleep(2)

    try:
        copy_profile()
    except Exception as e:
        print(f"Error copying profile: {e}")
        sys.exit(1)

    dst_dir = os.path.expandvars(r"%LOCALAPPDATA%\Temp\chrome_temp_profile")
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    
    print("Launching Chrome...")
    subprocess.Popen([
        chrome_path,
        f"--user-data-dir={dst_dir}",
        "--profile-directory=Profile 3",
        "--remote-debugging-port=9222",
        "--no-first-run",
        "--no-default-browser-check",
        "--skip-first-run-ui",
        "--host-rules=MAP alati.vercel.app 198.169.1.1"
    ])
    
    await asyncio.sleep(5)

    print("Connecting Playwright...")
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()
        await page.set_viewport_size({"width": 1280, "height": 800})
        
        # --- FETCH PRODUCTS FROM CONVEX API ---
        import urllib.request
        import urllib.parse
        
        print("Fetching products from Convex API...")
        api_url = "https://original-quail-837.convex.cloud/api/run/products/listPublic"
        req = urllib.request.Request(
            api_url,
            data=json.dumps({"args": {}}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req) as resp:
                api_data = json.loads(resp.read().decode("utf-8"))
                products = api_data.get("value", [])
        except Exception as e:
            print(f"Error fetching products from Convex API: {e}")
            await browser.close()
            return
            
        # Filter Kzubr products
        kzubr_products = [p for p in products if "kzubr" in p.get("name", "").lower()]
        print(f"Found {len(kzubr_products)} Kzubr products in Convex database.")
        
        # --- CHECK ACTIVE ADS ON KUPUJEMPRODAJEM ---
        print("Navigating to Moji Oglasi...")
        await page.goto("https://www.kupujemprodajem.com/moj-kp/moji-oglasi", wait_until="domcontentloaded")
        await page.wait_for_timeout(4000)
        
        cookie_btn = await page.query_selector("button:has-text('Prihvatam')")
        if cookie_btn:
            try:
                await cookie_btn.click(force=True)
                await page.wait_for_timeout(1000)
            except Exception:
                pass
                
        print("Searching for 'Kzubr' in Moji oglasi...")
        try:
            search_input = await page.wait_for_selector("input[placeholder='Pretražite u Moji oglasi...']", timeout=15000)
            await search_input.fill("Kzubr")
            await search_input.press("Enter")
            await page.wait_for_timeout(4000)
        except Exception as e:
            print(f"Error finding search input on Moji Oglasi: {e}")
            await browser.close()
            return
            
        active_titles = []
        while True:
            ad_cards = await page.locator("section[class*='itemHolder']").all()
            print(f"Found {len(ad_cards)} ad cards on current page.")
            for card in ad_cards:
                try:
                    links = await card.locator("a[class*='Link']").all()
                    for link in links:
                        text = await link.inner_text()
                        trimmed = text.strip()
                        if trimmed and "kzubr" in trimmed.lower() and trimmed not in active_titles:
                            active_titles.append(trimmed)
                except Exception as e:
                    print(f"Error reading ad card: {e}")
            
            next_page_btn = page.locator("a[class*='Pagination']:has-text('Sledeća')").first
            if await next_page_btn.count() > 0 and await next_page_btn.is_visible():
                print("Clicking next page in pagination...")
                await next_page_btn.click()
                await page.wait_for_timeout(4000)
            else:
                break
                
        print(f"\nActive Kzubr ads on KP ({len(active_titles)}):")
        for t in active_titles:
            print(f"  - {t}")
            
        # Compare Convex database with active ads
        missing_products = []
        for p in kzubr_products:
            db_name = p.get("name")
            found = False
            for active_title in active_titles:
                if db_name.lower().strip() == active_title.lower().strip():
                    found = True
                    break
            if not found:
                missing_products.append(p)
                
        print(f"\nMissing Kzubr products from KP ({len(missing_products)}):")
        for mp in missing_products:
            print(f"  - {mp.get('name')} (ID: {mp.get('id')})")
            
        # Load posted products history
        posted_file = "posted_products.json"
        if os.path.exists(posted_file):
            try:
                with open(posted_file, "r") as f:
                    posted_ids = json.load(f)
            except Exception:
                posted_ids = []
        else:
            posted_ids = []
            
        if dry_run_val or count_val <= 0:
            print("\nDry run completed. No ads were posted.")
            await browser.close()
            return
            
        if not missing_products:
            print("\nAll Kzubr products from database are currently active on KP. No posting needed.")
            await browser.close()
            return
            
        # Select target products to post
        to_post = missing_products[:count_val]
        print(f"\nQueueing {len(to_post)} products for posting.")
        
        for idx, target_product in enumerate(to_post):
            target_product_id = target_product.get("id")
            title_val = target_product.get("name")
            price_val = str(target_product.get("prodajnaCena", ""))
            
            print(f"\n[{idx+1}/{len(to_post)}] Posting: '{title_val}' (ID: {target_product_id})...")
            
            # Description (opisKp or opis)
            raw_desc = target_product.get("opisKp") or target_product.get("opis") or ""
            desc_val = format_description(raw_desc)
            
            if not desc_val or len(desc_val.strip()) < 30:
                desc_val = f"<p>- PROFESIONALNI {title_val.upper()}</p><p>- Odličan odnos cene i kvaliteta.<br>- Sve je novo i spremno za upotrebu.<br>- Slanje kurirskom službom na adresu i plaćanje pouzećem.<br>- Moguće i lično preuzimanje po dogovoru.<br>- Kontakt preko KP poruka.</p>"
                
            # Collect images
            img_urls = []
            for img in target_product.get("images", []):
                url = img.get("url")
                if url and url not in img_urls:
                    img_urls.append(url)
            if not img_urls:
                for variant in target_product.get("variants", []):
                    for img in variant.get("images", []):
                        url = img.get("url")
                        if url and url not in img_urls:
                            img_urls.append(url)
                            
            download_dir = "temp_images"
            if os.path.exists(download_dir):
                shutil.rmtree(download_dir)
            os.makedirs(download_dir, exist_ok=True)
            
            downloaded_paths = []
            img_count = 0
            for img_idx, url in enumerate(img_urls):
                if img_count >= 10:
                    break
                try:
                    print(f"  Downloading image {img_idx}: {url}...")
                    req_img = urllib.request.Request(
                        url,
                        headers={"User-Agent": "Mozilla/5.0"}
                    )
                    with urllib.request.urlopen(req_img) as resp_img:
                        body = resp_img.read()
                        
                    from PIL import Image
                    import io
                    
                    img = Image.open(io.BytesIO(body))
                    if img.mode in ("RGBA", "P", "LA"):
                        img = img.convert("RGB")
                    else:
                        img = img.convert("RGB")
                        
                    # Upscale image if under 1000px width
                    if img.width < 1000:
                        aspect = img.width / img.height
                        target_width = 1000
                        target_height = int(target_width / aspect)
                        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
                        print(f"  Upscaled image_{img_count}.jpg to {img.size}")
                        
                    path = os.path.join(download_dir, f"image_{img_count}.jpg")
                    img.save(path, "JPEG", quality=95)
                    downloaded_paths.append(os.path.abspath(path))
                    img_count += 1
                except Exception as e:
                    print(f"  Error processing image {img_idx}: {e}")
                    
            # Parse price
            price_digits = "".join([c for c in price_val if c.isdigit() or c in {',', '.'}]) if price_val else ""
            if ',' in price_digits:
                clean_price = price_digits.split(',')[0]
            elif '.' in price_digits:
                clean_price = price_digits.split('.')[0]
            else:
                clean_price = price_digits
                
            try:
                # Navigate to post page
                print("  Navigating to post page...")
                await page.goto("https://www.kupujemprodajem.com/postavljanje-oglasa", wait_until="domcontentloaded")
                await page.wait_for_timeout(4000)
                
                # Category selection
                def clean_category_query(t_val):
                    t = t_val.lower()
                    t = t.replace("kzubr", "").strip()
                    words = t.split()
                    clean_words = []
                    for w in words:
                        if any(c.isdigit() for c in w) or len(w) <= 1:
                            continue
                        clean_words.append(w)
                    return " ".join(clean_words[:3]).strip()
                    
                cat_query = clean_category_query(title_val)
                if not cat_query:
                    cat_query = "pneumatski odvijač"
                    
                print(f"  Searching category for: '{cat_query}'")
                try:
                    search_input = await page.wait_for_selector("input[placeholder*='npr. iPhone']", timeout=10000)
                    await search_input.fill(cat_query)
                    suggest_btn = page.locator("button:has-text('Predloži gde')").first
                    await suggest_btn.click()
                    await page.wait_for_timeout(3000)
                    
                    first_suggest = page.locator("button[class*='suggestionItem']").first
                    if await first_suggest.count() > 0:
                        await first_suggest.click()
                    else:
                        category_elem = await page.wait_for_selector("text=Pneumatski alat i kompresori")
                        await category_elem.click()
                except Exception as e:
                    print(f"  Category selection search failed, using default fallback: {e}")
                    category_elem = await page.wait_for_selector("text=Pneumatski alat i kompresori")
                    await category_elem.click()
                    
                await page.wait_for_timeout(4000)
                
                # Populate form (Step 2)
                print("  Populating Step 2 form...")
                await page.fill("input#name", title_val)
                await page.fill("input#price", clean_price)
                
                try:
                    await page.locator("input[name='currency'][value='eur']").check(force=True)
                except Exception:
                    pass
                    
                # TinyMCE
                await page.wait_for_selector("iframe#text-field-editor_ifr", timeout=15000)
                await page.evaluate("content => window.tinymce.get('text-field-editor').setContent(content)", desc_val)
                await page.evaluate("window.tinymce.triggerSave()")
                
                # Condition Kao novo
                await page.locator("input[name='condition'][value='as-new']").check(force=True)
                # Personal Pickup
                await page.locator("input#localPickupyes").check(force=True)
                
                # Image Upload
                if downloaded_paths:
                    print("  Uploading images...")
                    try:
                        file_input = page.locator("div[class*='photosHolder'] input[type='file']").first
                        await file_input.set_input_files(downloaded_paths)
                    except Exception:
                        try:
                            file_input = page.locator("input[type='file']").nth(1)
                            await file_input.set_input_files(downloaded_paths)
                        except Exception:
                            file_input = page.locator("input[type='file']").first
                            await file_input.set_input_files(downloaded_paths)
                    print("  Waiting 12 seconds for images to upload...")
                    await page.wait_for_timeout(12000)
                    
                await page.screenshot(path=f"kp_step2_fill_after_{target_product_id}.png")
                
                # Click next
                next_btn = page.locator("button:has-text('Sledeće')").first
                await next_btn.click()
                await page.wait_for_timeout(4000)
                
                # Step 3 (Promotions)
                print("  Skipping promotions (Step 3)...")
                try:
                    await page.locator("input[name='promoType'][value='none']").check(force=True)
                except Exception:
                    pass
                next_btn = page.locator("button:has-text('Sledeće')").first
                await next_btn.click()
                await page.wait_for_timeout(4000)
                
                # Step 4 (Declaration & Submit)
                print("  Submitting declaration (Step 4)...")
                try:
                    await page.locator("input[name='declarationType'][value='person']").check(force=True)
                except Exception:
                    try:
                        await page.locator("label:has-text('fizičko lice')").first.click()
                    except Exception:
                        pass
                        
                # Terms
                try:
                    await page.locator("input#acceptyes").check(force=True)
                except Exception:
                    try:
                        await page.locator("label[for='acceptyes']").click()
                    except Exception:
                        try:
                            await page.evaluate("document.getElementById('acceptyes').click()")
                        except Exception:
                            pass
                            
                # Submit
                submit_btn = page.locator("button:has-text('Postavite oglas')").first
                if not await submit_btn.is_visible():
                    submit_btn = page.locator("button:has-text('Sledeće')").first
                    
                await submit_btn.click()
                await page.wait_for_timeout(6000)
                
                print(f"  Successfully posted! Final URL: {page.url}")
                await page.screenshot(path=f"kp_post_final_{target_product_id}.png")
                
                if target_product_id not in posted_ids:
                    posted_ids.append(target_product_id)
                    with open(posted_file, "w") as f:
                        json.dump(posted_ids, f)
                        
                if idx < len(to_post) - 1:
                    print("  Waiting 10 seconds before next post...")
                    await asyncio.sleep(10)
                    
            except Exception as e:
                print(f"  [ERROR] Failed to post product {title_val}: {e}")
                await page.screenshot(path=f"error_post_{target_product_id}.png")
                
        await browser.close()
        print("\nAll tasks completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
