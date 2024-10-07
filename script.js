// ==UserScript==
// @name         Exhentai Archive Download Button
// @namespace    https://greasyfork.org/users/581141
// @version      1.2
// @description  Add a button to download the original, resampled archive or use H@H directly from the search page on ExHentai or E-Hentai. The download is simply a shortcut for the normal download process, so it still consumes GP and follows the same rules.
// @author       Troy T
// @match        https://exhentai.org/*
// @match        https://e-hentai.org/*
// @connect      exhentai.org
// @connect      e-hentai.org
// @connect      hath.network
// @connect      *.hath.network
// @grant        GM_xmlhttpRequest
// @license     MIT
// ==/UserScript==

(function() {
    'use strict';

    // Function to show a toast notification with a shrinking progress bar
    function showToast(message) {
        // Create the toast container
        var toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '15px';
        toast.style.backgroundColor = '#333';
        toast.style.color = '#fff';
        toast.style.borderRadius = '5px';
        toast.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.5)';
        toast.style.zIndex = '10000';
        toast.style.fontSize = '14px';
        toast.style.display = 'flex';
        toast.style.flexDirection = 'column';  // Stack icon/text and progress bar vertically
        toast.style.alignItems = 'center';
        toast.style.width = '300px';

        // Add an icon (optional)
        var icon = document.createElement('div');
        icon.innerHTML = '&#10004;'; // Checkmark icon (you can replace this with any other icon)
        icon.style.marginBottom = '10px';
        icon.style.color = '#4CAF50'; // Green color for success
        icon.style.fontSize = '20px';
        toast.appendChild(icon);

        // Add the message
        var messageText = document.createElement('span');
        messageText.textContent = message;
        toast.appendChild(messageText);

        // Create a progress bar at the bottom of the toast
        var progressBar = document.createElement('div');
        progressBar.style.height = '5px';
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = '#4CAF50';  // Green progress bar
        progressBar.style.borderRadius = '0 0 5px 5px';  // Rounded corners only at the bottom
        progressBar.style.transition = 'width 3s linear';  // Smooth shrink over 3 seconds
        toast.appendChild(progressBar);

        // Append the toast to the body
        document.body.appendChild(toast);

        // Start the progress bar shrinking
        setTimeout(function() {
            progressBar.style.width = '0';  // Shrink the width to 0 over 3 seconds
        }, 100);  // Small delay to ensure the progress bar appears at full width first

        // Automatically remove the toast after 3 seconds
        setTimeout(function() {
            toast.style.transition = 'opacity 0.5s ease-in-out';
            toast.style.opacity = '0';
            setTimeout(function() {
                document.body.removeChild(toast);
            }, 500); // Wait for the fade-out transition to complete
        }, 3000); // Display for 3 seconds
    }


    // Loop through all gallery items on the search page
    var galleryItems = document.querySelectorAll('.gl1t');

    galleryItems.forEach(function(item) {
        var galleryLink = item.querySelector('a').href; // Get the gallery link

        // Create a container div for buttons
        var buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex'; // Flex container for side-by-side buttons
        buttonContainer.style.gap = '5px'; // Gap between the buttons

        // Create a button style function to match the existing page style
        function createButton(text) {
            var button = document.createElement('button');
            button.innerText = text;
            button.style.padding = '5px 10px';  // Padding similar to the existing button style
            button.style.cursor = 'pointer';    // Pointer cursor for interaction
            button.style.border = '1px solid #ccc';  // Light border similar to the website
            button.style.backgroundColor = 'transparent'; // Match the page background color
            button.style.color = 'inherit';  // Use the same text color as the page
            button.style.fontSize = '12px';  // Match the font size for the website
            return button;
        }

        // Create the Original Archive button
        var downloadOriginalButton = createButton('Download Orginal');

        // Create the Resample Archive button
        var downloadResampleButton = createButton('Download Resample');

        // Create the Remote Server Download button (H@H)
        var downloadHaHButton = createButton('Download H@H');

        // Add all buttons to the container
        buttonContainer.appendChild(downloadOriginalButton);
        buttonContainer.appendChild(downloadResampleButton);
        buttonContainer.appendChild(downloadHaHButton);

        // Add the button container to the gallery item
        item.appendChild(buttonContainer);

        // Helper function to handle downloads (Original, Resample, or H@H)
        function handleDownloadButton(archiveType) {
            console.log("Fetching gallery page: " + galleryLink); // Log the gallery link being accessed

            // Step 1: Fetch the gallery page to find the archive download link
            GM_xmlhttpRequest({
                method: 'GET',
                url: galleryLink,
                onload: function(response) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(response.responseText, 'text/html');

                    // Find the anchor element with "onclick" containing "popUp"
                    var archiveDownloadAnchor = doc.querySelector('a[onclick^="return popUp"]');
                    
                    if (archiveDownloadAnchor) {
                        console.log("Found archiveDownloadAnchor:", archiveDownloadAnchor); // Log the anchor element

                        // Extract the URL from the onclick attribute (popUp() call)
                        var onclickContent = archiveDownloadAnchor.getAttribute('onclick');
                        var archiveUrlMatch = onclickContent.match(/popUp\('(.+?)'/);
                        
                        if (archiveUrlMatch && archiveUrlMatch[1]) {
                            var archiveUrl = archiveUrlMatch[1];
                            console.log("Extracted archive URL:", archiveUrl); // Log the extracted URL

                            // Step 2: Fetch the page where the form exists
                            GM_xmlhttpRequest({
                                method: 'GET',
                                url: archiveUrl,
                                onload: function(archivePageResponse) {
                                    var archiveDoc = parser.parseFromString(archivePageResponse.responseText, 'text/html');

                                    // Check if we are handling the H@H download
                                    if (archiveType === 'hath') {
                                        // Handle H@H download by submitting the form for H@H server
                                        var formElement = archiveDoc.querySelector('#hathdl_form');
                                        if (formElement) {
                                            var formAction = formElement.getAttribute('action');
                                            var formData = new FormData(formElement);
                                            formData.set('hathdl_xres', 'org'); // Set to 'Original'

                                            // Submit the form for remote server download
                                            GM_xmlhttpRequest({
                                                method: 'POST',
                                                url: formAction,
                                                data: new URLSearchParams(formData), // Simulate the form submission
                                                onload: function(formSubmitResponse) {
                                                    var successMessage = "An original resolution download has been queued for client";
                                                    if (formSubmitResponse.responseText.includes(successMessage)) {
                                                        showToast("H@H download successfully started!");
                                                        console.log("H@H download successfully queued.");
                                                    } else {
                                                        console.log("Failed to queue H@H download.");
                                                    }
                                                }
                                            });
                                        } else {
                                            showToast('H@H form not found!');
                                            console.log("Form element for H@H download not found.");
                                        }
                                        return;
                                    }

                                    // For original or resample downloads
                                    var formElement = archiveDoc.querySelector('form[action*="archiver.php"]');
                                    var formAction = formElement.getAttribute('action');
                                    console.log("Form action URL:", formAction); // Log the form action URL

                                    // Step 3: Simulate submitting the form by POSTing the request
                                    var dltypeValue = archiveType === 'original' ? 'org' : 'res';
                                    GM_xmlhttpRequest({
                                        method: 'POST',
                                        url: formAction,
                                        headers: {
                                            'Content-Type': 'application/x-www-form-urlencoded'
                                        },
                                        data: `dltype=${dltypeValue}&dlcheck=Download ${archiveType === 'original' ? 'Original' : 'Resample'} Archive`,
                                        onload: function(formSubmitResponse) {
                                            var formSubmitDoc = parser.parseFromString(formSubmitResponse.responseText, 'text/html');

                                            // Extract the final redirect URL
                                            var redirectLink = formSubmitDoc.querySelector('#continue a') || formSubmitDoc.querySelector('script').innerText.match(/document\.location\s*=\s*"(.+?)"/)[1];

                                            if (redirectLink) {
                                                console.log(`Found final ${archiveType} download URL from redirect:`, redirectLink);

                                                // Poll for the final download link
                                                var checkForDownloadLink = function() {
                                                    GM_xmlhttpRequest({
                                                        method: 'GET',
                                                        url: redirectLink,
                                                        onload: function(downloadPageResponse) {
                                                            var downloadDoc = parser.parseFromString(downloadPageResponse.responseText, 'text/html');

                                                            // Check for the download link or message
                                                            var finalDownloadLink = downloadDoc.querySelector('a[href^="/archive/"]') || downloadDoc.body.innerHTML.includes("Click Here To Start Downloading");

                                                            if (finalDownloadLink) {
                                                                var finalUrl = redirectLink + "?start=1";
                                                                console.log("Final download URL:", finalUrl);
                                                                var a = document.createElement('a');
                                                                a.href = finalUrl;
                                                                a.style.display = 'none';
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                document.body.removeChild(a);
                                                            } else {
                                                                console.log("Download link not available yet. Retrying in 2 seconds...");
                                                                setTimeout(checkForDownloadLink, 2000);
                                                            }
                                                        }
                                                    });
                                                };

                                                // Start polling for the download link
                                                checkForDownloadLink();
                                            } else {
                                                alert('Could not extract the final download URL!');
                                                console.log("Redirect URL not found in page:", formSubmitResponse.responseText);
                                            }
                                        }
                                    });
                                }
                            });
                        } else {
                            alert('Could not extract archive URL from onclick attribute!');
                            console.log("Onclick content:", onclickContent);
                        }
                    } else {
                        alert('Archive download link not found!');
                        console.log("Archive download link not found in page:", response.responseText);
                    }
                }
            });
        }

        // Add event listeners for all buttons
        downloadOriginalButton.addEventListener('click', function() {
            handleDownloadButton('original');
        });
        downloadResampleButton.addEventListener('click', function() {
            handleDownloadButton('resample');
        });
        downloadHaHButton.addEventListener('click', function() {
            handleDownloadButton('hath');
        });
    });
})();
