import puppeteer from 'puppeteer';

(async () => {
  console.log("Starting Puppeteer check...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle2' });
  
  await page.evaluate(() => {
    document.getElementById('composeTab').click();
    document.getElementById('aiBrief').value = 'Test';
    document.getElementById('generateBtn').click();
  });
  
  console.log("Waiting for AI Ready and Generation...");
  
  // Wait until we see '[Raw Output]' or 'Generated content' in the chat, or 2 minutes elapse
  await page.waitForFunction(() => {
    return document.getElementById('aiChat').innerText.includes('[Raw Output]') || 
           document.getElementById('aiChat').innerText.includes('Generated content') ||
           document.getElementById('aiChat').innerText.includes('Generation Error');
  }, { timeout: 60000 }).catch(e => console.log("Timeout waiting for chat update"));

  const chatHTML = await page.evaluate(() => document.getElementById('aiChat').innerHTML);
  console.log("====== CHAT HTML ======");
  console.log(chatHTML);
  console.log("=======================");
  
  await browser.close();
})();
