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
// @match        https://exhentai.org/tag/*
// @match        https://exhentai.org/favorites.php*
// @match        https://exhentai.org/g/*
// @match        https://e-hentai.org/
// @match        https://e-hentai.org/?*
// @match        https://e-hentai.org/tag/*
// @match        https://e-hentai.org/favorites.php*
// @match        https://e-hentai.org/g/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_listValues
// @grant        GM_deleteValue
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
        similarityThreshold: 0.3, // Minimum title similarity to consider a match (0-1)
        enableIndicators: true,
        enableTooltips: true,
        highlightNotInLibrary: GM_getValue('highlight_not_in_library', false), // Toggle for red highlighting
        // debugMode: true // Enable debug logging
        debugMode: false // Disable debug logging
    };

    console.log('LANraragi Checker: Script loaded with config:', CONFIG);

    // CSS styles for indicators - apply to thumbnail container
    GM_addStyle(`
        .gl3t.lanraragi-in-library {
            border: 3px solid #4CAF50 !important;
            box-shadow: 0 0 5px #4CAF50;
            box-sizing: border-box !important;
        }
        .gl3t.lanraragi-not-in-library {
            border: 3px solid #F44336 !important;
            box-shadow: 0 0 5px #F44336;
            box-sizing: border-box !important;
        }
        .gl3t.lanraragi-similar-exists {
            border: 3px solid #FF9800 !important;
            box-shadow: 0 0 5px #FF9800;
            box-sizing: border-box !important;
        }
        .gl3t.lanraragi-checking {
            opacity: 0.7;
            border: 3px dashed #2196F3 !important;
            box-sizing: border-box !important;
        }
        #gd1.lanraragi-in-library {
            border: 3px solid #4CAF50 !important;
            box-shadow: 0 0 8px #4CAF50;
        }
        #gd1.lanraragi-not-in-library {
            border: 3px solid #F44336 !important;
            box-shadow: 0 0 8px #F44336;
        }
        #gd1.lanraragi-similar-exists {
            border: 3px solid #FF9800 !important;
            box-shadow: 0 0 8px #FF9800;
        }
        #gd1.lanraragi-checking {
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
            // Clear all cache entries created by this script
            if (typeof GM_listValues === 'function' && typeof GM_deleteValue === 'function') {
                const keys = GM_listValues();
                keys.forEach(key => {
                    if (key.startsWith('cache_')) {
                        GM_deleteValue(key);
                    }
                });
                console.log('Cache cleared via GM_deleteValue');
            } else {
                // Fallback for environments where GM_listValues / GM_deleteValue are not available
                console.warn('GM_listValues / GM_deleteValue not available, falling back to manual deletion');
                // Iterate over localStorage keys used by Tampermonkey ("<script id>_<key>")
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.includes('cache_')) {
                        localStorage.removeItem(key);
                    }
                }
            }
        }
    };

    // API functions
    const api = {
        searchByTitle: async function(title, galleryId = null) {
            console.log(`Searching for title: ${title}, gallery ID: ${galleryId}`);
            const cacheKey = galleryId ? `title_${title}_${galleryId}` : `title_${title}`;
            const cached = cache.get(cacheKey);
            if (cached !== null) {
                console.log(`Using cached result for: ${title}`);
                return cached;
            }

            try {
                const headers = {};
                if (CONFIG.apiKey) {
                    headers['Authorization'] = `Bearer ${CONFIG.apiKey}`;
                }

                // Use core title for more precise search results
                const searchTitle = extractSearchTitle(title);
                const searchUrl = `${CONFIG.lanraragiUrl}/api/search?filter=${encodeURIComponent(searchTitle)}`;
                console.log(`Making API request to: ${searchUrl} (core title: "${searchTitle}")`);

                const response = await gmFetch({
                    method: 'GET',
                    url: searchUrl,
                    headers: headers
                });

                console.log(`API response status: ${response.status}`);

                const data = JSON.parse(response.responseText);
                console.log(`Archives found: ${data.data ? data.data.length : 0}`);

                const result = {
                    exists: false,
                    similar: false,
                    exactMatch: false,
                    archives: []
                };

                if (data.data && data.data.length > 0) {
                    // Gallery ID match is the most reliable indicator
                    if (galleryId) {
                        const exactIdMatch = data.data.find(archive => {
                            const archiveId = extractGalleryIdFromFilename(archive.filename);
                            return archiveId === galleryId;
                        });

                        if (exactIdMatch) {
                            console.log(`Found exact gallery ID match: ${galleryId}`);
                            result.exists = true;
                            result.exactMatch = true;
                            result.archives = [exactIdMatch];
                            cache.set(cacheKey, result);
                            return result;
                        }
                    }

                    // Filter results by title similarity to discard unrelated matches
                    const similarArchives = data.data.filter(archive => {
                        const sim = titleSimilarity(title, archive.title);
                        archive._similarity = sim;
                        if (CONFIG.debugMode) {
                            console.log(`  Similarity "${archive.title}": ${sim.toFixed(3)}`);
                        }
                        return sim >= CONFIG.similarityThreshold;
                    });

                    if (similarArchives.length > 0) {
                        similarArchives.sort((a, b) => (b._similarity || 0) - (a._similarity || 0));
                        result.archives = similarArchives;

                        if (galleryId) {
                            // Had gallery ID but no ID match — title-similar only
                            result.similar = true;
                            console.log(`Title-similar archives found (no ID match) for: ${title}`);
                        } else {
                            // No gallery ID — use similarity score to decide
                            if (similarArchives[0]._similarity >= 0.5) {
                                result.exists = true;
                                result.exactMatch = true;
                            } else {
                                result.similar = true;
                            }
                        }
                    } else {
                        console.log(`All ${data.data.length} results filtered out by similarity for: ${title}`);
                    }
                }

                // Fallback: broader search with simplified title
                if (!result.exists && !result.similar && title.length > 10) {
                    const simplified = simplifyTitle(title);
                    if (simplified !== searchTitle && simplified.length >= 2) {
                        console.log(`Trying simplified title: "${simplified}"`);
                        const similarResponse = await gmFetch({
                            method: 'GET',
                            url: `${CONFIG.lanraragiUrl}/api/search?filter=${encodeURIComponent(simplified)}`,
                            headers: headers
                        });
                        const similarData = JSON.parse(similarResponse.responseText);
                        if (similarData.data && similarData.data.length > 0) {
                            const filteredSimilar = similarData.data.filter(archive => {
                                const sim = titleSimilarity(title, archive.title);
                                archive._similarity = sim;
                                return sim >= CONFIG.similarityThreshold;
                            });
                            if (filteredSimilar.length > 0) {
                                filteredSimilar.sort((a, b) => (b._similarity || 0) - (a._similarity || 0));
                                result.similar = true;
                                result.archives = filteredSimilar;
                            }
                        }
                    }
                }

                cache.set(cacheKey, result);
                console.log(`Search result for "${title}":`, result);
                return result;
            } catch (error) {
                console.error(`LANraragi API error for title "${title}":`, error);
                console.error('Error details:', error.message, error.stack);
                return { exists: false, similar: false, exactMatch: false, error: true };
            }
        }
    };

    // Utility functions
    function gmFetch(options) {
        console.log('Making GM_xmlhttpRequest:', options.url);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                ...options,
                timeout: 15000, // 15-second timeout for API requests
                onload: (response) => {
                    console.log('GM_xmlhttpRequest response received:', response.status);
                    resolve(response);
                },
                onerror: (error) => {
                    console.error('GM_xmlhttpRequest error:', error);
                    reject(error);
                },
                ontimeout: () => {
                    console.error('GM_xmlhttpRequest timed out for URL:', options.url);
                    reject(new Error('Request timed out'));
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

    // Extract core title for search queries by stripping metadata brackets.
    // ExHentai format: (event) [circle (author)] Title (series) [language] [misc]
    function extractSearchTitle(fullTitle) {
        let s = fullTitle;
        // Strip leading (event) tag, e.g., (C81), (COMIC1☆2)
        s = s.replace(/^\s*\([^)]*\)\s*/, '');
        // Strip leading [circle/author] tag, e.g., [ciaociao (あらきかなお)]
        s = s.replace(/^\s*\[[^\]]*\]\s*/, '');
        // Strip all trailing [bracket] groups, e.g., [中国翻訳], [Digital], [AI Generated]
        while (/\[[^\]]*\]\s*$/.test(s)) {
            s = s.replace(/\s*\[[^\]]*\]\s*$/, '');
        }
        s = s.trim();
        // Fallback if nothing meaningful left
        if (s.length < 2) {
            s = fullTitle.replace(/[\[\(][^\]\)]*[\]\)]/g, '').replace(/\s+/g, ' ').trim();
        }
        return s || fullTitle;
    }

    // Compute title similarity using token-based Jaccard index.
    // Latin words are compared as whole tokens; CJK text is compared as bigrams
    // for fuzzy matching across minor variations.
    function titleSimilarity(a, b) {
        const normalize = t => t.toLowerCase()
            .replace(/[^\w\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const na = normalize(a);
        const nb = normalize(b);
        if (!na || !nb) return 0;

        const tokenize = t => {
            const tokens = new Set();
            // Latin/numeric words (2+ chars)
            const words = t.match(/[a-z0-9]{2,}/g);
            if (words) words.forEach(w => tokens.add(w));
            // CJK: overlapping bigrams for fuzzy matching
            const cjk = t.match(/[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]+/g);
            if (cjk) {
                cjk.forEach(seq => {
                    for (let i = 0; i < seq.length - 1; i++) {
                        tokens.add(seq.substring(i, i + 2));
                    }
                    if (seq.length === 1) tokens.add(seq);
                });
            }
            return tokens;
        };

        const tokensA = tokenize(na);
        const tokensB = tokenize(nb);
        if (tokensA.size === 0 || tokensB.size === 0) return 0;

        let shared = 0;
        tokensA.forEach(t => { if (tokensB.has(t)) shared++; });
        const union = new Set([...tokensA, ...tokensB]).size;
        return union > 0 ? shared / union : 0;
    }

    function extractGalleryInfo(element) {
        // Extract title and other info from gallery element
        console.log('Extracting gallery info from element:', element);
        console.log('Element classes:', element.className);
        console.log('Element HTML:', element.innerHTML.substring(0, 200) + '...');
        
        // Look for the title element (which contains the text)
        const titleElement = element.querySelector('.glink, .gl3t a, .gl4t a');
        if (!titleElement) {
            console.log('No title element found with selectors: .glink, .gl3t a, .gl4t a');
            console.log('Available links in element:', element.querySelectorAll('a'));
            return null;
        }

        // Get the link - if titleElement is a div.glink, find its parent <a>
        let linkElement;
        if (titleElement.tagName === 'DIV' && titleElement.classList.contains('glink')) {
            linkElement = titleElement.closest('a');
        } else {
            linkElement = titleElement;
        }

        if (!linkElement || !linkElement.href) {
            console.log('No valid link element found');
            return null;
        }

        const info = {
            title: titleElement.textContent.trim(),
            element: element,
            link: linkElement.href,
            galleryId: extractGalleryId(linkElement.href)
        };
        console.log('Extracted gallery info:', info);
        return info;
    }

    function extractGalleryId(url) {
        // Extract gallery ID from ExHentai URL like https://exhentai.org/g/1560600/21011d7fbf/
        if (!url) return null;
        const match = url.match(/\/g\/(\d+)\//);
        return match ? match[1] : null;
    }

    function extractGalleryIdFromFilename(filename) {
        // Extract gallery ID from H@H archive filename like [author] title [1560600]
        // Earlier versions expected 7-digit IDs, but ExHentai gallery IDs can be fewer
        // (e.g. 6-digit 590775). Relax the requirement to 5 or more digits to avoid
        // missing valid matches while still ignoring small numbers such as chapter
        // counts or years (usually 1-4 digits).
        if (!filename) return null;
        const match = filename.match(/\[(\d{5,})\]/);
        return match ? match[1] : null;
    }

    function applyIndicator(element, status, archives = []) {
        console.log(`Applying indicator "${status}" to element:`, element);
        
        // Find the thumbnail container within the gallery element
        // Look for .gl3t, which specifically holds the thumbnail image.
        let thumbnailContainer = element.querySelector('.gl3t');
        
        // If we can't find a thumbnail container, apply to the element itself
        if (!thumbnailContainer) {
            thumbnailContainer = element;
        }
        
        // Remove existing indicators from BOTH the main element and thumbnail container
        // This prevents conflicting classes from previous checks
        const classesToRemove = ['lanraragi-in-library', 'lanraragi-not-in-library', 
                                'lanraragi-similar-exists', 'lanraragi-checking'];
        
        // Clear from main gallery element
        element.classList.remove(...classesToRemove);
        
        // Clear from thumbnail container
        thumbnailContainer.classList.remove(...classesToRemove);
        
        // Also clear from any child elements that might have these classes
        element.querySelectorAll('.lanraragi-in-library, .lanraragi-not-in-library, .lanraragi-similar-exists, .lanraragi-checking')
            .forEach(el => el.classList.remove(...classesToRemove));

        // Apply new indicator to the thumbnail container only
        switch (status) {
            case 'exists':
                thumbnailContainer.classList.add('lanraragi-in-library');
                if (CONFIG.enableTooltips) {
                    thumbnailContainer.title = 'Already in LANraragi library';
                }
                break;
            case 'similar':
                thumbnailContainer.classList.add('lanraragi-similar-exists');
                if (CONFIG.enableTooltips) {
                    thumbnailContainer.title = 'Similar title exists in library (gallery ID mismatch)';
                    const titleElement = element.querySelector('.glink');
                    if (titleElement && archives.length > 0) {
                        const archiveTitles = archives.map(archive => archive.title).join('\n');
                        titleElement.title = `Found similar:\n${archiveTitles}`;
                    }
                }
                break;
            case 'not-found':
                if (CONFIG.highlightNotInLibrary) {
                    thumbnailContainer.classList.add('lanraragi-not-in-library');
                    if (CONFIG.enableTooltips) {
                        thumbnailContainer.title = 'Not in LANraragi library';
                    }
                }
                break;
            case 'checking':
                thumbnailContainer.classList.add('lanraragi-checking');
                break;
        }
    }

    let isChecking = false;
    async function checkGalleries() {
        if (isChecking) return;
        isChecking = true;
        try {
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
            const galleries = document.querySelectorAll('.gl1t, .id1');
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
                    console.log(`Checking gallery: "${galleryInfo.title}" with ID: ${galleryInfo.galleryId}`);
                    const result = await api.searchByTitle(galleryInfo.title, galleryInfo.galleryId);
                    
                    if (result.error) {
                        console.error(`Error checking gallery "${galleryInfo.title}"`);
                        // API error - remove indicator
                        galleryInfo.element.classList.remove('lanraragi-checking');
                    } else if (result.exists && result.exactMatch) {
                        applyIndicator(galleryInfo.element, 'exists');
                    } else if (result.similar) {
                        applyIndicator(galleryInfo.element, 'similar', result.archives);
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
        } finally {
            isChecking = false;
        }
    }

    // Gallery page check - checks the single gallery on a /g/ page
    async function checkGalleryPage() {
        const coverElement = document.getElementById('gd1');
        if (!coverElement) return;

        // Get the Japanese title first (preferred for LANraragi search), fall back to English
        const jpTitle = document.getElementById('gj');
        const enTitle = document.getElementById('gn');
        const title = (jpTitle && jpTitle.textContent.trim()) || (enTitle && enTitle.textContent.trim());
        if (!title) return;

        const galleryId = extractGalleryId(window.location.href);
        console.log(`Gallery page: checking "${title}" (ID: ${galleryId})`);

        applyGalleryPageIndicator(coverElement, 'checking');

        const result = await api.searchByTitle(title, galleryId);

        if (result.error) {
            coverElement.classList.remove('lanraragi-checking');
        } else if (result.exists && result.exactMatch) {
            applyGalleryPageIndicator(coverElement, 'exists');
        } else if (result.similar) {
            applyGalleryPageIndicator(coverElement, 'similar');
        } else {
            applyGalleryPageIndicator(coverElement, 'not-found');
        }
    }

    function applyGalleryPageIndicator(element, status) {
        const classesToRemove = ['lanraragi-in-library', 'lanraragi-not-in-library',
                                'lanraragi-similar-exists', 'lanraragi-checking'];
        element.classList.remove(...classesToRemove);

        switch (status) {
            case 'exists':
                element.classList.add('lanraragi-in-library');
                element.title = 'Already in LANraragi library';
                break;
            case 'similar':
                element.classList.add('lanraragi-similar-exists');
                element.title = 'Similar title exists in library (gallery ID mismatch)';
                break;
            case 'not-found':
                if (CONFIG.highlightNotInLibrary) {
                    element.classList.add('lanraragi-not-in-library');
                    element.title = 'Not in LANraragi library';
                }
                break;
            case 'checking':
                element.classList.add('lanraragi-checking');
                break;
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
        const isGalleryPage = /\/g\/\d+\//.test(window.location.pathname);

        if (CONFIG.enableIndicators) {
            if (isGalleryPage) {
                console.log('Gallery page detected, checking cover...');
                checkGalleryPage();
            } else {
                console.log('Indicators enabled, starting initial gallery check...');
                checkGalleries();

                // Monitor for dynamically loaded content (list pages only)
                let timeout;
                const observer = new MutationObserver(() => {
                    clearTimeout(timeout);
                    timeout = setTimeout(checkGalleries, 400);
                });

                const container = document.querySelector('.itg');
                if (container) observer.observe(container, {childList: true});
            }
        } else {
            console.log('Indicators disabled, skipping gallery check');
        }

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