// popup.js - FINAL VERSION
    // --- 1. Define the Ticker Groups (MUST match the size of your layout, e.g., 8) ---
    const TICKET_GROUPS = {
    'quantum': ['ionq','qbts','rgti','qubt','laes','arqq'],
    'power_management_chips': ['nvts', 'on', 'aosl', 'mpwr', 'powi', 'wolf'],
    'uas_defense_robotics': ['dpro', 'rcat', 'zena', 'onds', 'avav', 'ktos', 'umac', 'spai'],
    'lidar_sensing': ['aeva', 'lazr', 'mvis', 'lidr', 'oust', 'indi', 'arbe', 'cohr'],
    'service_robotics': ['rr', 'serv', 'prct', 'zbra', 'irbt'],
    'autonomous_driving': ['mbly', 'aur', 'tsla', 'xpev', 'kdk'],
    'space_launch_systems': ['rklb', 'fly', 'mnts', 'spce','lunr', 'rdw'],
    'earth_observation': ['pl', 'bksy', 'spir', 'satl'],
    'satellite_communications': ['asts', 'irdm', 'sats', 'vsat'],
    'ev_charging_infrastructure': ['evgo', 'blnk', 'chpt', 'beem', 'adse'],
    'evtol_air_mobility': ['achr', 'joby', 'evex', 'evtl'],
    'hydrogen_fuel_cells': ['fcel', 'be', 'plug', 'hyln', 'bw'],
    'cybersecurity': ['ftnt', 'zs', 'crwd','panw'],
    'new_nuclear_energy': ['nne', 'ccj', 'smr', 'bwxt', 'oklo', 'ceg'],
    'batteries_storage_tech': ['qs', 'envx', 'ses', 'mvst', 'ampx', 'sldp'],
    'batteries_storage_sw': ['enph', 'stem', 'flnc', 'eose', 'gwh','kulr','te'],
    'battery_materials_mining': ['atlx', 'abat', 'alb', 'sqm', 'sgml', 'elvr', 'lac','nb'],
    'Hyperscalers': ['crwv', 'nbis', 'alab', 'corz', 'apld', 'cifr','wulf'],
    'Mining': ['mara', 'clsk', 'bitf', 'hive', 'btbt', 'hut','riot','iren'],
    'Mag7':['aapl', 'nvda', 'msft', 'meta', 'amzn', 'nflx','avgo']
    };
    // --- END Ticker Groups ---
    
    
const toggleButton = document.getElementById('toggleBtn');


// --- Helper Functions ---

function updateStatus(isRunning) {
    if (isRunning) {
        toggleButton.textContent = "Pause";
    } else {
        toggleButton.textContent = "Play";
    }
}


