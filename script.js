// ==UserScript==
// @name         Exhentai Direct Archive Download button
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add a button to download the original archive directly from the search page on Exhentai (without having to open the gallery page). The download is simply a shortcut for the normal download process, so it still consumes GP and follows the same rules
// @author       Troy T
// @match        https://exhentai.org/*
// @match        https://e-hentai.org/*
// @connect      exhentai.org
// @connect      hath.network
// @connect      *.hath.network
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Loop through all gallery items on the search page
    var galleryItems = document.querySelectorAll('.gl1t');

    galleryItems.forEach(function(item) {
        var galleryLink = item.querySelector('a').href; // Get the gallery link

        // Create a new button element
        var downloadButton = document.createElement('button');
        downloadButton.innerText = 'Download Original Archive';
        downloadButton.style.marginLeft = '10px';
        downloadButton.style.backgroundColor = '#f1c40f';
        downloadButton.style.border = 'none';
        downloadButton.style.padding = '5px';
        downloadButton.style.cursor = 'pointer';

        // Add the button to the gallery item
        item.appendChild(downloadButton);

        // Set up the button click action
        downloadButton.addEventListener('click', function() {
            // console.log("Fetching gallery page: " + galleryLink); // Log the gallery link being accessed

            // Step 1: Fetch the gallery page to find the archive download link
            GM_xmlhttpRequest({
                method: 'GET',
                url: galleryLink,
                onload: function(response) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response.responseText, 'text/html');

                    // console.log("Response from gallery page:", response.responseText); // Log the full HTML of the page

                    // Find the anchor element with "onclick" containing "popUp"
                    var archiveDownloadAnchor = doc.querySelector('a[onclick^="return popUp"]');

                    if (archiveDownloadAnchor) {
                        // console.log("Found archiveDownloadAnchor:", archiveDownloadAnchor); // Log the archiveDownloadAnchor element

                        // Extract the URL from the onclick attribute, which contains a popUp() call
                        var onclickContent = archiveDownloadAnchor.getAttribute('onclick');
                        var archiveUrlMatch = onclickContent.match(/popUp\('(.+?)'/);

                        if (archiveUrlMatch && archiveUrlMatch[1]) {
                            var archiveUrl = archiveUrlMatch[1];
                            // console.log("Extracted archive URL:", archiveUrl); // Log the extracted URL

                            // Step 2: Fetch the page where the form exists
                            GM_xmlhttpRequest({
                                method: 'GET',
                                url: archiveUrl,
                                onload: function(archivePageResponse) {
                                    var archiveDoc = parser.parseFromString(archivePageResponse.responseText, 'text/html');
                                    // console.log("Response from archive page:", archivePageResponse.responseText); // Log the archive page HTML

                                    // Now, find the form and its submit button
                                    var formElement = archiveDoc.querySelector('form[action*="archiver.php"]');
                                    var formAction = formElement.getAttribute('action');
                                    // console.log("Form action URL:", formAction);

                                    // Step 3: Simulate submitting the form by POSTing the request with the dltype=org data
                                    GM_xmlhttpRequest({
                                        method: 'POST',
                                        url: formAction,
                                        headers: {
                                            'Content-Type': 'application/x-www-form-urlencoded'
                                        },
                                        data: 'dltype=org&dlcheck=Download Original Archive', // Simulate form submission with the correct values
                                        onload: function(formSubmitResponse) {
                                            var formSubmitDoc = parser.parseFromString(formSubmitResponse.responseText, 'text/html');
                                            // console.log("Response from form submission page (loading page):", formSubmitResponse.responseText); // Log the loading page HTML

                                            // Step 4: Extract the final redirect URL from the <a> tag or JavaScript
                                            var redirectLink = formSubmitDoc.querySelector('#continue a') || formSubmitDoc.querySelector('script').innerText.match(/document\.location\s*=\s*"(.+?)"/)[1];

                                            if (redirectLink) {
                                                // console.log("Found final download URL from redirect:", redirectLink); // Log the redirect URL

                                                // Step 5: Start polling the final URL to check when the download link appears
                                                var checkForDownloadLink = function() {
                                                    GM_xmlhttpRequest({
                                                        method: 'GET',
                                                        url: redirectLink,
                                                        onload: function(downloadPageResponse) {
                                                            var downloadDoc = parser.parseFromString(downloadPageResponse.responseText, 'text/html');
                                                            // console.log("Response from download page:", downloadPageResponse.responseText); // Log the download page HTML

                                                            // Step 6: Check for the download link or "Click Here To Start Downloading"
                                                            var finalDownloadLink = downloadDoc.querySelector('a[href^="/archive/"]') || downloadDoc.body.innerHTML.includes("Click Here To Start Downloading");

                                                            if (finalDownloadLink) {
                                                                var finalUrl = redirectLink + "?start=1"; // Add ?start=1 to the redirect URL
                                                                // console.log("Final download URL:", finalUrl); // Log the final download URL
                                                                // Step 7: Trigger the download
                                                                var a = document.createElement('a');
                                                                a.href = finalUrl;
                                                                a.style.display = 'none';
                                                                document.body.appendChild(a);
                                                                a.click(); // Simulate click
                                                                document.body.removeChild(a); // Clean up
                                                            } else {
                                                                // console.log("Download link not available yet. Retrying in 2 seconds...");
                                                                setTimeout(checkForDownloadLink, 2000); // Retry after 2 seconds
                                                            }
                                                        }
                                                    });
                                                };

                                                // Start polling for the download link
                                                checkForDownloadLink();
                                            } else {
                                                alert('Could not extract the final download URL!');
                                                // console.log("Redirect URL not found in page:", formSubmitResponse.responseText);
                                            }
                                        }
                                    });
                                }
                            });
                        } else {
                            alert('Could not extract archive URL from onclick attribute!');
                            // console.log("Onclick content:", onclickContent); // Log onclick content for debugging
                        }
                    } else {
                        alert('Archive download link not found!');
                        // console.log("Archive download link not found in page:", response.responseText); // Log the HTML for further inspection
                    }
                }
            });
        });
    });
})();
