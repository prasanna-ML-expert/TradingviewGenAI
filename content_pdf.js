// content_script.js (Runs on target page, uses 'browser' for Firefox)

// Query templates exactly as provided (These were in your background.js but belong here for execution context)
// NOTE: Since your background.js already defines these, they are defined here for clarity, 
// but the background script uses them from its own scope.
const queryTemplates = {
    'queryGemini1': (ticker) => `What business is USA NYSE/NASDAQ stock ${ticker} into, focusing on business focus areas in two sentences highlighting keywords, latest as of today dated news bullted and highlighted dates, any announcement of strategic alternatives in two sentences highligting key phrases. Exclude disclaimer.`,
    'queryGemini2': (ticker) => `present busines pivots highligting keywords since inception by USA NYSE/NASDAQ stock ${ticker} in bulleted style in less than 100 words, and total percentage of institutional ownership from 13f filings as of today, highlight percentage. Exclude disclaimer.`,
    'queryGemini3': (ticker) => `As of today, List Recent large orders dated for ${ticker} with value, highlight institutes/organizations/companies. No extra information in list items. Exclude disclaimer.`,
    'queryGemini4': (ticker) => `For USA NYSE/NASDAQ stock ${ticker} what is current debt load, cash position and quarterly burn rate, highlight keywords. What is potential fully diluted share count and total outstanding share count based on stock dilution and warrants from recent forms 8k and 10q SEC filings considering footnotes as of today, highlight key phrases and numbers in millions, present in two short bulleted points. List all peer listed company tickers in single sentence. Exclude disclaimer.`,
    'queryGemini5': (ticker) => `what is the total open interest for ${ticker} across all future expiry dates and strike prices in single sentence along with put call ratio and short interest percentage as of today. present in bulleted output. Exclude disclaimer.`
};

/**
 * Delegates the actual Gemini API call to the background service worker.
 * @param {string} action - The key for the query builder (e.g., 'queryGemini1').
 * @param {string} ticker - The stock ticker symbol.
 * @returns {Promise<string>} The result text from the Gemini API call.
 */
async function runGeminiQuery(action, ticker) {
    console.log(`[Content Script]: Sending action '${action}' for ticker ${ticker} to background.`);
    
    // The message format MUST match what your background.js expects:
    // 'request.action' (the query key) and 'request.tickerSymbol'
    const response = await browser.runtime.sendMessage({
        action: action, 
        tickerSymbol: ticker 
    });

    if (response && response.result) {
        return response.result;
    } else {
        console.error(`Error retrieving result for ${action}:`, response.error);
        return response.error || 'API call failed.';
    }
}


// Main listener to receive tasks from the coordinating service worker (service_worker.js)
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    
    // The action 'runQueries' comes from the sequential coordinating script
    if (request.action === 'runQueries' && request.ticker) {
        const ticker = request.ticker;
        const results = {};
        
        console.log(`[Content Script]: Starting all 5 queries for ticker: ${ticker}`);
        browser.runtime.sendMessage({
            action: 'progressUpdate',
            ticker: ticker,
            step: 0, // 0 indicates starting a new ticker
            totalSteps: 5,
            message: `Starting analysis for **${ticker}**...`
        });
        // Execute all 5 queries sequentially for the current ticker
        for (let i = 1; i <= 5; i++) {
            const actionKey = `queryGemini${i}`; // Use the key format your background script expects
            
            // Delegate API call to background.js
            results[actionKey] = await runGeminiQuery(actionKey, ticker);
            browser.runtime.sendMessage({
                action: 'progressUpdate',
                ticker: ticker,
                step: i, // The current step number (1 to 5)
                totalSteps: 5,
                message: `Query **${i} of 5** complete for **${ticker}**.`
            });
        }

        // Send the aggregated results for this ticker back to the coordinating script
        browser.runtime.sendMessage({
            action: 'analysisComplete', // The completion signal for the coordinating script
            ticker: ticker,
            data: results
        });
        
        // This handler does not respond directly, it sends a message
        return true; 
    }
});
