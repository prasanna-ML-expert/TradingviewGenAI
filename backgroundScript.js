// background.js - MODIFIED

// --- List of Queries ---
const queries = {
    'queryGemini1': (ticker) => `What business is USA NYSE/NASDAQ stock ${ticker} into, focusing on business focus areas in two sentences highlighting keywords, latest as of today dated news bullted and highlighted dates, any announcement of strategic alternatives in two sentences highligting key phrases. Exclude disclaimer.`,
    'queryGemini2': (ticker) => `present busines pivots highligting keywords since inception by USA NYSE/NASDAQ stock ${ticker} in bulleted style in less than 100 words, and total percentage of institutional ownership from 13f filings as of today, highlight percentage. Exclude disclaimer.`,
    'queryGemini3': (ticker) => `As of today, List Recent large orders dated for ${ticker} with value, highlight institutes/organizations/companies. No extra information in list items. Exclude disclaimer.`,
    'queryGemini4': (ticker) => `For USA NYSE/NASDAQ stock ${ticker} what is current debt load, cash position and quarterly burn rate, highlight keywords. What is potential fully diluted share count and total outstanding share count based on stock dilution and warrants from recent forms 8k and 10q SEC filings considering footnotes as of today, highlight key phrases and numbers in millions, present in two short bulleted points. What is the market cap of the company including class A class B etc shares, highlighting the value in millions or billions. List all peer listed company tickers in single sentence.  Exclude disclaimer.`,
    'queryGemini5': (ticker) => `what is the total open interest for ${ticker} across all future expiry dates and strike prices in single sentence along with put call ratio and short interest percentage as of today. present in bulleted output. Exclude disclaimer.`,
};

let allResults = {};
let tickersToProcess = [];
const queryHeaders = [
    "Business Overview & News", 
    "Pivots & Institutional Ownership", 
    "Recent Large Orders", 
    "Cash, stock dilution, warrants, peers", 
    "Options/Short Interest"
];

function sendPdfDataWhenReady(data, tickers, headers) {
    
    // Define the listener function to run ONLY when the results page loads completely
    const tabLoadListener = (tabId, changeInfo, tab) => {
        // Check for correct tab ID, 'complete' status, and the correct URL
        if (tabId === pdfTabId && changeInfo.status === 'complete' && tab.url.includes('results.html')) {
            
            // CRITICAL: Unregister the listener immediately
            browser.tabs.onUpdated.removeListener(tabLoadListener);
            pdfTabId = null; 

            console.log("PDF Tab loaded. Sending data...");

            // Send the message now that the receiver (pdf_generator.js) is guaranteed to exist
            browser.tabs.sendMessage(tabId, {
                action: 'generatePDF',
                data: data,
                tickers: tickers,
                headers: headers
            });
            
            // Send the final completion message to the popup
            browser.runtime.sendMessage({ action: 'analysisFinished' });
        }
    };

    // 1. Register the listener BEFORE creating the tab
    browser.tabs.onUpdated.addListener(tabLoadListener);
    
    // 2. Create the tab and store its ID
    browser.tabs.create({ url: browser.runtime.getURL("results.html") }, (tab) => {
        pdfTabId = tab.id;
    });
}

