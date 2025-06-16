// ==UserScript==
// @name         LANraragi Library Checker for ExHentai
// @namespace    https://github.com/troyt-666/exhentai-utilities
// @version      0.1.1
// @description  Check if ExHentai/E-Hentai galleries exist in your LANraragi library. Shows visual indicators on gallery thumbnails.
// @author       Troy T
// @homepageURL  https://github.com/troyt-666/exhentai-utilities
// @supportURL   https://github.com/troyt-666/exhentai-utilities/issues
// @updateURL    https://raw.githubusercontent.com/troyt-666/exhentai-utilities/main/userscripts/lanraragi-check.js
// @downloadURL  https://raw.githubusercontent.com/troyt-666/exhentai-utilities/main/userscripts/lanraragi-check.js
// @match        https://exhentai.org/
// @match        https://exhentai.org/?*
// @match        https://e-hentai.org/
// @match        https://e-hentai.org/?*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @connect      localhost
// @connect      *
// @license      MIT
// @icon         https://exhentai.org/favicon.ico
// ==/UserScript==

/*
 * LANraragi Library Checker for ExHentai
 * 
 * This userscript integrates ExHentai/E-Hentai with your LANraragi instance:
 * - Checks if galleries are already in your local library
 * - Shows visual indicators on gallery thumbnails
 * - Supports batch checking for better performance
 * - Caches results to reduce API calls
 * 
 * Part of the ExHentai Utilities toolkit:
 * https://github.com/troyt-666/exhentai-utilities
 * 
 * Configuration:
 * 1. Set your LANraragi server URL and API key below
 * 2. Install the script via Tampermonkey
 * 3. Browse ExHentai normally - indicators will appear automatically
 * 
 * Indicators:
 * - Green border: Gallery exists in your library
 * - Red border: Gallery not in library
 * - Yellow border: Similar gallery found (fuzzy match)
 * Disclaimer: 
 * - This script is not affiliated with LANraragi or ExHentai.
 * - It is a personal project and is not guaranteed to work with all LANraragi instances.
 * - The search is based on the Japanese title of the gallery, so false positives are possible if there are multiple galleries with the same titles.
 */

