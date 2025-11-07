// --- Start of Background Script Execution Debug ---
console.log("Background Script: Listener registered.");
// ----------------------------------------------------

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    console.log("1. Background Script: Message received.", request); // ✅ Message received?

    if (request.action === 'queryGemini') {
        const apiKey = 'xxxxxxxxxxxxxxxxx';
        const apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

        const query = `What business is USA NASDAQ stock ${request.tickerSymbol} into its founders latest as of today dated news and any announcement of strategic alternatives exclude disclaimer`;

        console.log("2. Background Script: Action matches 'queryGemini'. Ticker:", request.tickerSymbol); // ✅ Action check
        console.log("3. Background Script: Initiating fetch to Gemini API. Query:", query); // ✅ Fetch initiation check

        fetch(`${apiEndpoint}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: query
                    }]
                }], // <-- Single comma here
                
                // Configuration starts here (NO leading comma)

                    tools: [{
                        googleSearch: {}
                    }]

            })
        })
        .then(response => {
            console.log("4. Background Script: Fetch successful. Response status:", response.status); // ✅ Network response status
            if (!response.ok) {
                console.error("5. Background Script: ERROR! HTTP error status received.", response.statusText); // ❌ HTTP error check
                // This will pass control to the catch block for handling.
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("6. Background Script: JSON received and parsed.", data); // ✅ Data received check
            
            // Check for API errors or unexpected data structure
            if (data.error) {
                console.error("7. Background Script: ERROR from Gemini API:", data.error.message); // ❌ API error check
                sendResponse({ error: `Gemini API Error: ${data.error.message}` });
            } else if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                 const resultText = data.candidates[0].content.parts[0].text;
                 console.log("8. Background Script: Sending success response to popup."); // ✅ Final success
                 sendResponse({ result: resultText });
            } else {
                 console.error("7. Background Script: ERROR! Gemini response data structure invalid.", data); // ❌ Unexpected structure
                 sendResponse({ error: 'Failed to parse Gemini response' });
            }
        })
        .catch(error => {
            // This catches network errors, `throw new Error` above, and JSON parsing errors.
            console.error('9. Background Script: CRITICAL Error during fetch or processing:', error); // ❌ Critical error logging
            sendResponse({ error: 'Failed to query Gemini (Network/Processing Error)' });
        });
        
        // CRITICAL: Must return true to tell the browser that sendResponse will be called asynchronously.
        return true; 
    }
});
