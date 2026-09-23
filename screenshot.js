import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1000 });
    
    // Log console and errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Helper to take screenshot
    const takeScreenshot = async (name) => {
      await page.screenshot({ path: `C:\\Users\\HEPL INTERN\\.gemini\\antigravity\\brain\\f8ee1437-2f77-433f-b6fc-2b3045950d15\\screenshot_${name}.png` });
      console.log(`Saved screenshot_${name}.png`);
    };

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Screen 1: Details
    await takeScreenshot('step1');

    // Click "AI Settings" to see the modal
    console.log("Opening AI Settings...");
    await page.click('button.btn-secondary'); // AI Settings button
    await new Promise(r => setTimeout(r, 500));
    await takeScreenshot('step1_settings_modal');
    
    // Close AI Settings modal
    await page.evaluate(() => {
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) overlay.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Navigate to step 2: Upload syllabus
    console.log("Navigating to step 2...");
    let pills = await page.$$('.step-pill');
    for (let i = 0; i < pills.length; i++) {
      const text = await page.evaluate(el => el.innerText, pills[i]);
      const className = await page.evaluate(el => el.className, pills[i]);
      console.log(`Pill ${i}: Text="${text.replace(/\n/g, ' ')}", Class="${className}"`);
    }
    
    console.log("Clicking pill 1...");
    await page.evaluate(() => {
      const el = document.querySelectorAll('.step-pill')[1];
      if (el) el.click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    // Check state after click
    pills = await page.$$('.step-pill');
    for (let i = 0; i < pills.length; i++) {
      const className = await page.evaluate(el => el.className, pills[i]);
      console.log(`Pill ${i} after click: Class="${className}"`);
    }
    
    await takeScreenshot('step2');

    // Navigate to step 3: Sections & marks
    console.log("Navigating to step 3...");
    await pills[2].click(); // Click Sections & marks
    await new Promise(r => setTimeout(r, 500));
    await takeScreenshot('step3');

    // Navigate to step 4: Preview & export
    console.log("Navigating to step 4...");
    await pills[3].click(); // Click Preview & export
    await new Promise(r => setTimeout(r, 500));
    await takeScreenshot('step4');

    // Print PDF
    console.log("Printing page 4 to PDF...");
    await page.pdf({ 
      path: 'C:\\Users\\HEPL INTERN\\.gemini\\antigravity\\brain\\f8ee1437-2f77-433f-b6fc-2b3045950d15\\test_paper.pdf', 
      format: 'A4',
      printBackground: true
    });
    console.log("Saved test_paper.pdf");

    await browser.close();
  } catch (error) {
    console.error("Error:", error);
  }
})();
