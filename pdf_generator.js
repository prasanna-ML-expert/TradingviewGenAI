// pdf_generator.js (Runs in results.html tab, uses 'browser' for Firefox)

// Listener to receive the final data from the service worker
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generatePDF') {
        document.getElementById('status').textContent = "Data received. Building table...";
        buildTableAndDownloadPDF(request.data, request.tickers, request.headers);
    }
});
function buildTableAndDownloadPDF(results, tickers, queryHeaders) {
    const tableContainer = document.getElementById('table-container');
    // Ensure the element for the screenshot is clear, just in case
    const screenshotOutput = document.getElementById('screenshot-output');
    if (screenshotOutput) {
        screenshotOutput.innerHTML = '';
    }

    let htmlContent = '<table><thead><tr><th>Query</th>';

    // 1. Build Table Headers (Tickers)
    tickers.forEach(t => {
        htmlContent += `<th>${t}</th>`;
    });
    htmlContent += '</tr></thead><tbody>';

    // 2. Build Table Rows (Queries)
    for (let i = 1; i <= 5; i++) {
        const queryKey = `queryGemini${i}`;
        const header = queryHeaders[i - 1];

        htmlContent += `<tr><td><strong>${header}</strong></td>`;

        tickers.forEach(ticker => {
            const rawCellData = results[ticker][queryKey] || 'N/A';
            // Clean markdown syntax (**) and new lines (\n) for HTML/PDF rendering
            let cleanCellData = rawCellData.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
            
            // Apply error highlighting
            if (cleanCellData.includes('[ERROR:') || cleanCellData.includes('API_ERROR') || cleanCellData.includes('[N/A:')) {
                 cleanCellData = `<span style="color: red;">${cleanCellData}</span>`;
            }
            
            htmlContent += `<td>${cleanCellData}</td>`;
        });
        htmlContent += '</tr>';
    }

    htmlContent += '</tbody></table>';
    tableContainer.innerHTML = htmlContent;
    document.getElementById('status').textContent = "Table generated. Generating PDF...";


    const opt = {
        margin:       0.5, // inches
        filename:     'Quantum_Stock_Analysis.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, logging: false, dpi: 192, letterRendering: true },
        // Set orientation to landscape for the wide table
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    setTimeout(() => {
        const element = document.getElementById('printable-content'); 
        if (!element) {
            document.getElementById('status').textContent = "Error: Printable container not found (Check results.html).";
            console.error("html2pdf ERROR: Target element #printable-content is missing from the DOM.");
            return;
        }
        if (element && !element.querySelector('h1')) {
        const headerHtml = "<h1>Stock Comparative Analysis Report By www.JayIndicators.com</h1>";
        element.insertAdjacentHTML('afterbegin', headerHtml);
    }
        /*if (window.html2pdf) {
            window.html2pdf().set(opt).from(element).save()
                .then(() => {
                    document.getElementById('status').textContent = "PDF generated and downloaded!";
                })
                .catch(err => {
                    console.error("html2pdf generation failed:", err);
                    document.getElementById('status').textContent = "Error: PDF generation failed. Check console for details.";
                });
        } */
        if (window.jspdf) {
            // Fallback using original jsPDF logic if html2pdf isn't loaded
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'pt', 'a4');
            // NOTE: Fallback targets tableContainer, not element/document.body
            doc.html(tableContainer, {
                callback: function (doc) {
                    document.getElementById('status').textContent = "PDF ready. Downloading...";
                    doc.save('Quantum_Stock_Analysis_Fallback.pdf');
                },
                x: 10,
                y: 10,
                width: 822,
                windowWidth: 822
            });
        } else {
             document.getElementById('status').textContent = "Error: PDF library not found!";
        }
    }, 100); // Execute asynchronously after the DOM has updated
}
async function buildTableCaptureAndDownloadPDF(results, tickers, queryHeaders) {
    const tableContainer = document.getElementById('table-container');
    const screenshotOutput = document.getElementById('screenshot-output');
    
    let htmlContent = '<table><thead><tr>';//<th>Query</th>';

    // 1. Build Table Headers
    tickers.forEach(t => { htmlContent += `<th>${t}</th>`; });
    htmlContent += '</tr></thead><tbody>';

    // 2. Build Table Rows
    for (let i = 1; i <= 5; i++) {
        const queryKey = `queryGemini${i}`; 
        const header = queryHeaders[i - 1]; 

        htmlContent += `<tr>`;//<td><strong>${header}</strong></td>`;
        tickers.forEach(ticker => {
            const rawCellData = results[ticker][queryKey] || '[N/A: Result object was empty.]'; 
            let cleanCellData = rawCellData.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
            if (cleanCellData.includes('[ERROR:') || cleanCellData.includes('API_ERROR')) {
                 cleanCellData = `<span style="color: red;">${cleanCellData}</span>`;
            }
            htmlContent += `<td>${cleanCellData}</td>`;
        });
        htmlContent += '</tr>';
    }
    htmlContent += '</tbody></table>';
    tableContainer.innerHTML = htmlContent;
    document.getElementById('status').textContent = "Table generated. Capturing screenshot...";


    try {
        // Send request to service worker for the chart screenshot
        const screenshotResponse = await browser.runtime.sendMessage({ 
            action: 'captureChartScreenshot' 
        });

        if (screenshotResponse && screenshotResponse.imageDataUrl) {
            console.log("Chart screenshot captured successfully.");
            const imgElement = document.createElement('img');
            imgElement.src = screenshotResponse.imageDataUrl;
            imgElement.alt = "Screenshot of original chart tab";
            
            const imgTitle = document.createElement('h2');
            imgTitle.textContent = "Original Chart Tab Screenshot";
            imgTitle.style.marginTop = "30px"; 

            screenshotOutput.appendChild(imgTitle);
            screenshotOutput.appendChild(imgElement);
            document.getElementById('status').textContent = "Screenshot embedded. Generating PDF...";
        } else {
            console.error("Failed to get chart screenshot image data:", screenshotResponse.error);
            screenshotOutput.innerHTML = `<p style="color: red;">Error: Could not capture chart screenshot. ${screenshotResponse.error || 'Unknown error'}</p>`;
            document.getElementById('status').textContent = "Failed to capture chart screenshot. Generating PDF without image.";
        }
    } catch (error) {
        console.error("Error during screenshot capture communication:", error);
        screenshotOutput.innerHTML = `<p style="color: red;">Critical Error: Chart screenshot process failed.</p>`;
        document.getElementById('status').textContent = "Critical error in screenshot. Generating PDF without image.";
    }


    // 3. Generate PDF using html2pdf.js (same as before)
    document.getElementById('status').textContent = "Finalizing PDF...";
    const element = document.body; 

    const opt = {
        margin:       0.5, 
        filename:     'Quantum_Stock_Analysis_with_Chart_Screenshot.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, logging: false, dpi: 192, letterRendering: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    // Use html2pdf (or jsPDF if html2pdf isn't available, but html2pdf is preferred here)
    if (window.html2pdf) {
        window.html2pdf().set(opt).from(element).save();
    } else {
        // Fallback using original jsPDF logic (may not render image)
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'pt', 'a4'); 
        doc.html(element, {
            callback: function (doc) {
                doc.save('Quantum_Stock_Analysis_Fallback.pdf');
            },
            x: 10, y: 10, width: 822, windowWidth: 822 
        });
    }

    document.getElementById('status').textContent = "PDF generated and downloaded!";
}
