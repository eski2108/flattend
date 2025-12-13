/**
 * Samsung Internet Color Fix
 * Forces exact colors by applying inline styles to override browser color adjustments
 */

// Detect Samsung Internet browser
const isSamsungBrowser = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('samsungbrowser') > -1 || 
         ua.indexOf('samsung') > -1;
};

// Force exact colors on elements
export const applySamsungColorFix = () => {
  // Only run for Samsung Internet
  if (!isSamsungBrowser()) {
    console.log('Not Samsung Browser - skipping color fix');
    return;
  }

  console.log('Samsung Browser detected - applying color fixes...');

  // Wait for DOM to be fully loaded
  const applyFixes = () => {
    // Fix all buttons with "Buy Crypto" text
    const buyButtons = document.querySelectorAll('button, [role="button"]');
    buyButtons.forEach(btn => {
      const text = btn.textContent || '';
      
      if (text.includes('Buy Crypto') || text.includes('BUY CRYPTO')) {
        // Force EXTREMELY bright cyan to match Chrome
        btn.style.background = 'rgb(0, 255, 255) !important';
        btn.style.backgroundImage = 'linear-gradient(180deg, rgb(0, 255, 255) 0%, rgb(0, 240, 255) 50%, rgb(0, 220, 255) 100%) !important';
        btn.style.border = '3px solid rgb(0, 255, 255) !important';
        btn.style.color = '#000000 !important';
        btn.style.boxShadow = '0 0 40px rgba(0, 255, 255, 1), 0 0 80px rgba(0, 255, 255, 0.8) !important';
        btn.style.filter = 'saturate(2) brightness(1.4) contrast(1.2)';
        btn.style.setProperty('-webkit-filter', 'saturate(2) brightness(1.4) contrast(1.2)');
        console.log('Fixed Buy Crypto button');
      }
      
      if (text.includes('Sell Crypto') || text.includes('SELL CRYPTO')) {
        // Force EXTREMELY bright pink/purple to match Chrome
        btn.style.background = 'rgb(255, 150, 255) !important';
        btn.style.backgroundImage = 'linear-gradient(180deg, rgb(255, 170, 255) 0%, rgb(240, 140, 255) 50%, rgb(230, 120, 255) 100%) !important';
        btn.style.border = '3px solid rgb(255, 160, 255) !important';
        btn.style.color = '#000000 !important';
        btn.style.boxShadow = '0 0 40px rgba(255, 150, 255, 1), 0 0 80px rgba(255, 150, 255, 0.8) !important';
        btn.style.filter = 'saturate(2) brightness(1.4) contrast(1.2)';
        btn.style.setProperty('-webkit-filter', 'saturate(2) brightness(1.4) contrast(1.2)');
        console.log('Fixed Sell Crypto button');
      }

      if (text.includes('Create My Account Free') || text.includes('Get Started')) {
        // Force EXTREMELY bright cyan to purple gradient to match Chrome
        btn.style.background = 'rgb(0, 255, 255) !important';
        btn.style.backgroundImage = 'linear-gradient(135deg, rgb(0, 255, 255) 0%, rgb(220, 120, 255) 100%) !important';
        btn.style.border = '2px solid rgb(0, 255, 255) !important';
        btn.style.color = '#FFFFFF !important';
        btn.style.boxShadow = '0 0 60px rgba(0, 255, 255, 0.9), 0 0 120px rgba(180, 100, 255, 0.7) !important';
        btn.style.filter = 'saturate(2) brightness(1.4) contrast(1.2)';
        btn.style.setProperty('-webkit-filter', 'saturate(2) brightness(1.4) contrast(1.2)');
        console.log('Fixed CTA button');
      }
    });

    // Fix elements with gradient classes - AGGRESSIVE boost
    const gradientElements = document.querySelectorAll('[class*="gradient"], .hero-gradient');
    gradientElements.forEach(el => {
      el.style.filter = 'saturate(2) brightness(1.4) contrast(1.2)';
      el.style.setProperty('-webkit-filter', 'saturate(2) brightness(1.4) contrast(1.2)');
    });

    // Fix headline text with gradient - AGGRESSIVE boost
    const headlines = document.querySelectorAll('h1, .hero-title');
    headlines.forEach(h => {
      const computedStyle = window.getComputedStyle(h);
      if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
        h.style.filter = 'saturate(2) brightness(1.4) contrast(1.2)';
        h.style.setProperty('-webkit-filter', 'saturate(2) brightness(1.4) contrast(1.2)');
      }
    });

    console.log('Samsung Browser color fixes applied!');
  };

  // Apply immediately
  applyFixes();

  // Apply again after a short delay to catch dynamically loaded content
  setTimeout(applyFixes, 500);
  setTimeout(applyFixes, 1000);
  setTimeout(applyFixes, 2000);

  // Re-apply on any route changes or content updates
  const observer = new MutationObserver(() => {
    applyFixes();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// Auto-run on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applySamsungColorFix);
  } else {
    applySamsungColorFix();
  }
}
