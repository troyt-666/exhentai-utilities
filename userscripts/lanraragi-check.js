// ==UserScript==
// @name         LANraragi Library Checker for ExHentai
// @namespace    https://github.com/troyt-666/exhentai-utilities
// @version      0.1.0
// @description  Check if ExHentai/E-Hentai galleries exist in your LANraragi library. Shows visual indicators on gallery thumbnails.
// @author       Troy T
// @homepageURL  https://github.com/troyt-666/exhentai-utilities
// @supportURL   https://github.com/troyt-666/exhentai-utilities/issues
// @updateURL    https://raw.githubusercontent.com/troyt-666/exhentai-utilities/main/userscripts/lanraragi-check.js
// @downloadURL  https://raw.githubusercontent.com/troyt-666/exhentai-utilities/main/userscripts/lanraragi-check.js
// @match        https://exhentai.org/*
// @match        https://e-hentai.org/*
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
 */

(function() {
    'use strict';

    // Configuration - Update these values
    const CONFIG = {
        lanraragiUrl: GM_getValue('lanraragi_url', 'http://localhost:3000'),
        apiKey: GM_getValue('lanraragi_api_key', ''),
        checkInterval: 1000, // Milliseconds between batch checks
        batchSize: 10, // Number of galleries to check at once
        cacheExpiry: 3600000, // 1 hour in milliseconds
        enableIndicators: true,
        enableTooltips: true,
        debugMode: false
    };

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
        .lanraragi-config-panel input {
            width: 100%;
            margin: 5px 0;
            padding: 5px;
            background: #444;
            color: white;
            border: 1px solid #555;
            border-radius: 3px;
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
                return cached.data;
            }
            return null;
        },
        set: function(key, data) {
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
            const cached = cache.get(`title_${title}`);
            if (cached !== null) return cached;

            try {
                const response = await gmFetch({
                    method: 'GET',
                    url: `${CONFIG.lanraragiUrl}/api/search?title=${encodeURIComponent(title)}`,
                    headers: {
                        'Authorization': `Bearer ${CONFIG.apiKey}`
                    }
                });

                const data = JSON.parse(response.responseText);
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
                        url: `${CONFIG.lanraragiUrl}/api/search?title=${encodeURIComponent(simplified)}`,
                        headers: {
                            'Authorization': `Bearer ${CONFIG.apiKey}`
                        }
                    });
                    const similarData = JSON.parse(similarResponse.responseText);
                    if (similarData.data && similarData.data.length > 0) {
                        result.similar = true;
                        result.archives = similarData.data;
                    }
                }

                cache.set(`title_${title}`, result);
                return result;
            } catch (error) {
                console.error('LANraragi API error:', error);
                return { exists: false, similar: false, error: true };
            }
        }
    };

    // Utility functions
    function gmFetch(options) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                ...options,
                onload: resolve,
                onerror: reject
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
        const titleElement = element.querySelector('.glink, .gl3t a, .gl4t a');
        if (!titleElement) return null;

        return {
            title: titleElement.textContent.trim(),
            element: element,
            link: titleElement.href
        };
    }

    function applyIndicator(element, status) {
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
                element.classList.add('lanraragi-not-in-library');
                if (CONFIG.enableTooltips) {
                    element.title = 'Not in LANraragi library';
                }
                break;
            case 'checking':
                element.classList.add('lanraragi-checking');
                break;
        }
    }

    async function checkGalleries() {
        // Find all gallery items on the page
        const galleries = document.querySelectorAll('.gl1t, .gl3t, .gl4t, .id1');
        const uncheckedGalleries = [];

        galleries.forEach(gallery => {
            if (!gallery.dataset.lanraragiChecked) {
                const info = extractGalleryInfo(gallery);
                if (info) {
                    uncheckedGalleries.push(info);
                    applyIndicator(gallery, 'checking');
                }
            }
        });

        // Process in batches
        for (let i = 0; i < uncheckedGalleries.length; i += CONFIG.batchSize) {
            const batch = uncheckedGalleries.slice(i, i + CONFIG.batchSize);
            
            await Promise.all(batch.map(async (galleryInfo) => {
                const result = await api.searchByTitle(galleryInfo.title);
                
                if (result.error) {
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
            <label>API Key:</label>
            <input type="password" id="lanraragi-api-key" value="${CONFIG.apiKey}" />
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
            GM_setValue('lanraragi_url', CONFIG.lanraragiUrl);
            GM_setValue('lanraragi_api_key', CONFIG.apiKey);
            document.getElementById('lanraragi-status').textContent = 'Settings saved!';
            cache.clear();
            setTimeout(() => location.reload(), 1000);
        });

        document.getElementById('lanraragi-test').addEventListener('click', async () => {
            const status = document.getElementById('lanraragi-status');
            status.textContent = 'Testing connection...';
            
            try {
                const response = await gmFetch({
                    method: 'GET',
                    url: `${CONFIG.lanraragiUrl}/api/info`,
                    headers: {
                        'Authorization': `Bearer ${CONFIG.apiKey}`
                    }
                });
                
                if (response.status === 200) {
                    status.textContent = '✓ Connection successful!';
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
        if (!CONFIG.apiKey) {
            console.log('LANraragi Checker: No API key configured. Click the settings button to configure.');
        }

        createConfigPanel();

        // Initial check
        if (CONFIG.enableIndicators && CONFIG.apiKey) {
            checkGalleries();
        }

        // Monitor for dynamically loaded content
        const observer = new MutationObserver((mutations) => {
            if (CONFIG.enableIndicators && CONFIG.apiKey) {
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
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();