document.addEventListener('DOMContentLoaded', function () {

    const resultElement = document.getElementById('result');
    const spinnerElement = document.getElementById('loading-spinner');
    // Ensure you have this element ID in your HTML
    const currentActionElement = document.getElementById('current-action'); 
    const clearButton = document.getElementById('clear-results-button');
    //const geminiChatButton = document.getElementById('GeminiChat');
    const tickerInput = document.getElementById('tickerInput');
    const selectElement = document.getElementById('ticker-group-select');
    
document.getElementById('GeminiChat').addEventListener('click', async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (myText) => {
            // --- HELPER 1: PASTE & SEND ---
            async function pasteAndSend(text) {
                const input = document.querySelector('div[role="textbox"]') || 
                              document.querySelector('div[contenteditable="true"]');
                if (!input) return false;

                input.focus();
                document.execCommand('insertText', false, text);
                input.dispatchEvent(new Event('input', { bubbles: true }));

                await new Promise(r => setTimeout(r, 500)); // wait for UI state
                const btn = document.querySelector('button[aria-label="Send message"]');
                
                if (btn && !btn.disabled) {
                    btn.click();
                } else {
                    input.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
                    }));
                }
                return true;
            }

            // --- HELPER 2: SCRAPE ---
            async function scrape() {
                const selectors = ['.markdown', '.message-content', '.model-response-text'];
                for (const s of selectors) {
                    const msgs = document.querySelectorAll(s);
                    if (msgs.length > 0) return msgs[msgs.length - 1].innerText;
                }
                return null;
            }

            // --- MAIN EXECUTION FLOW ---
            const success = await pasteAndSend(myText);
            if (success) {
                console.log("Waiting 60s for Gemini...");
                await new Promise(r => setTimeout(r, 60000));
                const response = await scrape();
                if (response) {
                    alert("Scraped: " + response.substring(0, 150) + "...");
                } else {
                    alert("Failed to find response after 60s.");
                }
            } else {
                alert("Could not find input box.");
            }
        },
        args: ["Hello from my extension!"]
    });
});


    const manualQueryActions = {
        'queryGemini1': '1.Overview & News',
        'queryGemini2': '2.Pivots and institutional ownership',
        'queryGemini3': '3.Recent orders',
        'queryGemini4': '4.Cash, dilution, warrants, peers',
        'queryGemini5': '5.open and short interest'
    };
    
    const allQueryActions = [
        { action: 'queryGemini1', title: '1.Overview & News' },
        { action: 'queryGemini2', title: '2.Pivots and institutional ownership' },
        { action: 'queryGemini3', title: '3.Recent orders' },
        { action: 'queryGemini4', title: '4.Cash, dilution, warrants, peers' },
        { action: 'queryGemini5', title: '5.open and short interest' }
    ];

    function sendQueryToBackground(action, tickerSymbol) {
        return new Promise((resolve, reject) => {
            browser.runtime.sendMessage({ action: action, tickerSymbol }, function (response) {
                if (browser.runtime.lastError) {
                    return reject(new Error(browser.runtime.lastError.message));
                }
                resolve(response);
            });
        });
    }

    async function runAllQueries(tickerSymbol) {
        
        // --- 1. SETUP UI ---
        resultElement.innerHTML = ''; // Clear display
        resultElement.style.display = 'block'; // <<< CRITICAL: Make the result container visible!
        spinnerElement.style.display = 'block'; 
        currentActionElement.textContent = 'Initializing...';
        console.log('Starting all 5 queries sequentially.');

        try {
            // 2. Loop through all 5 queries sequentially
            for (const { action, title } of allQueryActions) {
                
                // Update the spinner text
                currentActionElement.textContent = title;
                
                // CRITICAL FIX: Yield control to the browser's event loop.
                // This allows the browser to process the UI updates (spinner text) 
                // BEFORE the long asynchronous API call begins.
                await new Promise(resolve => setTimeout(resolve, 0)); 
                
                // Add the header and the temporary status message
                resultElement.insertAdjacentHTML('beforeend', `<hr><h3>${title}</h3>`);
                resultElement.insertAdjacentHTML('beforeend', `<p id="${action}-status"><em>Querying...</em></p>`);

                // --- Execute Query ---
                let response;
                try {
                    response = await sendQueryToBackground(action, tickerSymbol);
                } catch (e) {
                    // Handle network failure or background script crash
                    response = { error: `Network Error: ${e.message}` };
                }

                // --- Process Result and Clean Up Status Message ---
                const statusElement = document.getElementById(`${action}-status`);
                
                if (response && response.result) {
                    // SUCCESS PATH: Append result
                    const htmlContent = marked.parse(response.result);
                    
                    if (statusElement) statusElement.remove(); // Remove "Querying..."
                    
                    // Append the result content
                    resultElement.insertAdjacentHTML('beforeend', htmlContent);
                    
                } else {
                    // ERROR PATH: Display error message
                    const errorMessage = `Error in ${title}: ${response.error || 'No valid result returned'}`;
                    
                    if (statusElement) {
                        statusElement.innerHTML = `<span style="color:red; font-weight:bold;">${errorMessage}</span>`;
                    } else {
                         resultElement.insertAdjacentHTML('beforeend', `<p style="color:red;">${errorMessage}</p>`);
                    }
                }
            }

        } catch (error) {
            console.error('FATAL ERROR in Query Chain:', error);
            resultElement.insertAdjacentHTML('beforeend', `<p style="color:red;">FATAL ERROR: ${error.message}</p>`);
        } finally {
            // --- 3. CLEANUP UI ---
            spinnerElement.style.display = 'none'; 
            currentActionElement.textContent = '';
            resultElement.insertAdjacentHTML('beforeend', '<hr><p><strong>All Queries Complete.</strong></p>');
        }
    }
    async function runSingleQuery(tickerSymbol, action, title) {
        // Prepare display for a single manual run
        spinnerElement.style.display = 'block';
        currentActionElement.textContent = `Running: ${title}`;
        
        try {
            // Append the header and status message
            resultElement.insertAdjacentHTML('beforeend', `<hr><h3>${title} (Manual Run)</h3>`);
            resultElement.insertAdjacentHTML('beforeend', `<p id="${action}-manual-status"><em>Querying...</em></p>`);

            const response = await sendQueryToBackground(action, tickerSymbol);
            const statusElement = document.getElementById(`${action}-manual-status`);
            
            if (response && response.result) {
                // Success: Remove status and append result
                if (statusElement) statusElement.remove();
                const htmlContent = marked.parse(response.result);
                resultElement.insertAdjacentHTML('beforeend', htmlContent);
                
            } else {
                // Error: Display error message
                const errorMessage = `Error in ${title}: ${response.error || 'No valid result returned'}`;
                if (statusElement) {
                    statusElement.innerHTML = `<span style="color:red; font-weight:bold;">${errorMessage}</span>`;
                }
            }
        } catch (error) {
            resultElement.insertAdjacentHTML('beforeend', `<p style="color:red;">Query Error: ${error.message}</p>`);
        } finally {
            spinnerElement.style.display = 'none';
            currentActionElement.textContent = '';
        }
    }

    // --- Common Logic to Get Ticker ---
    async function getTickerAndRun(runnerFunction, action, title) {
        const tickerInput = document.getElementById('tickerInput');
        
        // --- 1. Get Ticker from Input Box ---
        let tickerSymbol = tickerInput ? tickerInput.value.trim().toUpperCase() : null;
        
        try {
            if (!tickerSymbol) {
                const tabs = await browser.tabs.query({ active: true, currentWindow: true });
                if (tabs.length === 0) throw new Error('No active tab found.');

                const response = await browser.tabs.sendMessage(tabs[0].id, { action: 'getTickerSymbol' });
                if (!response || !response.tickerSymbol) throw new Error('Ticker symbol not found.');
                tickerSymbol = response.tickerSymbol
            }
            // CRITICAL: Ensure result area is visible before running!
            resultElement.style.display = 'block'; 

            if (action) {
                // Manual Single Run
                runnerFunction(tickerSymbol, action, title);
            } else {
                // Existing Auto Run (Action is null/undefined)
                runnerFunction(tickerSymbol);
            }

        } catch (error) {
            spinnerElement.style.display = 'none';
            alert(`Setup Failed: ${error.message}`);
        }
    }
    
    function clearResults() {
        const resultElement = document.getElementById('result');
        if (resultElement) {
            resultElement.innerHTML = '';
            resultElement.style.display = 'none'; // Optional: Hide the container when empty
            console.log("Results cleared.");
        }
    }

    if (selectElement && tickerInput) {
        selectElement.addEventListener('change', () => {
            const selectedGroupKey = selectElement.value;
            let tickersString = '';

            if (selectedGroupKey && TICKET_GROUPS[selectedGroupKey]) {
                const tickersArray = TICKET_GROUPS[selectedGroupKey];
                
                // Join the array of tickers into a comma-separated string, capitalized and trimmed
                tickersString = tickersArray.map(t => t.trim().toUpperCase()).join(', ');
            }
            
            // Update the ticker input box with the list
            tickerInput.value = tickersString;
            console.log(`Input updated for group ${selectedGroupKey}: ${tickersString}`);
        });
    }
    const manualContainer = document.getElementById('manual-queries-container');
    if (manualContainer) {
        const manualButtons = manualContainer.querySelectorAll('button[data-action]');
        
        manualButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                const title = manualQueryActions[action];
                if (action && title) {
                    getTickerAndRun(runSingleQuery, action, title);
                }
            });
        });
    }
    if (clearButton) {
        clearButton.addEventListener('click', clearResults);
    }
    






    // 3. Function to send the list
    function sendTickerListToContentScript(tickerList) {
        // Find the active tab
        browser.tabs.query({ active: true, currentWindow: true })
            .then(tabs => {
                if (tabs.length === 0) {
                    alert('No active tab found.');
                    return;
                }
                
                // Send the list to the content script
                return browser.tabs.sendMessage(tabs[0].id, {
                    action: 'populateCharts',
                    tickerList: tickerList
                });
            })
            .then(response => {
                if (response && response.status === 'error') {
                     alert('Error populating charts: ' + response.message);
                } else if (response && response.status === 'success') {
                    console.log('Charts population initiated successfully.');
                }
            })
            .catch(error => {
                console.error("Error communicating with content script:", error);
                alert("Failed to communicate with chart page. Ensure you are on a TradingView chart.");
            });
    }

});
document.getElementById('ticker-group-select').addEventListener('change', (event) => {
    const selectedKey = event.target.value;
    if (selectedKey !== "") {
        browser.runtime.sendMessage({ action: "jump", urlKey: selectedKey });
    }
});
document.getElementById('startButton').addEventListener('click', () => {

    const statusElement = document.getElementById('results-display');
    const selectElement = document.getElementById('ticker-group-select');
    const snapshotUrlInput = document.getElementById('snapshotUrl'); 
    const selectedGroupKey = selectElement.value;
    const snapshotUrl = snapshotUrlInput.value.trim();
    if (!selectedGroupKey) {
        alert("Please select a ticker group first.");
        return;
    }

    const tickerInput = document.getElementById('tickerInput');
    const tickerString = tickerInput ? tickerInput.value.trim() : '';
    if (!tickerString) {
        statusElement.textContent = "Please enter tickers.";
        return;
    }

    // Prepare and sanitize the list of tickers
    const tickers = tickerString.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
    
    if (tickers.length === 0) {
        statusElement.textContent = "Please enter valid tickers.";
        return;
    }

    statusElement.textContent = `Starting analysis for ${tickers.join(', ')}... Please wait for the PDF to download.`;
    
    // Use 'browser' for Firefox
    browser.runtime.sendMessage({
        action: 'startAnalysis',
        tickers: tickers,
        ticker_group: selectedGroupKey ,
        imageUrl: snapshotUrl 
    });
});


