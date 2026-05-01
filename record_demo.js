const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
    const framesDir = path.join(__dirname, 'frames');
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);
    
    // Clear old frames
    const files = fs.readdirSync(framesDir);
    for (const file of files) {
        fs.unlinkSync(path.join(framesDir, file));
    }

    const browser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: "new"
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    let frameNum = 0;
    let recording = true;
    
    // Background loop to take screenshots
    const recordLoop = async () => {
        while (recording) {
            try {
                const framePath = path.join(framesDir, `frame_${String(frameNum++).padStart(4, '0')}.png`);
                await page.screenshot({ path: framePath });
                await new Promise(r => setTimeout(r, 100)); // ~10 fps
            } catch(e) {
                // ignore
            }
        }
    };

    console.log("Navigating to page...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    recordLoop();

    // The script execution:
    await new Promise(r => setTimeout(r, 2000)); // wait 2s to show initial screen
    
    console.log("Closing auth modal...");
    await page.evaluate(() => {
        const closeBtn = document.getElementById('auth-close-btn');
        if (closeBtn) closeBtn.click();
        
        // Also just hide the overlay in case
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'none';
    });
    
    await new Promise(r => setTimeout(r, 2000)); // wait 2s on empty dashboard
    
    console.log("Scrolling down to chat...");
    await page.evaluate(() => {
        window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log("Typing meal...");
    await page.type('#chat-input', 'I had a grilled chicken caesar salad and a diet coke for lunch', { delay: 100 });
    
    await new Promise(r => setTimeout(r, 500));
    console.log("Clicking send...");
    await page.click('#chat-send-btn');
    
    console.log("Waiting for AI response...");
    // wait until the calories change from 0 to something else, or max 15 seconds
    try {
        await page.waitForFunction(() => {
            const el = document.querySelector('.recharts-text.recharts-pie-label-text tspan');
            return el && el.textContent && el.textContent !== '0';
        }, { timeout: 15000 });
    } catch(e) {
        console.log("Timeout waiting for AI");
        // just wait 10 seconds fallback
        await new Promise(r => setTimeout(r, 10000)); 
    }
    
    await new Promise(r => setTimeout(r, 2000)); // wait 2s after it updates
    
    console.log("Scrolling back up...");
    await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    await new Promise(r => setTimeout(r, 4000)); // hold final state for 4s
    
    recording = false;
    await browser.close();
    console.log(`Saved ${frameNum} frames.`);
}

run().catch(console.error);
