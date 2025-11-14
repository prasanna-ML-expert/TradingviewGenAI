// contentScript_ticker.js

console.log("Ticker Retrieval Script Loaded.");

/**
 * Attempts to retrieve the current ticker symbol from the TradingView chart header.
 * Applies cleaning logic to remove exchange prefixes (e.g., NYSE:).
 * @returns {string | null} The cleaned ticker symbol or null if not found.
 */
function getTickerSymbol() {
    // 1. PRIMARY SELECTOR (Most Reliable)
    const selector1 = '.tv-symbol-header__symbol, [data-name="symbol-edit"]'; 
    const tickerElement1 = document.querySelector(selector1);

    if (tickerElement1 && tickerElement1.textContent) {
        // Apply cleaning logic: split by ':', take the last part, and trim whitespace
        const symbol = tickerElement1.textContent.split(':').pop().trim();
        if (symbol) {
             console.log("Ticker Script: Found Ticker (Method 1):", symbol);
             return symbol;
        }
    }

    // 2. FALLBACK SELECTOR (For alternative header/button elements)
    const selector2 = '[class*="title"][type="button"]';
    const tickerElement2 = document.querySelector(selector2);
    
    if (!tickerElement2) {
        console.error("Ticker Script: ERROR! Ticker element not found using any selectors.");
        return null;
    }

    // Attempting to read textContent from the element
    const tickerText = tickerElement2.textContent;
    
    if (tickerText) {
        // Apply the same robust cleaning logic to the fallback result
        const trimmedTicker = tickerText.split(':').pop().trim();
        
        if (trimmedTicker) {
            console.log("Ticker Script: Found Ticker (Method 2):", trimmedTicker);
            return trimmedTicker;
        }
    }

    console.error("Ticker Script: ERROR! Ticker element found, but its textContent was empty or null after cleaning.");
    return null;
}

// Listener for the 'getTickerSymbol' action. This is SYNCHRONOUS.
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getTickerSymbol') {
        // This is a fast, synchronous call, eliminating the timeout risk.
        const tickerSymbol = getTickerSymbol();
        sendResponse({ tickerSymbol });
        
        // No 'return true' is needed as the response is synchronous.
    }
});