const resultsDisplay = document.getElementById('results-display'); 

function updateProgressDisplay(ticker, step, message) {
    if (step === 0) {
        // Clear previous results when starting a new ticker
        resultsDisplay.innerHTML = `<p><strong>Processing: ${ticker}</strong></p>`;
    }
    
    // Update the progress message
    const progressText = `[${step}/5] ${message}`;
    resultsDisplay.innerHTML = `<p>${progressText}</p>`; 
    
    // You can also update a dedicated status bar here
}
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'displayProgress') {
        updateProgressDisplay(message.ticker, message.step, message.message);
    }
    // ... (rest of your existing message handling) ...
});

toggleButton.addEventListener('click', () => {
    // Determine action based on the *current* displayed text
    const buttonText = toggleButton.textContent.trim();

    if (buttonText.includes('Play')) {
        // If the text is "Play Auto-Rotate", clicking it should START (send 'start' command)
        browser.runtime.sendMessage({ action: "start" });
        updateStatus(true); // Update UI to Running/Pause text
    } else if (buttonText.includes('Pause')) {
        // If the text is "Pause Auto-Rotate", clicking it should STOP (send 'stop' command)
        browser.runtime.sendMessage({ action: "stop" });
        updateStatus(false); // Update UI to Paused/Play text
    }
});
const captureButton = document.getElementById('capturebutton');
captureButton.addEventListener('click', () => {
    const selectElement = document.getElementById('ticker-group-select');
    const selectedGroupKey = selectElement.value;
    browser.runtime.sendMessage({ action: "capture", urlKey:  selectedGroupKey});
});
