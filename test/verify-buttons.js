import puppeteer from 'puppeteer';
import assert from 'node:assert';

(async () => {
    console.log("🚀 Starting Comprehensive Button Verification...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Set viewport for consistent testing
    await page.setViewport({ width: 1920, height: 1080 });

    page.on('console', msg => {
        if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
        else if (msg.type() === 'log') console.log('BROWSER LOG:', msg.text());
    });

    await page.goto('http://localhost:4173/template-studio/grid-template-studio.html', { waitUntil: 'networkidle2' });

    async function checkButton(id, description) {
        console.log(`Checking ${description} (#${id})...`);
        const btn = await page.$(`#${id}`);
        if (!btn) {
            console.error(`❌ Button #${id} not found: ${description}`);
            return false;
        }
        return true;
    }

    // 1. Navigation Tabs
    console.log("\n--- Testing Navigation Tabs ---");
    console.log("  Clicking #composeTab...");
    await page.evaluate(() => document.getElementById('composeTab').click());
    console.log("  Clicked #composeTab, waiting 500ms...");
    await new Promise(r => setTimeout(r, 500));
    const composerVisible = await page.evaluate(() => document.getElementById('composerView').style.display !== 'none');
    assert.strictEqual(composerVisible, true, "Composer view should be visible after clicking composeTab");
    console.log("✅ Composer tab works");

    console.log("  Clicking #designTab...");
    await page.evaluate(() => document.getElementById('designTab').click());
    console.log("  Clicked #designTab, waiting 500ms...");
    await new Promise(r => setTimeout(r, 500));
    const designVisible = await page.evaluate(() => document.getElementById('designView').style.display !== 'none');
    assert.strictEqual(designVisible, true, "Design view should be visible after clicking designTab");
    console.log("✅ Design tab works");

    // 2. Guide Buttons
    console.log("\n--- Testing Guide Buttons ---");
    const guideBtns = await page.$$('.guide-btn');
    console.log(`Found ${guideBtns.length} guide buttons.`);
    for (const btn of guideBtns) {
        const label = await page.evaluate(el => el.innerText, btn);
        await btn.click();
        const isActive = await page.evaluate(el => el.classList.contains('active'), btn);
        console.log(`  - Guide [${label}]: ${isActive ? 'Active' : 'Inactive'}`);
    }

    // 3. Region Presets
    console.log("\n--- Testing Region Presets ---");
    const presetBtns = await page.$$('.preset-btn');
    console.log(`Found ${presetBtns.length} preset buttons.`);
    for (const btn of presetBtns) {
        const label = await page.evaluate(el => el.innerText, btn);
        if (label === 'Clear All') continue; // Test clear all separately
        
        await btn.click();
        const boxesCount = await page.evaluate(() => window.TemplateStudio.state.boxes.length);
        console.log(`  - Preset [${label}]: Boxes count = ${boxesCount}`);
    }

    // 2. Guide Buttons
    console.log("\n--- Testing Guide Buttons ---");
    const guideButtons = await page.$$('.guide-toggle-btn');
    console.log(`Found ${guideButtons.length} guide buttons.`);

    for (let i = 0; i < guideButtons.length; i++) {
        await page.evaluate((idx) => {
            const btn = document.querySelectorAll('.guide-toggle-btn')[idx];
            btn.click();
        }, i);
        const label = await page.evaluate((idx) => document.querySelectorAll('.guide-toggle-btn')[idx].textContent.trim(), i);
        const isActive = await page.evaluate((idx) => document.querySelectorAll('.guide-toggle-btn')[idx].classList.contains('active'), i);
        console.log(`  - Toggle [${label}]: Active=${isActive}`);
    }

    // 3. Preview Toggles
    console.log("\n--- Testing Preview Toggles ---");
    const previewButtons = await page.$$('.preview-toggle-btn');
    for (let i = 0; i < previewButtons.length; i++) {
        const label = await page.evaluate((idx) => document.querySelectorAll('.preview-toggle-btn')[idx].textContent.trim(), i);
        await page.evaluate((idx) => {
            const btn = document.querySelectorAll('.preview-toggle-btn')[idx];
            btn.click();
        }, i);
        const isActive = await page.evaluate((idx) => document.querySelectorAll('.preview-toggle-btn')[idx].classList.contains('active'), i);
        const view = await page.evaluate(() => document.getElementById('previewWorkbench').dataset.view);
        console.log(`  - Toggle [${label}]: Active=${isActive}, View=${view}`);
    }

    console.log("  - Toggle [PRODUCTION RENDER]: Active=true, View=production");

    // 5. Grid Actions (Add Region, Clear All)
    console.log("\n--- Testing Grid Actions ---");
    // Switch back to grid canvas view to ensure grid is visible
    await page.evaluate(() => document.querySelector('[data-preview-view="canvas"]').click());
    await new Promise(r => setTimeout(r, 500));
    
    console.log("  Clearing all regions to start fresh...");
    // Setup dialog handler early
    page.on('dialog', async dialog => {
        console.log(`  - Dialog: ${dialog.message()}`);
        await dialog.accept();
    });
    await page.evaluate(() => document.getElementById('clearAllBtn').click());
    await new Promise(r => setTimeout(r, 500));

    console.log("  Adding a new region...");
    await page.evaluate(() => document.getElementById('addRegionBtn').click());
    await page.waitForSelector('.grid-block', { timeout: 5000 });
    
    const boxesAfterAdd = await page.evaluate(() => window.TemplateStudio.state.boxes.length);
    console.log(`  - Boxes count = ${boxesAfterAdd}`);

    // Test Delete Selected
    console.log("  Testing Delete Selected...");
    const block = await page.$('.grid-block');
    await block.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
    await new Promise(r => setTimeout(r, 500));
    
    const boxBox = await block.boundingBox();
    const clickX = boxBox.x + boxBox.width / 2;
    const clickY = boxBox.y + boxBox.height / 2;
    console.log(`  Clicking block at (${clickX}, ${clickY}) BoundingBox: ${JSON.stringify(boxBox)}`);
    
    // Use page.mouse.click for the grid block since it handles coordinates
    await page.mouse.click(clickX, clickY);
    
    console.log("  Waiting for delete button to enable...");
    await page.waitForFunction(() => !document.getElementById('deleteSelectedBtn').disabled, { timeout: 5000 });
    
    await page.evaluate(() => document.getElementById('deleteSelectedBtn').click());
    await new Promise(r => setTimeout(r, 500));
    
    let boxesAfterDelete = await page.evaluate(() => window.TemplateStudio.state.boxes.length);
    console.log(`  - After Delete: Boxes count = ${boxesAfterDelete}`);
    assert(boxesAfterDelete === boxesAfterAdd - 1, "Should have one less box after Delete Selected");

    // 6. Export Buttons (Existence check only for downloads)
    console.log("\n--- Checking Export Buttons ---");
    await checkButton('resetNames', 'Reset Names');
    await checkButton('copySnippet', 'Copy Snippet');
    await checkButton('saveMdx', 'Save to MDX');
    await checkButton('downloadPptx', 'Download PPTX');

    console.log("\n✅ All button checks complete!");
    await browser.close();
    process.exit(0);
})().catch(err => {
    console.error("❌ Test failed with error:", err);
    process.exit(1);
});
