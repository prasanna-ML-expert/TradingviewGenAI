// pdf_generator.js (Runs in results.html tab, uses 'browser' for Firefox)

// Listener to receive the final data from the service worker
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generatePDF') {
        document.getElementById('status').textContent = "Data received. Building table...";
        getBase64FromBackground(request.imageUrl).then(base64Image => {
            buildTableAndDownloadPDF(
                request.data, 
                request.tickers, 
                request.headers,
                request.groupName,
                base64Image
            );
        });

    }
});
function buildTableAndDownloadPDF(results, tickers, queryHeaders,groupName,base64Image) {
    const tableContainer = document.getElementById('table-container');
    // Ensure the element for the screenshot is clear, just in case
    const screenshotOutput = document.getElementById('screenshot-output');
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    document.title = `${groupName} Analysis Report`;
    const fileName = `${groupName}_${date}.pdf`;
    if (screenshotOutput) {
        screenshotOutput.innerHTML = '';
    }

    let htmlContent = '<table><thead><tr>';//<th>Query</th>';

    // 1. Build Table Headers (Tickers)
    tickers.forEach(t => {
        htmlContent += `<th>${t}</th>`;
    });
    htmlContent += '</tr></thead><tbody>';

    // 2. Build Table Rows (Queries)
    for (let i = 1; i <= 5; i++) {
        const queryKey = `queryGemini${i}`;
        const header = queryHeaders[i - 1];

        htmlContent += `<tr>`;//<td><strong>${header}</strong></td>`;

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
    document.getElementById('status').textContent = `${groupName} stocks as of ${date}`;
    const imageOutput = document.getElementById('image-output');
    if (imageOutput && base64Image) {
        imageOutput.innerHTML = `
            <h2>TradingView Chart Snapshot</h2>
            <img src="${base64Image}" style="max-width: 95%; height: auto; margin-bottom: 20px;">
        `;
    } else if (imageOutput) {
        imageOutput.innerHTML = `<p>[No Chart Snapshot Provided or Failed to Load]</p>`;
    }

    const opt = {
        margin:       0.5, // inches
        filename:     fileName,
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
        if (window.html2pdf) {
            window.html2pdf().set(opt).from(element).save()
                .then(() => {
                    document.getElementById('status').textContent = "PDF generated and downloaded!";
                })
                .catch(err => {
                    console.error("html2pdf generation failed:", err);
                    document.getElementById('status').textContent = "Error: PDF generation failed. Check console for details.";
                });
        }
        else if (window.jspdf) {
            // Fallback using original jsPDF logic if html2pdf isn't loaded
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'pt', 'a4');
            // NOTE: Fallback targets tableContainer, not element/document.body
            doc.html(tableContainer, {
                callback: function (doc) {
                    document.getElementById('status').textContent = "PDF ready. Downloading...";
                    doc.save(fileName);
                },
                x: 10,
                y: 10,
                width: 822,
                windowWidth: 822
            });
        } else {
             document.getElementById('status').textContent = "Error: PDF library not found!";
        }
    }, 1000); // Execute asynchronously after the DOM has updated
}

async function getBase64FromBackground(url) {
    if (!url || !url.startsWith('http')) return null;

    try {
        // Send the URL to the background script for proxying and conversion
        const response = await browser.runtime.sendMessage({
            action: 'fetchImageAsBase64',
            url: url
        });

        if (response.success && response.base64Data) {
            return response.base64Data;
        } else {
            console.error("Background proxy failed or returned no data:", response.error);
            return null;
        }
    } catch (error) {
        console.error("Error communicating with background script:", error);
        return null;
    }
}
