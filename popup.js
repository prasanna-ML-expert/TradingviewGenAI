document.addEventListener('DOMContentLoaded', function () {
    console.log('1. DOMContentLoaded fired. Script loaded successfully.'); // ✅ Initial check

    const queryButton = document.getElementById('query-button');

    if (!queryButton) {
        console.error('2. ERROR: Could not find element with ID "query-button". Check your popup.html.');
        return; // ❌ Critical error check
    } else {
        console.log('2. query-button element found.');
    }

    queryButton.addEventListener('click', function () {
        console.log('3. Query button clicked. Starting tab query.'); // ✅ Button click check

        browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length === 0) {
                console.error('4. ERROR: No active tab found.'); // ❌ Tab query failure
                return;
            }
            console.log('4. Tab query successful. Sending message to tab ID:', tabs[0].id); // ✅ Tab query success

            browser.tabs.sendMessage(tabs[0].id, { action: 'getTickerSymbol' }, function (response) {
                if (browser.runtime.lastError) {
                    console.error('5. ERROR sending/receiving message to/from content script:', browser.runtime.lastError.message); // ❌ Content script communication failure
                    return;
                }
                
                if (!response || !response.tickerSymbol) {
                    console.error('5. ERROR: Content script returned no response or no tickerSymbol.'); // ❌ Content script data failure
                    return;
                }
                
                const tickerSymbol = response.tickerSymbol;
                console.log('5. Successfully received Ticker Symbol:', tickerSymbol); // ✅ Content script success

                browser.runtime.sendMessage({ action: 'queryGemini', tickerSymbol }, function (response) {
                    if (browser.runtime.lastError) {
                        console.error('6. ERROR sending/receiving message to/from background script:', browser.runtime.lastError.message); // ❌ Background script communication failure
                        return;
                    }

                    const resultElement = document.getElementById('result');
                    if (response && response.result) {
                        const markdownText = response.result;
        
                        // 💡 CRITICAL: Convert Markdown to HTML here
                        const htmlContent = marked.parse(markdownText);
                        
                        // 💡 Set the innerHTML instead of textContent
                        resultElement.innerHTML = htmlContent;
                        //resultElement.textContent = response.result;
                        console.log('7. Successfully received and displayed Gemini result.'); // ✅ Final success
                    } else {
                        resultElement.textContent = 'Error querying Gemini (No result returned)';
                        console.error('7. ERROR: Background script returned no valid result.'); // ❌ Background script processing failure
                    }
                });
                console.log('6. Message sent to background script.'); // ✅ Background script initiation
            });
            console.log('5. Tab message initiated.'); // ✅ Tab message initiation
        });
    });
});
