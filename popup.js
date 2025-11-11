// popup.js - FINAL VERSION

document.addEventListener('DOMContentLoaded', function () {
    const queryButton = document.getElementById('query-button1');
    const resultElement = document.getElementById('result');
    const spinnerElement = document.getElementById('loading-spinner');
    // Ensure you have this element ID in your HTML
    const currentActionElement = document.getElementById('current-action'); 
    
    if (!queryButton || !resultElement || !spinnerElement || !currentActionElement) {
        console.error('ERROR: Missing required DOM elements. Check HTML IDs.');
        return;
    } 

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
});
