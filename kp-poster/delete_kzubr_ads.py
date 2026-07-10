import asyncio
import os
import sys
import shutil
import subprocess
from playwright.async_api import async_playwright

def copy_profile():
    src_dir = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data")
    dst_dir = os.path.expandvars(r"%LOCALAPPDATA%\Temp\chrome_temp_profile")
    if os.path.exists(dst_dir):
        try:
            shutil.rmtree(dst_dir)
        except Exception as e:
            pass
    os.makedirs(dst_dir, exist_ok=True)
    shutil.copy2(os.path.join(src_dir, "Local State"), os.path.join(dst_dir, "Local State"))
    src_profile = os.path.join(src_dir, "Profile 3")
    dst_profile = os.path.join(dst_dir, "Profile 3")
    os.makedirs(dst_profile, exist_ok=True)
    exclude = {"Cache", "Code Cache", "Service Worker"}
    for item in os.listdir(src_profile):
        s = os.path.join(src_profile, item)
        d = os.path.join(dst_profile, item)
        if os.path.isdir(s):
            if item in exclude:
                continue
            try:
                shutil.copytree(s, d)
            except:
                pass
        else:
            try:
                shutil.copy2(s, d)
            except:
                pass

async def main():
    sys.stdout.reconfigure(encoding="utf-8")
    print("Terminating Chrome...")
    os.system("taskkill /f /im chrome.exe")
    await asyncio.sleep(2)
    
    copy_profile()
    
    dst_dir = os.path.expandvars(r"%LOCALAPPDATA%\Temp\chrome_temp_profile")
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    
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
    
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else await context.new_page()
        await page.set_viewport_size({"width": 1280, "height": 800})
        
        print("Navigating to Moji Oglasi...")
        await page.goto("https://www.kupujemprodajem.com/moj-kp/moji-oglasi", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        
        # Click cookies if present
        cookie_btn = await page.query_selector("button:has-text('Prihvatam')")
        if cookie_btn:
            try:
                await cookie_btn.click(force=True)
                await page.wait_for_timeout(1000)
            except Exception as e:
                print(f"Cookie click error: {e}")
                
        # Wait for login overlay to disappear if present
        try:
            await page.wait_for_selector("div[class*='SuccessLoginOverlay']", state="hidden", timeout=5000)
            print("Login overlay is gone.")
        except:
            pass
            
        print("Searching for Kzubr ad elements...")
        ad_cards = await page.locator("section[class*='itemHolder']", has=page.locator("text=Kzubr")).all()
        print(f"Found {len(ad_cards)} Kzubr ad cards.")
        
        while len(ad_cards) > 0:
            card = ad_cards[0]
            # Try to get the title
            title_text = "Unknown title"
            try:
                title_text = await card.locator("a[class*='Link']").nth(1).inner_text()
            except:
                pass
            print(f"\nDeleting ad: '{title_text}'...")
            
            del_btn = card.locator("button:has-text('Obriši')").first
            if await del_btn.count() > 0:
                await del_btn.click(force=True)
                await page.wait_for_timeout(2000)
                
                # Check the 'reason' radio button with value='other' or 'sold'
                reason_radio = page.locator("input[name='reason'][value='other']").first
                if await reason_radio.count() > 0:
                    await reason_radio.check(force=True)
                    print("Checked deletion reason 'other'.")
                else:
                    reason_radio = page.locator("input[name='reason']").first
                    if await reason_radio.count() > 0:
                        await reason_radio.check(force=True)
                        print("Checked first available deletion reason.")
                        
                await page.wait_for_timeout(1000)
                
                # Click the modal submit button "Obrišite oglas"
                confirm_btn = page.locator("button:has-text('Obrišite oglas')").first
                if await confirm_btn.count() > 0:
                    await confirm_btn.click(force=True)
                    print("Clicked 'Obrišite oglas' confirmation button.")
                    # Wait for deletion to complete and modal to close
                    await page.wait_for_timeout(4000)
                else:
                    print("Could not find 'Obrišite oglas' confirmation button in modal.")
                    break
            else:
                print("Could not find 'Obriši' button on card.")
                break
                
            # Re-fetch cards
            ad_cards = await page.locator("section[class*='itemHolder']", has=page.locator("text=Kzubr")).all()
            print(f"Remaining Kzubr ad cards: {len(ad_cards)}")
            
        print("\nAll matching Kzubr ads deleted successfully.")
        await page.screenshot(path="moji_oglasi_final_clean.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
