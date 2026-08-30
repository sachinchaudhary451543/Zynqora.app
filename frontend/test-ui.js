const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173/login');
    console.log('Navigated to login');
    
    await page.fill('input[type="email"]', 'sarah@example.com');
    await page.fill('input[type="password"]', 'SecurePass123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('http://localhost:5173/');
    console.log('Logged in successfully');
    
    // Go to profile page
    await page.goto('http://localhost:5173/sarahsmith2026');
    await page.waitForLoadState('networkidle');
    console.log('Navigated to profile');
    
    // Create dummy image
    const imgPath = path.join(__dirname, 'dummy.png');
    fs.writeFileSync(imgPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));

    // Try to upload profile image. We need to find the file input.
    // The AvatarActionsModal uses an invisible file input.
    // We'll evaluate JS to find it and set its files, or use fileChooser.
    
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.evaluate(() => {
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.click();
        else console.log('File input not found');
      })
    ]).catch(e => {
        console.log('Error triggering file chooser', e);
        return [null];
    });

    if (fileChooser) {
        await fileChooser.setFiles(imgPath);
        console.log('Selected file');
        await page.waitForTimeout(2000); // Wait for upload
        console.log('Wait completed');
    }

    // Verify if profile image changed by getting src
    const src = await page.evaluate(() => {
        const img = document.querySelector('img[alt="Avatar"]');
        return img ? img.src : null;
    });
    console.log('Current Avatar SRC:', src);

  } catch (e) {
    console.error('Test failed:', e);
  } finally {
    await browser.close();
  }
})();
