// contentScript_charts.js

console.log("Chart Population Script Loaded. (Forward Slash Hotkey Strategy with Enter Fix)");

// --- Constants for Timing and Key Codes ---
const DELAY_MS = 100; // Base delay for control keys
const QUICK_WAIT_MS = 10; // Minimal internal wait time for control keys
const LONGER_DELAY = 1500; // Wait for chart load/results (REQUIRED)

const FORWARD_SLASH_CODE = 187; // Key code for '/'
const ENTER_CODE = 13;
const TAB_CODE = 9;

// --- Core Simulation Helpers ---

function getCharCode(char) {
    return char.toUpperCase().charCodeAt(0);
}

/**
 * Finds the dynamically created ticker search input field using the confirmed role.
 */
function findActiveSearchInput() {
    // Using the highly specific selector confirmed from inspection:
    return document.querySelector('input[role="searchbox"]');
}

/**
 * Simulates a key press event, using the window for global events.
 */
function simulateKeyPress(targetElement, key, keyCode, eventType = 'keydown') {
    if (!targetElement) {
        targetElement = window; 
    }

    const event = new KeyboardEvent(eventType, {
        key: key,
        keyCode: keyCode,
        which: keyCode, 
        bubbles: true,
        // CRITICAL FOR ENTER: Include charCode for keypress if it's Enter
        charCode: eventType === 'keypress' ? keyCode : 0, 
    });
    
    targetElement.dispatchEvent(event); 
}

/**
 * FIX: Simulates a complete down/press/up cycle for non-character keys (Enter, Tab).
 * This ensures the necessary 'keypress' event is sent to trigger confirmation.
 */
function simulateControlKey(targetElement, key, keyCode) {
    simulateKeyPress(targetElement, key, keyCode, 'keydown');
    // Minimal delay between events
    setTimeout(() => {
        // Include the press event for reliability
        simulateKeyPress(targetElement, key, keyCode, 'keypress'); 
        
        // Minimal delay before up
        setTimeout(() => {
            simulateKeyPress(targetElement, key, keyCode, 'keyup');
        }, QUICK_WAIT_MS);

    }, QUICK_WAIT_MS);
}


// --- Main Chart Population Function ---
function findChartContainer() {
    // This selector is the key to forcing focus back to the chart input area.
    return document.querySelector('.chart-widget-holder'); 
}
async function populateCharts(TICKET_LIST) {
    console.log("Charts Script: Starting forward slash hotkey population...");

    for (let i = 0; i < TICKET_LIST.length; i++) {
        const ticker = TICKET_LIST[i];
        
        // 1. Initial pause
        await new Promise(resolve => setTimeout(resolve, DELAY_MS * 4)); 

        // 2. Send the '/' hotkey to open the search box
        simulateControlKey(window, 'a', FORWARD_SLASH_CODE);
        console.log(`Charts Script: Sent '/' hotkey to open the box.`);
            
        // 3. CRITICAL POLLING LOGIC: Wait for the input box to appear
        let inputElement = null;
        let attempts = 0;
        const maxAttempts = 20; // Check every 50ms for 1 second total
        while (!inputElement && attempts < maxAttempts) {
            inputElement = findActiveSearchInput();
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        if (!inputElement) {
            console.error("Charts Script: FAILED to find active search input after '/' hotkey. Skipping ticker.");
            continue;
        }
        
        // 4. DIRECT INJECTION
        inputElement.value = ticker.toUpperCase();

        // 5. DISPATCH INPUT EVENT
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`Charts Script: Successfully injected full ticker: ${ticker}`);

        // --- Confirmation ---
        
        // 6. Wait for search results based on the injected value
        await new Promise(resolve => setTimeout(resolve, LONGER_DELAY)); 
        
        // 7. Hit Enter (13) to confirm selection (Target the window for global confirmation)
        simulateControlKey(inputElement, 'Enter', ENTER_CODE);
        console.log("Charts Script: Sent Enter key.");

        // 8. CRITICAL: Wait longer after Enter to allow the dialog to close and chart to update
        await new Promise(resolve => setTimeout(resolve, LONGER_DELAY * 2)); 
        const nextChartContainer = findChartContainer();
        // 9. If not the last ticker, hit TAB (9) to switch focus
        if (i < TICKET_LIST.length - 1) {
            simulateControlKey(window, 'Tab', TAB_CODE); 
            // Wait after pressing Tab 
            await new Promise(resolve => setTimeout(resolve, DELAY_MS * 5)); 
        }

        console.log(`Charts Script: Chart ${i + 1} set to ${ticker}`);
    }

    return { status: 'success' };
}

// Listener for the 'populateCharts' action. This is ASYNCHRONOUS.
browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'populateCharts' && request.tickerList) {
        const result = await populateCharts(request.tickerList);
        sendResponse(result);
        return true; 
    }
});
