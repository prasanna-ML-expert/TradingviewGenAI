// popup.js - FINAL VERSION
    // --- 1. Define the Ticker Groups (MUST match the size of your layout, e.g., 8) ---
    const TICKET_GROUPS = {
    'quantum': ['ionq', 'qbts','rgti','qubt'],
    'power_management_chips': ['nvts', 'on', 'aosl', 'mpwr', 'powi', 'wolf'],
    'uas_defense_robotics': ['uavs', 'dpro', 'rcat', 'zena', 'onds', 'avav', 'ktos', 'umac', 'spai'],
    'lidar_sensing': ['aeva', 'lazr', 'mvis', 'lidr', 'oust', 'hsai', 'indi', 'arbe', 'cohr', 'trmb'],
    'service_robotics': ['rr', 'serv', 'prct', 'zbra', 'irbt'],
    'autonomous_driving': ['mbly', 'aur', 'tsla', 'xpev', 'kdk'],
    'launch_space_systems': ['rklb', 'fly', 'mnts', 'astr', 'spce'],
    'lunar_space_infrastructure': ['lunr', 'rdw', 'mda', 'lhx'],
    'earth_observation': ['pl', 'bksy', 'spir', 'satl'],
    'satellite_communications': ['asts', 'irdm', 'sats', 'vsat'],
    'ev_charging_infrastructure': ['evgo', 'blnk', 'chpt', 'beem', 'adse'],
    'evtol_air_mobility': ['achr', 'joby', 'evex', 'evtl', 'eh'],
    'hydrogen_fuel_cells': ['fcel', 'be', 'plug', 'hyln', 'bw'],
    'data_centers_REIT': ['dlr', 'eqix', 'qtx'],
    'new_nuclear_energy': ['nne', 'ccj', 'smr', 'bwxt', 'oklo', 'ceg'],
    'batteries_storage_tech': ['qs', 'frey', 'envx', 'ses', 'mvst', 'ampx', 'sldp'],
    'batteries_storage_sw': ['enph', 'stem', 'flnc', 'eose', 'gwh'],
    'battery_materials_mining': ['atlx', 'abat', 'alb', 'sqm', 'sgml', 'pll', 'lac', 'kulr'],
    'Hyperscalers': ['crwv', 'nbis', 'alab', 'cifr', 'apld', 'corz','wulf']
    };
    // --- END Ticker Groups ---
document.addEventListener('DOMContentLoaded', function () {
    const queryButton = document.getElementById('query-button1');
    const resultElement = document.getElementById('result');
    const spinnerElement = document.getElementById('loading-spinner');
    // Ensure you have this element ID in your HTML
    const currentActionElement = document.getElementById('current-action'); 
    const clearButton = document.getElementById('clear-results-button');
    
    if (!queryButton || !resultElement || !spinnerElement || !currentActionElement) {
        console.error('ERROR: Missing required DOM elements. Check HTML IDs.');
        return;
    } 
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
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) throw new Error('No active tab found.');

            const response = await browser.tabs.sendMessage(tabs[0].id, { action: 'getTickerSymbol' });
            if (!response || !response.tickerSymbol) throw new Error('Ticker symbol not found.');
            
            // CRITICAL: Ensure result area is visible before running!
            resultElement.style.display = 'block'; 

            if (action) {
                // Manual Single Run
                runnerFunction(response.tickerSymbol, action, title);
            } else {
                // Existing Auto Run (Action is null/undefined)
                runnerFunction(response.tickerSymbol);
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
    // --- Button Click Handler (Remains the same) ---
    queryButton.addEventListener('click', function () {
        browser.tabs.query({ active: true, currentWindow: true })
            .then(tabs => {
                if (tabs.length === 0) throw new Error('No active tab found.');
                return browser.tabs.sendMessage(tabs[0].id, { action: 'getTickerSymbol' });
            })
            .then(response => {
                if (!response || !response.tickerSymbol) throw new Error('Content script returned no tickerSymbol.');
                const tickerDisplay = document.getElementById('ticker-display');
                if (tickerDisplay) {
                    tickerDisplay.textContent = response.tickerSymbol;
                }
                runAllQueries(response.tickerSymbol);
            })
            .catch(error => {
                spinnerElement.style.display = 'none';
                resultElement.innerHTML = `<p style="color:red;">Initial Setup Error: ${error.message}</p>`;
            });
    });
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
    
    const selectElement = document.getElementById('ticker-group-select');
    const populateButton = document.getElementById('populate-charts-button');



    // 2. Attach Listener to the Populate Button
    populateButton.addEventListener('click', () => {
        const selectedGroupKey = selectElement.value;

        if (!selectedGroupKey) {
            alert("Please select a ticker group first.");
            return;
        }

        const selectedList = TICKET_GROUPS[selectedGroupKey];
        
        // Send the selected list to the content script for population
        sendTickerListToContentScript(selectedList);
    });

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

document.getElementById('startButton').addEventListener('click', () => {

    const statusElement = document.getElementById('results-display');
    const selectElement = document.getElementById('ticker-group-select');
    const selectedGroupKey = selectElement.value;

    if (!selectedGroupKey) {
        alert("Please select a ticker group first.");
        return;
    }

    const selectedList = TICKET_GROUPS[selectedGroupKey];
    let tickers1 = selectedList.map(t => t.trim().toUpperCase()); // Use the array directly
    const tickerString = tickers1.join(', ').trim();
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
        tickers: tickers
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