(function() {
    'use strict';

    console.log('=== LANraragi Checker Userscript Starting ===');
    console.log('Script URL:', GM_info.script.name);
    console.log('Script Version:', GM_info.script.version);

    // Configuration - Update these values
    const CONFIG = {
        lanraragiUrl: GM_getValue('lanraragi_url', 'http://localhost:3000'),
        apiKey: GM_getValue('lanraragi_api_key', ''),
        checkInterval: 1000, // Milliseconds between batch checks
        batchSize: 10, // Number of galleries to check at once
        cacheExpiry: 3600000, // 1 hour in milliseconds
        enableIndicators: true,
        enableTooltips: true,
        highlightNotInLibrary: GM_getValue('highlight_not_in_library', false), // Toggle for red highlighting
        debugMode: true // Enable debug logging
    };

    console.log('LANraragi Checker: Script loaded with config:', CONFIG);

    // CSS styles for indicators
    GM_addStyle(`
        .lanraragi-in-library {
            border: 3px solid #4CAF50 !important;
            box-shadow: 0 0 5px #4CAF50;
        }
        .lanraragi-not-in-library {
            border: 3px solid #F44336 !important;
            box-shadow: 0 0 5px #F44336;
        }
        .lanraragi-similar-exists {
            border: 3px solid #FF9800 !important;
            box-shadow: 0 0 5px #FF9800;
        }
        .lanraragi-checking {
            opacity: 0.7;
            border: 3px dashed #2196F3 !important;
        }
        .lanraragi-tooltip {
            position: absolute;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
        }
        .lanraragi-config-panel {
            position: fixed;
            top: 10px;
            left: 10px;
            background: #333;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 9999;
            display: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }
        .lanraragi-config-panel input[type="text"],
        .lanraragi-config-panel input[type="password"] {
            width: 100%;
            margin: 5px 0;
            padding: 5px;
            background: #444;
            color: white;
            border: 1px solid #555;
            border-radius: 3px;
            box-sizing: border-box;
        }
        .lanraragi-config-panel label {
            display: block;
            margin: 10px 0 5px 0;
        }
        .lanraragi-config-panel label.checkbox-label {
            display: flex;
            align-items: center;
            margin: 10px 0;
        }
        .lanraragi-config-panel input[type="checkbox"] {
            width: auto;
            margin: 0 8px 0 0;
        }
        .lanraragi-config-toggle {
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: #2196F3;
            color: white;
            padding: 10px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 9998;
            font-size: 16px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
    `);

    // Cache management
    const cache = {
        get: function(key) {
            const cached = GM_getValue(`cache_${key}`, null);
            if (cached && Date.now() - cached.timestamp < CONFIG.cacheExpiry) {
                console.log(`Cache hit for key: ${key}`, cached.data);
                return cached.data;
            }
            console.log(`Cache miss for key: ${key}`);
            return null;
        },
        set: function(key, data) {
            console.log(`Setting cache for key: ${key}`, data);
            GM_setValue(`cache_${key}`, {
                data: data,
                timestamp: Date.now()
            });
        },
        clear: function() {
            // Clear all cache entries
            const keys = GM_listValues();
            keys.forEach(key => {
                if (key.startsWith('cache_')) {
                    GM_deleteValue(key);
                }
            });
        }
    };

    // API functions
    const api = {
        searchByTitle: async function(title) {
            console.log(`Searching for title: ${title}`);
            const cached = cache.get(`title_${title}`);
            if (cached !== null) {
                console.log(`Using cached result for: ${title}`);
                return cached;
            }

            try {
                // Build headers - only add Authorization if API key exists
                const headers = {};
                if (CONFIG.apiKey) {
                    headers['Authorization'] = `Bearer ${CONFIG.apiKey}`;
                }

                const searchUrl = `${CONFIG.lanraragiUrl}/api/search?filter=${encodeURIComponent(title)}`;
                console.log(`Making API request to: ${searchUrl}`);
                console.log(`Request headers:`, headers);
                
                const response = await gmFetch({
                    method: 'GET',
                    url: searchUrl,
                    headers: headers
                });
                
                console.log(`API response status: ${response.status}`);
                console.log(`API response text:`, response.responseText);

                const data = JSON.parse(response.responseText);
                console.log(`Parsed API response:`, data);
                console.log(`Archives found: ${data.data ? data.data.length : 0}`);
                
                const result = {
                    exists: data.data && data.data.length > 0,
                    similar: false,
                    archives: data.data || []
                };

                // Check for similar titles if exact match not found
                if (!result.exists && title.length > 10) {
                    const simplified = simplifyTitle(title);
                    const similarResponse = await gmFetch({
                        method: 'GET',
                        url: `${CONFIG.lanraragiUrl}/api/search?filter=${encodeURIComponent(simplified)}`,
                        headers: headers
                    });
                    const similarData = JSON.parse(similarResponse.responseText);
                    if (similarData.data && similarData.data.length > 0) {
                        result.similar = true;
                        result.archives = similarData.data;
                    }
                }

                cache.set(`title_${title}`, result);
                console.log(`Search result for "${title}":`, result);
                return result;
            } catch (error) {
                console.error(`LANraragi API error for title "${title}":`, error);
                console.error('Error details:', error.message, error.stack);
                return { exists: false, similar: false, error: true };
            }
        }
    };

    // Utility functions
    function gmFetch(options) {
        console.log('Making GM_xmlhttpRequest:', options.url);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                ...options,
                onload: (response) => {
                    console.log('GM_xmlhttpRequest response received:', response.status);
                    resolve(response);
                },
                onerror: (error) => {
                    console.error('GM_xmlhttpRequest error:', error);
                    reject(error);
                }
            });
        });
    }

    function simplifyTitle(title) {
        // Remove common variations to find similar titles
        return title
            .replace(/\[.*?\]/g, '') // Remove brackets
            .replace(/\(.*?\)/g, '') // Remove parentheses
            .replace(/【.*?】/g, '') // Remove Japanese brackets
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    function extractGalleryInfo(element) {
        // Extract title and other info from gallery element
        console.log('Extracting gallery info from element:', element);
        console.log('Element classes:', element.className);
        console.log('Element HTML:', element.innerHTML.substring(0, 200) + '...');
        
        const titleElement = element.querySelector('.glink, .gl3t a, .gl4t a');
        if (!titleElement) {
            console.log('No title element found with selectors: .glink, .gl3t a, .gl4t a');
            console.log('Available links in element:', element.querySelectorAll('a'));
            return null;
        }

        const info = {
            title: titleElement.textContent.trim(),
            element: element,
            link: titleElement.href
        };
        console.log('Extracted gallery info:', info);
        return info;
    }

    function applyIndicator(element, status) {
        console.log(`Applying indicator "${status}" to element:`, element);
        // Remove existing indicators
        element.classList.remove('lanraragi-in-library', 'lanraragi-not-in-library', 
                                'lanraragi-similar-exists', 'lanraragi-checking');

        // Apply new indicator
        switch (status) {
            case 'exists':
                element.classList.add('lanraragi-in-library');
                if (CONFIG.enableTooltips) {
                    element.title = 'Already in LANraragi library';
                }
                break;
            case 'similar':
                element.classList.add('lanraragi-similar-exists');
                if (CONFIG.enableTooltips) {
                    element.title = 'Similar title exists in library';
                }
                break;
            case 'not-found':
                if (CONFIG.highlightNotInLibrary) {
                    element.classList.add('lanraragi-not-in-library');
                    if (CONFIG.enableTooltips) {
                        element.title = 'Not in LANraragi library';
                    }
                }
                break;
            case 'checking':
                element.classList.add('lanraragi-checking');
                break;
        }
    }

    async function checkGalleries() {
        console.log('Starting gallery check...');
        console.log('Page body exists:', !!document.body);
        console.log('Document title:', document.title);
        
        // Debug: Check what elements exist on the page
        console.log('Debug - Looking for gallery containers...');
        console.log('Elements with class "gl1t":', document.querySelectorAll('.gl1t').length);
        console.log('Elements with class "gl3t":', document.querySelectorAll('.gl3t').length); 
        console.log('Elements with class "gl4t":', document.querySelectorAll('.gl4t').length);
        console.log('Elements with class "id1":', document.querySelectorAll('.id1').length);
        console.log('Elements with class "itg":', document.querySelectorAll('.itg').length);
        console.log('Elements with class "gl1e":', document.querySelectorAll('.gl1e').length);
        
        // Find all gallery items on the page
        const galleries = document.querySelectorAll('.gl1t, .gl3t, .gl4t, .id1');
        console.log(`Found ${galleries.length} gallery elements on page`);
        const uncheckedGalleries = [];

        galleries.forEach((gallery, index) => {
            console.log(`Processing gallery ${index + 1}/${galleries.length}`);
            if (!gallery.dataset.lanraragiChecked) {
                const info = extractGalleryInfo(gallery);
                if (info) {
                    uncheckedGalleries.push(info);
                    applyIndicator(gallery, 'checking');
                }
            }
        });

        console.log(`Found ${uncheckedGalleries.length} unchecked galleries to process`);
        
        // Process in batches
        for (let i = 0; i < uncheckedGalleries.length; i += CONFIG.batchSize) {
            const batch = uncheckedGalleries.slice(i, i + CONFIG.batchSize);
            console.log(`Processing batch ${Math.floor(i/CONFIG.batchSize) + 1}, galleries ${i + 1}-${Math.min(i + CONFIG.batchSize, uncheckedGalleries.length)}`);
            
            await Promise.all(batch.map(async (galleryInfo) => {
                console.log(`Checking gallery: "${galleryInfo.title}"`);
                const result = await api.searchByTitle(galleryInfo.title);
                
                if (result.error) {
                    console.error(`Error checking gallery "${galleryInfo.title}"`);
                    // API error - remove indicator
                    galleryInfo.element.classList.remove('lanraragi-checking');
                } else if (result.exists) {
                    applyIndicator(galleryInfo.element, 'exists');
                } else if (result.similar) {
                    applyIndicator(galleryInfo.element, 'similar');
                } else {
                    applyIndicator(galleryInfo.element, 'not-found');
                }
                
                galleryInfo.element.dataset.lanraragiChecked = 'true';
            }));

            // Wait before next batch to avoid overloading
            if (i + CONFIG.batchSize < uncheckedGalleries.length) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.checkInterval));
            }
        }
    }

    // Configuration panel
    function createConfigPanel() {
        const panel = document.createElement('div');
        panel.className = 'lanraragi-config-panel';
        panel.innerHTML = `
            <h3>LANraragi Configuration</h3>
            <label>Server URL:</label>
            <input type="text" id="lanraragi-url" value="${CONFIG.lanraragiUrl}" />
            <label>API Key (optional):</label>
            <input type="password" id="lanraragi-api-key" value="${CONFIG.apiKey}" placeholder="Leave blank if not required" />
            <label class="checkbox-label">
                <input type="checkbox" id="lanraragi-highlight-toggle" ${CONFIG.highlightNotInLibrary ? 'checked' : ''}>
                Highlight galleries not in library with red border
            </label>
            <button id="lanraragi-save">Save</button>
            <button id="lanraragi-test">Test Connection</button>
            <button id="lanraragi-clear-cache">Clear Cache</button>
            <div id="lanraragi-status"></div>
        `;

        document.body.appendChild(panel);

        // Toggle button
        const toggle = document.createElement('div');
        toggle.className = 'lanraragi-config-toggle';
        toggle.innerHTML = '🔧';
        toggle.title = 'LANraragi Settings';
        toggle.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
        document.body.appendChild(toggle);

        // Event handlers
        document.getElementById('lanraragi-save').addEventListener('click', () => {
            CONFIG.lanraragiUrl = document.getElementById('lanraragi-url').value;
            CONFIG.apiKey = document.getElementById('lanraragi-api-key').value;
            CONFIG.highlightNotInLibrary = document.getElementById('lanraragi-highlight-toggle').checked;
            GM_setValue('lanraragi_url', CONFIG.lanraragiUrl);
            GM_setValue('lanraragi_api_key', CONFIG.apiKey);
            GM_setValue('highlight_not_in_library', CONFIG.highlightNotInLibrary);
            document.getElementById('lanraragi-status').textContent = 'Settings saved!';
            cache.clear();
            setTimeout(() => location.reload(), 1000);
        });

        document.getElementById('lanraragi-test').addEventListener('click', async () => {
            const status = document.getElementById('lanraragi-status');
            status.textContent = 'Testing connection...';
            
            try {
                // Build headers - only add Authorization if API key exists
                const headers = {};
                if (CONFIG.apiKey) {
                    headers['Authorization'] = `Bearer ${CONFIG.apiKey}`;
                }

                const response = await gmFetch({
                    method: 'GET',
                    url: `${CONFIG.lanraragiUrl}/api/info`,
                    headers: headers
                });
                
                if (response.status === 200) {
                    const authStatus = CONFIG.apiKey ? ' (with API key)' : ' (no API key)';
                    status.textContent = '✓ Connection successful' + authStatus + '!';
                    status.style.color = '#4CAF50';
                } else {
                    status.textContent = '✗ Connection failed!';
                    status.style.color = '#F44336';
                }
            } catch (error) {
                status.textContent = '✗ Connection error!';
                status.style.color = '#F44336';
            }
        });

        document.getElementById('lanraragi-clear-cache').addEventListener('click', () => {
            cache.clear();
            document.getElementById('lanraragi-status').textContent = 'Cache cleared!';
            setTimeout(() => location.reload(), 1000);
        });
    }

    // Main initialization
    function init() {
        console.log('=== LANraragi Checker Initializing ===');
        console.log('Current URL:', window.location.href);
        console.log('Config:', CONFIG);
        
        if (!CONFIG.apiKey) {
            console.log('LANraragi Checker: Running without API key. Some LANraragi instances may require authentication.');
        } else {
            console.log('LANraragi Checker: API key is configured');
        }

        console.log('Creating config panel...');
        createConfigPanel();

        // Initial check - works with or without API key
        if (CONFIG.enableIndicators) {
            console.log('Indicators enabled, starting initial gallery check...');
            checkGalleries();
        } else {
            console.log('Indicators disabled, skipping gallery check');
        }

        // Monitor for dynamically loaded content
        const observer = new MutationObserver(() => {
            console.log('DOM mutation detected, checking for new galleries...');
            if (CONFIG.enableIndicators) {
                checkGalleries();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Debug mode
        if (CONFIG.debugMode) {
            console.log('LANraragi Checker initialized', CONFIG);
        }
    }

    // Wait for page to load
    console.log('Document ready state:', document.readyState);
    if (document.readyState === 'loading') {
        console.log('Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', init);
    } else {
        console.log('DOM already loaded, initializing immediately...');
        init();
    }
})();