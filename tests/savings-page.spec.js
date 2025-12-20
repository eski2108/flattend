/**
 * Automated Tests for Notice Savings Page
 * Ensures no APY/staking terminology appears and all flows work correctly
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.TEST_URL || 'https://savingsflow-1.preview.emergentagent.com';

test.describe('Notice Savings Page - Content Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/savings`);
    await page.waitForLoadState('networkidle');
  });

  test('should NOT contain crypto-staking/APY terminology', async ({ page }) => {
    // These terms should NOT appear on a notice savings page
    const forbiddenTerms = [
      'Annual Percentage Yield',
      'APY',
      'APR',
      'Earn Interest',
      'Interest Rate',
      'Staking Rewards',
      'Yield Farming',
      'Maximum Returns',
      'Balanced Earnings'
    ];

    const pageContent = await page.textContent('body');
    
    for (const term of forbiddenTerms) {
      expect(pageContent).not.toContain(term);
      console.log(`✅ Verified: "${term}" does NOT appear`);
    }
  });

  test('should contain correct notice savings terminology', async ({ page }) => {
    // These terms SHOULD appear
    const requiredTerms = [
      'Notice',
      'Lock',
      'Days',
      'Early Withdrawal',
      'Fee'
    ];

    const pageContent = await page.textContent('body');
    
    for (const term of requiredTerms) {
      expect(pageContent).toContain(term);
      console.log(`✅ Verified: "${term}" appears correctly`);
    }
  });

  test('should display currency selector with GBP/USD/EUR options', async ({ page }) => {
    // Find currency toggle button
    const currencyBtn = page.locator('.currency-toggle-btn');
    await expect(currencyBtn).toBeVisible();
    
    // Click to open dropdown
    await currencyBtn.click();
    await page.waitForTimeout(500);
    
    // Check all currency options exist
    await expect(page.locator('.currency-option:has-text("GBP")')).toBeVisible();
    await expect(page.locator('.currency-option:has-text("USD")')).toBeVisible();
    await expect(page.locator('.currency-option:has-text("EUR")')).toBeVisible();
    
    console.log('✅ Currency selector working with GBP/USD/EUR');
  });

});

test.describe('Notice Savings Page - Add to Savings Flow', () => {

  test('Add to Savings button should open modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/savings`);
    await page.waitForLoadState('networkidle');
    
    // Find and click Add to Savings button
    const addBtn = page.locator('button:has-text("Add to Savings")').first();
    await addBtn.click();
    await page.waitForTimeout(1000);
    
    // Modal should appear with Step 1
    await expect(page.locator('text=Step 1')).toBeVisible();
    await expect(page.locator('text=Select Wallet')).toBeVisible();
    
    console.log('✅ Add to Savings modal opens correctly');
  });

  test('Full 5-step deposit flow should work', async ({ page }) => {
    await page.goto(`${BASE_URL}/savings`);
    await page.waitForLoadState('networkidle');
    
    // Step 1: Open modal
    await page.locator('button:has-text("Add to Savings")').first().click();
    await page.waitForTimeout(800);
    await expect(page.locator('text=Step 1')).toBeVisible();
    console.log('✅ Step 1: Select Wallet');
    
    // Step 2: Click Next
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(800);
    await expect(page.locator('text=Step 2')).toBeVisible();
    await expect(page.locator('text=cryptocurrencies available')).toBeVisible();
    console.log('✅ Step 2: Select Coin (NowPayments connected)');
    
    // Select first coin
    await page.locator('.coin-option-card').first().click();
    await page.waitForTimeout(500);
    
    // Step 3: Click Next
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(800);
    await expect(page.locator('text=Step 3')).toBeVisible();
    console.log('✅ Step 3: Enter Amount');
    
    // Enter amount
    await page.locator('.deposit-input').fill('0.001');
    
    // Step 4: Click Next
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(800);
    await expect(page.locator('text=Step 4')).toBeVisible();
    console.log('✅ Step 4: Select Notice Period');
    
    // Step 5: Click Next
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(800);
    await expect(page.locator('text=Step 5')).toBeVisible();
    await expect(page.locator('text=Proceed to Payment')).toBeVisible();
    console.log('✅ Step 5: Confirm - Proceed to Payment button visible');
  });

  test('NowPayments integration - should show 200+ coins', async ({ page }) => {
    await page.goto(`${BASE_URL}/savings`);
    await page.waitForLoadState('networkidle');
    
    // Open modal and go to Step 2
    await page.locator('button:has-text("Add to Savings")').first().click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(1000);
    
    // Check coin count
    const coinCountText = await page.locator('.step-subtitle').textContent();
    const match = coinCountText.match(/(\d+)/);
    const coinCount = match ? parseInt(match[1]) : 0;
    
    expect(coinCount).toBeGreaterThan(200);
    console.log(`✅ NowPayments connected: ${coinCount} cryptocurrencies available`);
  });

});

test.describe('Notice Savings Page - Lock Period Cards', () => {

  test('should display 30, 60, 90 day lock options', async ({ page }) => {
    await page.goto(`${BASE_URL}/savings`);
    await page.waitForLoadState('networkidle');
    
    // Scroll to lock cards
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);
    
    // Check all three lock periods exist
    await expect(page.locator('text=30').first()).toBeVisible();
    await expect(page.locator('text=60').first()).toBeVisible();
    await expect(page.locator('text=90').first()).toBeVisible();
    
    console.log('✅ All lock period options (30/60/90 days) visible');
  });

  test('lock cards should show Secure Storage, not APY', async ({ page }) => {
    await page.goto(`${BASE_URL}/savings`);
    await page.waitForLoadState('networkidle');
    
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);
    
    // Should show "Secure Storage" not APY percentages
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Secure Storage');
    expect(pageContent).not.toContain('4.2%');
    expect(pageContent).not.toContain('5.0%');
    
    console.log('✅ Lock cards show "Secure Storage" (no APY)');
  });

});

test.describe('Site Health Checks', () => {

  test('homepage should load successfully', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/`);
    expect(response.status()).toBe(200);
    console.log('✅ Homepage loads (200 OK)');
  });

  test('savings page should load successfully', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/savings`);
    expect(response.status()).toBe(200);
    console.log('✅ Savings page loads (200 OK)');
  });

  test('login page should load successfully', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/login`);
    expect(response.status()).toBe(200);
    console.log('✅ Login page loads (200 OK)');
  });

  test('API health check', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/api/health`);
    // API might return JSON or redirect, just check it doesn't error
    expect(response.status()).toBeLessThan(500);
    console.log('✅ API responding');
  });

});
