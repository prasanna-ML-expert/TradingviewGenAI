// background.js - Corrected and Refactored

console.log("Background Script: Listener registered.");

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    console.log("1. Background Script: Message received.", request);
    
    // --- Configuration ---
    const apiKey = 'AIzaSyAM5UmgNhkEf9F09D-wu_Dymdb4oefqP5w';
    const apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    let query = null; // Initialize query as null
    let actionType = null;

    // --- Conditional Query String Logic (Cleaned up) ---
    if (request.action === 'queryGemini1') {
        actionType = 'Full Analysis';
        query = `What business is USA NYSE/NASDAQ stock ${request.tickerSymbol} into showing business focus areas in bold text, latest as of today dated news, any announcement of strategic alternatives, busines pivots since inception. total percentage of institutional ownership from 13f filings as of today, Recent large orders and fortune 500 tieups with value. exclude disclaimer`;
        
    } else if (request.action === 'queryGemini2') {
        actionType = 'Dilution/Peer Analysis';
        query = `For USA NYSE/NASDAQ stock ${request.tickerSymbol} concise Risk of stock dilution and warrants from recent forms 8k and 10q SEC filings considering footnotes as of today. List all peer listed company tickers in single sentence. what is the total open interest across all future expiry dates and strike prices in single sentence along with put call ratio. exclude disclaimer`;
    }

    // --- Execution Block (Only runs if a valid action set the query) ---
    if (query && request.tickerSymbol) {
        
        console.log(`2. Background Script: Action matched '${actionType}'. Ticker: ${request.tickerSymbol}`);
        console.log("3. Background Script: Initiating fetch to Gemini API. Query:", query.substring(0, 80) + "..."); // Log a snippet
        
        const requestBody = {
            contents: [{
                parts: [{ text: query }]
            }],
            // Use 'tools' outside of 'contents' array, as siblings
            tools: [{
                googleSearch: {}
            }]
        };

        fetch(`${apiEndpoint}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody) // Use the cleaned-up requestBody object
        })
        .then(response => {
            console.log("4. Background Script: Fetch successful. Response status:", response.status);
            if (!response.ok) {
                console.error("5. Background Script: ERROR! HTTP error status received.", response.statusText);
                throw new Error(`HTTP error! status: ${response.status} (${response.statusText})`);
            }
            return response.json();
        })
        .then(data => {
            console.log("6. Background Script: JSON received and parsed.");
            
            // Check for API errors or empty response
            if (data.error) {
                console.error("7. Background Script: ERROR from Gemini API:", data.error.message);
                sendResponse({ error: `Gemini API Error: ${data.error.message}` });
            } else if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                const resultText = data.candidates[0].content.parts[0].text;
                console.log("8. Background Script: Sending success response to popup.");
                // The popup listener will receive this object: { result: resultText }
                sendResponse({ result: resultText }); 
            } else {
                console.error("7. Background Script: ERROR! Gemini response data structure invalid.", data);
                sendResponse({ error: 'Failed to parse Gemini response' });
            }
        })
        .catch(error => {
            console.error('9. Background Script: CRITICAL Error during fetch or processing:', error.message);
            sendResponse({ error: `Failed to query Gemini: ${error.message}` });
        });
        
        // CRITICAL: Return true to signal asynchronous response
        return true;
        
    } else {
        // Handle case where action or ticker is missing/invalid
        console.error("2. Background Script: ERROR! Invalid action or missing tickerSymbol:", request);
        sendResponse({ error: "Invalid action or missing Ticker Symbol in message." });
        return false; // Not needed, but good practice to show this path is synchronous
    }
});
