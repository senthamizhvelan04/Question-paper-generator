
import { chromium } from 'playwright';

(async () => {
  try {
    console.log("Launching visible browser for live demo...");
    // Open a visible browser window (not headless)
    const browser = await chromium.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    const page = await browser.newPage();
    
    // Slow down puppeteer operations so the user can watch it happen
    const delay = (time) => new Promise(r => setTimeout(r, time));

    console.log("Navigating to the app...");
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle0' });
    
    await delay(1500); // Let the user see the start screen

    // Click Next
    console.log("Clicking Next...");
    await page.waitForSelector('.navigation-footer .btn-primary');
    await page.click('.navigation-footer .btn-primary');
    
    await delay(1500);
    
    // Click Add MCQ Section
    console.log("Adding an MCQ section...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.qtype-btn'));
      const mcqBtn = btns.find(b => b.innerText.includes('Multiple choice'));
      if (mcqBtn) mcqBtn.click();
    });
    
    await delay(1500);
    
    // Click "✨ Auto-Generate"
    console.log("Clicking Auto-Generate...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.btn-primary.btn-sm'));
      const generateBtn = btns.find(b => b.innerText.includes('Auto-Generate'));
      if (generateBtn) generateBtn.click();
    });
    
    await delay(1500);
    await page.waitForSelector('.modal-content', { visible: true });
    
    // Upload eda.txt
    console.log("Uploading eda.txt...");
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile('C:\\Users\\HEPL INTERN\\Documents\\eda.txt');
    }
    
    await delay(2000); // Let user see the file was uploaded
    
    // Click Generate questions
    console.log("Generating questions...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.modal-content .btn-primary'));
      const generateBtn = btns.find(b => b.innerText.includes('Generate questions'));
      if (generateBtn) generateBtn.click();
    });
    
    // Watch the loading bar
    await delay(5000);
    
    // Wait on the final screen so the user can read the generated questions
    console.log("Live demo complete! Leaving browser open for 10 seconds.");
    await delay(10000);
    
    await browser.close();
  } catch (error) {
    console.error("Error during automation:", error);
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
})();
