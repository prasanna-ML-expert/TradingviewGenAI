// background.js - MODIFIED

// --- List of Queries ---
const queries = {
    'queryGemini1': (ticker) => `What business is USA NYSE/NASDAQ stock ${ticker} into, focusing on business focus areas in two sentences highlighting keywords, latest as of today dated news bullted and highlighted dates, any announcement of strategic alternatives in two sentences highligting key phrases. Exclude disclaimer.`,
    'queryGemini2': (ticker) => `present busines pivots highligting keywords since inception by USA NYSE/NASDAQ stock ${ticker} in bulleted style in less than 100 words, and total percentage of institutional ownership from 13f filings as of today, highlight percentage. Exclude disclaimer.`,
    'queryGemini3': (ticker) => `As of today, List Recent large orders dated for ${ticker} with value, highlight institutes/organizations/companies. No extra information in list items. Exclude disclaimer.`,
    'queryGemini4': (ticker) => `For USA NYSE/NASDAQ stock ${ticker} what is current debt load, cash position and quarterly burn rate, highlight keywords. What is potential fully diluted share count and total outstanding share count based on stock dilution and warrants from recent forms 8k and 10q SEC filings considering footnotes as of today, highlight key phrases and numbers in millions, present in two short bulleted points. List all peer listed company tickers in single sentence.  Exclude disclaimer.`,
    'queryGemini5': (ticker) => `what is the total open interest for ${ticker} across all future expiry dates and strike prices in single sentence along with put call ratio and short interest percentage as of today. present in bulleted output. Exclude disclaimer.`,
};

// --- Listener Logic ---
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // ... (apiKey and apiEndpoint remain the same) ...
    const apiKey = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    // Check if the request action is one of our planned queries
    const queryBuilder = queries[request.action];
    
    if (queryBuilder && request.tickerSymbol) {
        const query = queryBuilder(request.tickerSymbol); // Build the specific query
        
        console.log(`2. Background Script: Action matched '${request.action}'. Ticker: ${request.tickerSymbol}`);
        
        // ... (rest of the fetch logic remains the same) ...
        fetch(`${apiEndpoint}?key=${apiKey}`, {
            // ... (headers, body, etc. remains the same) ...
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: query
                    }]
                }],
                tools: [{
                    googleSearch: {}
                }]
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                sendResponse({ error: `Gemini API Error: ${data.error.message}` });
            } else if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                const resultText = data.candidates[0].content.parts[0].text;
                // Crucially, include the original action so the popup knows which query just finished
                sendResponse({ 
                    result: resultText,
                    originalAction: request.action 
                });
            } else {
                sendResponse({ error: 'Failed to parse Gemini response' });
            }
        })
        .catch(error => {
            console.error('CRITICAL Error during fetch or processing:', error.message);
            sendResponse({ error: `Failed to query Gemini: ${error.message}` });
        });
        
        // CRITICAL: Must return true to signal asynchronous response
        return true;
        
    } else {
        console.error("ERROR! Invalid action or missing tickerSymbol:", request);
        sendResponse({ error: "Invalid action or missing Ticker Symbol in message." });
        return false;
    }
});
