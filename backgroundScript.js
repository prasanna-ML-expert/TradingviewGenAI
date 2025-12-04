// background.js - MODIFIED

// --- List of Queries ---
const queries = {
    'queryGemini1': (ticker) => `What business is USA NYSE/NASDAQ stock ${ticker} into, focusing on business focus areas in two sentences highlighting keywords, latest as of today dated news(not interested in stock price changes as standalone news item) bullted and highlighted dates, any announcement of strategic alternatives in two sentences highligting key phrases. Exclude disclaimer.`,
    'queryGemini2': (ticker) => `present busines pivots highligting keywords since inception by USA NYSE/NASDAQ stock ${ticker} in bulleted style in less than 100 words, and total percentage of institutional ownership from 13f filings as of today, highlight percentage. Exclude disclaimer.`,
    'queryGemini3': (ticker) => `As of today, List Recent large orders dated for ${ticker} with value, highlight institutes/organizations/companies. No extra information in list items. Exclude disclaimer.`,
    'queryGemini4': (ticker) => `For USA NYSE/NASDAQ stock ${ticker} what is current debt load, cash position and quarterly burn rate, highlight keywords. What is potential fully diluted share count and total outstanding share count based on stock dilution and warrants from recent forms 8k and 10q SEC filings considering footnotes as of today, highlight key phrases and numbers in millions, present in two short bulleted points. What is the market cap of the company including class A class B etc shares, highlighting the value in millions or billions. List all peer listed company tickers in single sentence.  Exclude disclaimer.`,
   // 'queryGemini4': (ticker) => `For USA NYSE/NASDAQ stock ${ticker} what is current approaximate total debt load, approaximate total cash and equivalents in millions, What is potential fully diluted share count in millions and total outstanding share count in millions based on stock dilution, convertible notes and warrants from recent forms 8k and 10q SEC filings considering footnotes as of today. What is quarterly revenue and burn rate inclue + for profit and - for loss. What is total approaximate outstanding orders/contracts received from last 12 months in millions. Exclude disclaimer.present in comma separated numbers and no words or headings required. Return 0 if a number cannot be found or calculated.`,

    'queryGemini5': (ticker) => `what is the total open interest for ${ticker} across all future expiry dates and strike prices in single sentence along with put call open interest ratio(not volume ratio) and short interest percentage as of today. Exclude disclaimer.`,
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
const URL_LIST = [
  "https://www.tradingview.com/chart/Ls0KjlAU/",
  "https://www.tradingview.com/chart/iHFjEihw/",
  "https://www.tradingview.com/chart/bc9LVHG4/",
  "https://www.tradingview.com/chart/y66m0tBS/",
  "https://www.tradingview.com/chart/yXkclwxW/",
  "https://www.tradingview.com/chart/gNgM9ZRC/",
  "https://www.tradingview.com/chart/n7Ak2qQF/",
  "https://www.tradingview.com/chart/ee3TjuCV/",
  "https://www.tradingview.com/chart/L8RehbH2/",
  "https://www.tradingview.com/chart/P1TUSyPv/",
  "https://www.tradingview.com/chart/LPs0FIja/",
  "https://www.tradingview.com/chart/6RnjuCRf/",
  "https://www.tradingview.com/chart/bmnG95Wd/",
  "https://www.tradingview.com/chart/ThpDElE5/",
  "https://www.tradingview.com/chart/kAOiJNLK/",
  "https://www.tradingview.com/chart/XFDtWdGp/",
  "https://www.tradingview.com/chart/rPD36MDH/"
];
const URL_MAP = {
  "quantum": "https://www.tradingview.com/chart/Ls0KjlAU/",
  "power_management_chips": "https://www.tradingview.com/chart/iHFjEihw/",
  "uas_defense_robotics": "https://www.tradingview.com/chart/bc9LVHG4/",
  "lidar_sensing": "https://www.tradingview.com/chart/y66m0tBS/",
  "service_robotics": "https://www.tradingview.com/chart/yXkclwxW/",
  "autonomous_driving": "https://www.tradingview.com/chart/gNgM9ZRC/",
  "space_launch_systems": "https://www.tradingview.com/chart/n7Ak2qQF/",
  "earth_observation": "https://www.tradingview.com/chart/ee3TjuCV/",
  "ev_charging_infrastructure": "https://www.tradingview.com/chart/L8RehbH2/",
  "evtol_air_mobility": "https://www.tradingview.com/chart/P1TUSyPv/",
  "hydrogen_fuel_cells": "https://www.tradingview.com/chart/LPs0FIja/",
  "new_nuclear_energy": "https://www.tradingview.com/chart/6RnjuCRf/",
  "batteries_storage_tech": "https://www.tradingview.com/chart/bmnG95Wd/",
  "batteries_storage_sw": "https://www.tradingview.com/chart/ThpDElE5/",
  "battery_materials_mining": "https://www.tradingview.com/chart/kAOiJNLK/",
  "Hyperscalers": "https://www.tradingview.com/chart/XFDtWdGp/",
  "Mining": "https://www.tradingview.com/chart/rPD36MDH/"
};
const ALARM_NAME = "urlRotatorAlarm";
const INTERVAL_MINUTES = 3;
const STORAGE_KEY_INDEX = 'currentUrlIndex';
const STORAGE_KEY_STATUS = 'isRotatorRunning';

let isRunning = false; // Internal runtime state

// --- Core Rotation Function ---
async function rotateUrl() {
  if (!isRunning) return; // Only run if playing

  let result = await browser.storage.local.get(STORAGE_KEY_INDEX);
  let currentIndex = result[STORAGE_KEY_INDEX] || 0;

  const nextUrl = URL_LIST[currentIndex];

  let newIndex = (currentIndex + 1) % URL_LIST.length;
  await browser.storage.local.set({ [STORAGE_KEY_INDEX]: newIndex });

  let tabs = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (tabs.length > 0) {
    browser.tabs.update(tabs[0].id, { url: nextUrl })
      .catch(error => { console.error(`Navigation failed: ${error}`); });
  }
}

// --- Control Functions ---
async function startRotation() {
  await browser.storage.local.set({ [STORAGE_KEY_STATUS]: true });
  isRunning = true;
  browser.alarms.create(ALARM_NAME, { periodInMinutes: INTERVAL_MINUTES });
  console.log("Rotation Started");
}

async function stopRotation() {
  await browser.storage.local.set({ [STORAGE_KEY_STATUS]: false });
  isRunning = false;
  browser.alarms.clear(ALARM_NAME);
  console.log("Rotation Paused");
}

async function manualJump(urlKey) {

    let jumpUrl = URL_MAP[urlKey];
    
    // Set the index for the next auto-rotation
    let newIndex = 0;
    await browser.storage.local.set({ [STORAGE_KEY_INDEX]: newIndex });
    
    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
        browser.tabs.update(tabs[0].id, { url: jumpUrl })
            .catch(error => { console.error(`Manual jump failed: ${error}`); });
    }
}
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    rotateUrl();
  }
});
browser.storage.local.get(STORAGE_KEY_STATUS).then(result => {
  if (result[STORAGE_KEY_STATUS] === true) {
    startRotation();
  }
});

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
                headers: headers,
                groupName: currentGroupName,
                imageUrl: currentImageUrl 
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
let currentGroupName = null;
let currentImageUrl = null;
// --- Listener Logic ---
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    const apiKey = 'AIzaSyCmAX5oWl4VVr5AldHz5zWs-RvUfe6Xs4E';
    const apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    // Check if the request action is one of our planned queries
    const queryBuilder = queries[request.action];
    const isGeminiQuery = request.action && request.action.startsWith('queryGemini');
    if (request.action === "start") {
        startRotation();
        return
      } else if (request.action === "stop") {
        stopRotation();
        return
      } else if (request.action === "jump") {
        manualJump(request.urlKey);
        return
      }
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
        currentGroupName = request.ticker_group
        currentImageUrl = request.imageUrl || null;
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
    
    if (request.action === 'fetchImageAsBase64') {
        const imageUrl = request.url;
        
        const asyncResponse = (async () => {
            if (!imageUrl) {
                console.error("fetchImageAsBase64 received null URL.");
                return { success: false };
            }
            
            try {
                // Fetch the image from the external URL using the background script's privilege
                const response = await fetch(imageUrl);
                const blob = await response.blob();

                // Convert the Blob to a Base64 Data URL
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve({ success: true, base64Data: reader.result });
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });

            } catch (error) {
                console.error("Background script failed to fetch image:", error);
                return { success: false, error: error.message };
            }
        })();

        asyncResponse.then(sendResponse);
        return true; // Must return true for async response
    }

    // Default return for unhandled messages
    return false;
});
