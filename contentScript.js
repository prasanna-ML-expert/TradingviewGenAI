// --- Start of Script Execution Debug ---
console.log("Content Script: Ticker fetching script loaded on page.");
// ---------------------------------------

function getTickerSymbol() {
    // --- Debugging DOM Selection ---
    console.log("Content Script: Attempting to query for ticker element...");

    // The selector is complex and might be failing.
    const selector = '[class*="title"][type="button"]';
    const tickerElement = document.querySelector(selector);
    
    if (!tickerElement) {
        console.error(`Content Script: ERROR! Ticker element not found using selector: ${selector}`);
        return null; // Return null if the element is not found
    }

    // Attempting to read textContent *from the element*
    const tickerText = tickerElement.textContent;
    
    if (tickerText) {
        const trimmedTicker = tickerText.trim();
        console.log("Content Script: Found and returning Ticker Symbol:", trimmedTicker);
        return trimmedTicker;
    }

    console.error("Content Script: ERROR! Ticker element found, but its textContent was empty or null.");
    return null;
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // --- Debugging Message Listener ---
    console.log("Content Script: Message received.", request);

    if (request.action === 'getTickerSymbol') {
        console.log("Content Script: Action matches 'getTickerSymbol'. Calling getTickerSymbol().");
        
        const tickerSymbol = getTickerSymbol();
        
        // --- Debugging the Response ---
        if (tickerSymbol) {
            console.log("Content Script: Sending response back to popup with symbol:", tickerSymbol);
        } else {
            console.warn("Content Script: Sending response back to popup with NULL symbol.");
        }

        // The sendResponse call must be synchronous inside the listener or return true for async
        sendResponse({ tickerSymbol }); 
        
        // Add return true if you switch to an async function, but for now, it's fine.
    } else {
        console.warn("Content Script: Message received, but action did not match 'getTickerSymbol'.");
    }
});
