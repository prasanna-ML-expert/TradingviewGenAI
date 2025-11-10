// popup.js - FIXED AND REFACTORED

document.addEventListener('DOMContentLoaded', function () {
    console.log('1. DOMContentLoaded fired. Script loaded successfully.');

    const queryButton1 = document.getElementById('query-button1');
    const queryButton2 = document.getElementById('query-button2');
    const resultElement = document.getElementById('result'); // Get the result element once

    // --- FIX 1: Correctly check for both button elements ---
    if (!queryButton1 || !queryButton2 || !resultElement) {
        console.error('2. ERROR: Could not find one or more required elements (query-button1, query-button2, or result). Check your popup.html.');
        return;
    } else {
        console.log('2. All required elements found.');
    }

    // --- REUSABLE FUNCTION for querying and displaying ---
    function runQueryAndDisplay(actionType, shouldAppend) {
        console.log(`3. Button clicked for action ${actionType}. Starting tab query.`);

        // Use the modern promise-based API for query and messaging
        browser.tabs.query({ active: true, currentWindow: true })
            .then(tabs => {
                if (tabs.length === 0) {
                    throw new Error('4. ERROR: No active tab found.');
                }
                
                // Get Ticker Symbol from Content Script
                return browser.tabs.sendMessage(tabs[0].id, { action: 'getTickerSymbol' });
            })
            .then(response => {
                if (!response || !response.tickerSymbol) {
                    throw new Error('5. ERROR: Content script returned no tickerSymbol.');
                }
                const tickerSymbol = response.tickerSymbol;
                console.log('5. Successfully received Ticker Symbol:', tickerSymbol);

                // Send Query to Background Script
                return browser.runtime.sendMessage({ action: actionType, tickerSymbol });
            })
            .then(response => {
                if (response && response.result) {
                    const markdownText = response.result;
                    const htmlContent = marked.parse(markdownText);
                    
                    // --- FIX 2 & 3: Conditional Display Logic ---
                    if (shouldAppend) {
                        // Append content for the second query
                        resultElement.insertAdjacentHTML('beforeend', htmlContent);
                        console.log('7. Successfully received and appended Gemini result.');
                    } else {
                        // Replace content for the first query
                        resultElement.innerHTML = htmlContent;
                        console.log('7. Successfully received and set Gemini result.');
                    }
                } else {
                    // Handle API error in response
                    const errorMessage = `Error querying Gemini for ${actionType}.`;
                    
                    if (shouldAppend) {
                        resultElement.insertAdjacentHTML('beforeend', `<p style="color:red;">${errorMessage}</p>`);
                    } else {
                        resultElement.innerHTML = `<p style="color:red;">${errorMessage}</p>`;
                    }
                    
                    console.error('7. ERROR: Background script returned no valid result.');
                }
            })
            .catch(error => {
                // Catch any error from tab query, message send, or API response
                console.error('Caught Error in Chain:', error.message || error);
                resultElement.innerHTML = `<p style="color:red;">Fatal Error: ${error.message || 'Unknown error occurred.'}</p>`;
            });
    }

    // --- Add Event Listeners ---
    queryButton1.addEventListener('click', () => {
        // queryGemini1: Set/Replace the content (shouldAppend: false)
        runQueryAndDisplay('queryGemini1', false); 
    });

    queryButton2.addEventListener('click', () => {
        // queryGemini2: Append the content (shouldAppend: true)
        runQueryAndDisplay('queryGemini2', true);
    });
});