let chartTabId = null; // Store the ID of the chart tab
// --- Listener Logic ---
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    const apiKey = 'AIzaSyBh9OaafDq99Hq0ieFMedSt1UX_oHkkb1U';
    const apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    // Check if the request action is one of our planned queries
    const queryBuilder = queries[request.action];
    const isGeminiQuery = request.action && request.action.startsWith('queryGemini');
    if (isGeminiQuery && request.tickerSymbol) {
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
        
    } 
        // --- 1. Start Analysis (From popup.js) ---
    if (request.action === 'startAnalysis') {
        allResults = {};
        tickersToProcess = request.tickers;
        console.log("Starting analysis for:", tickersToProcess);
        
        // **CRITICAL:** The 'startAnalysis' message comes from popup.js, 
        // which does NOT have a useful sender.tab to identify the chart.
        // We must still query the active tab to send the first 'runQueries' message.
        
        browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                // If the message came from the popup, use the currently active tab ID
                // to identify the chart tab for later screenshot capture.
                if (!chartTabId) {
                    chartTabId = tabs[0].id; // Store the ID of the active tab
                }

                // Send the first ticker to the content script in the active tab
                browser.tabs.sendMessage(tabs[0].id, {
                    action: 'runQueries',
                    ticker: tickersToProcess[0]
                });
            }
        });
        return true;
    }
    
    // --- 2. Collect Results and Advance (From content_script.js) ---
    if (request.action === 'analysisComplete') {
        const currentTicker = request.ticker;
        allResults[currentTicker] = request.data;
        
        const currentIndex = tickersToProcess.indexOf(currentTicker);
        const nextIndex = currentIndex + 1;

        if (nextIndex < tickersToProcess.length) {
            // Send the next ticker to the content script for sequential execution
            browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    browser.tabs.sendMessage(tabs[0].id, {
                        action: 'runQueries',
                        ticker: tickersToProcess[nextIndex]
                    });
                }
            });
        } else {
            // All data collected: call the function to safely open the PDF tab
            sendPdfDataWhenReady(allResults, tickersToProcess, queryHeaders);
        }
        return true;
    }
    if (request.action === 'progressUpdate') {
        // Forward the progress message to the active popup/tab (if applicable)
        browser.runtime.sendMessage({
            action: 'displayProgress',
            ticker: request.ticker,
            step: request.step,
            message: request.message
        });
        return true;
    }
    if (request.action === 'captureChartScreenshot') {
        if (!chartTabId) {
            sendResponse({ error: 'Chart tab ID lost or analysis not initiated correctly.' });
            return false;
        }

        const asyncResponse = (async () => {
            let currentTabId = null;
            let chartWindowId = null; 

            try {
                // 1. Store the ID of the currently active (PDF) tab and its window.
                const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
                if (activeTabs.length === 0) throw new Error("No active tab found for reference.");
                currentTabId = activeTabs[0].id;
                
                // 2. Get the Chart Tab's current window ID. (Needed for capture/focus)
                const chartTab = await browser.tabs.get(chartTabId);
                chartWindowId = chartTab.windowId;

                // 3. Focus the Chart Tab's window and then the tab itself.
                // Focusing the window is critical to satisfy permission rules.
                console.log(`Focusing window ${chartWindowId} and chart tab ${chartTabId} for capture...`);
                
                // Focus the Window first (ensures it's the desktop's active window)
                await browser.windows.update(chartWindowId, { focused: true });

                // Activate the tab within that window
                await browser.tabs.update(chartTabId, { active: true });

                // Small delay to ensure render pipeline catches up after focus change
                await new Promise(resolve => setTimeout(resolve, 100)); 
                
                // 4. Capture the Screenshot: Use the explicit window ID for maximum reliability.
                // Since the chart tab is now active and its window is focused, this should work.
                const imageDataUrl = await browser.tabs.captureVisibleTab(chartWindowId, { format: 'png' }); 

                // 5. Return to the PDF Tab
                console.log(`Returning focus to PDF tab (ID: ${currentTabId})...`);
                await browser.tabs.update(currentTabId, { active: true });
                
                return { imageDataUrl: imageDataUrl };

            } catch (error) {
                let errorMessage = `Failed to capture chart screenshot. ${error.message}.`;
                
                // CRITICAL: Ensure we try to return focus to the PDF tab even on error
                if (currentTabId) {
                    try { await browser.tabs.update(currentTabId, { active: true }); } catch (e) { /* ignore */ }
                }

                console.error("Service Worker: Failed to capture chart tab:", errorMessage);
                return { error: errorMessage };
            }
        })();
        
        // Handle the promise resolution and send the response back
        asyncResponse.then(sendResponse);
        return true; 
    }

    // Default return for unhandled messages
    return false;
});
