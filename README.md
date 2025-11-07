This extension is displayed on sidebar instead of on popup that goes away/hidden after clicking anywhere on the browser.

To add this extension to firefox, goto the url about:debugging, select this firefox and click on load temporary add-on.
select manifest.json file to load it.
If any changes are made to the code locally, reload the extension.

The extension can be seen on sidebar. after loading any chart on tradingview supercharts, click on Query Gemini to get the details about the company.

API key can be generated at the below link and billing can also be viewed there
https://aistudio.google.com/

If wanted to add billing to the project add it in the below console link
https://console.cloud.google.com/billing/

backgrounscript.js line 10 has the api key and apiendpoint url on line 11.
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent

marked up text response from gemini api is displayed using marked.min.js script in easily readable format.


The below tools/googlesearch configuration is important to ground the model/api results based on google search for latest updates.

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
                }],
                    tools: [{
                        googleSearch: {}
                    }]

            })
        })
