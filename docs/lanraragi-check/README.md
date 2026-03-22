# LANraragi Library Checker for ExHentai

A userscript that integrates ExHentai/E-Hentai with your LANraragi instance, showing visual indicators for galleries that are already in your local library.

![Version](https://img.shields.io/badge/version-0.1.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

- **Visual Indicators**: Color-coded borders around gallery thumbnails
- **Batch Processing**: Efficiently checks multiple galleries simultaneously  
- **Smart Caching**: Reduces API calls with intelligent result caching
- **Fuzzy Matching**: Finds similar titles even with minor differences
- **Gallery ID Matching**: Precise matching using ExHentai gallery IDs
- **Configurable Interface**: In-browser settings panel for easy configuration
- **Optional Authentication**: Works with or without LANraragi API keys

## Installation

1. Install a userscript manager (e.g., [Tampermonkey](https://www.tampermonkey.net/))
2. Install the script from the repository:
   ```
   https://raw.githubusercontent.com/troyt-666/exhentai-utilities/main/userscripts/lanraragi-check.js
   ```
3. Configure your LANraragi settings (see Configuration section)

## Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| 🟢 **Green Border** | Gallery exists in your LANraragi library (exact match) |
| 🟡 **Yellow Border** | Similar gallery found (fuzzy title match but different ID) |
| 🔴 **Red Border** | Gallery not in library (optional, configurable) |
| 🔵 **Blue Dashed** | Currently checking... |

## Configuration

Click the **🔧** button in the bottom-left corner to open the configuration panel.

### Settings

- **Server URL**: Your LANraragi instance URL (default: `http://localhost:3000`)
- **API Key**: Optional API key for authenticated LANraragi instances
- **Red Highlighting**: Toggle to highlight galleries NOT in your library

### Example Configuration

```javascript
// Basic local setup
Server URL: http://localhost:3000
API Key: (leave blank)

// Remote setup with authentication  
Server URL: https://my-lanraragi.example.com
API Key: your-api-key-here
```

## How It Works

### Gallery Matching Process

1. **Title Extraction**: Extracts Japanese titles from ExHentai gallery pages
2. **API Search**: Queries LANraragi's search API for matching titles
3. **ID Verification**: Cross-references ExHentai gallery IDs with archive filenames
4. **Fuzzy Matching**: Performs simplified title searches for near-matches
5. **Visual Feedback**: Applies appropriate color indicators

### Gallery ID Matching

The script uses a sophisticated matching system:

- **Exact Match**: Gallery ID from ExHentai URL matches ID in LANraragi filename
- **Title Match**: Same title but different/missing gallery ID  
- **Fuzzy Match**: Similar title after removing brackets and normalizing text

Example filename patterns recognized:
```
[Author Name] Gallery Title [1560600].zip
(Event)[Circle (Author)] Title [1560600].zip  
Gallery Title [1560600].zip
```

### Caching System

- **Cache Duration**: 1 hour (configurable)
- **Cache Keys**: Based on title and gallery ID combination
- **Cache Management**: Automatic expiry and manual clearing option

## Performance

- **Batch Size**: 10 galleries per batch (configurable)
- **Check Interval**: 1 second between batches
- **API Rate Limiting**: Built-in delays to prevent server overload
- **Efficient Caching**: Reduces redundant API calls

## LANraragi Compatibility

### Supported Versions
- LANraragi 0.8.0+
- Both authenticated and non-authenticated instances

### API Requirements
- `/api/search` endpoint for title searching
- `/api/info` endpoint for connection testing
- Optional: Bearer token authentication

## Troubleshooting

### Common Issues

**No indicators appearing**
- Check that LANraragi is running and accessible
- Verify server URL in configuration panel
- Test connection using the "Test Connection" button

**Red borders everywhere**  
- Disable "Highlight galleries not in library" option
- Check if your archive naming follows expected patterns
- Clear cache and refresh the page

**API connection errors**
- Ensure LANraragi allows cross-origin requests
- Check if API key is required for your instance
- Verify network connectivity

### Debug Mode

The script includes extensive console logging. Open browser developer tools (F12) and check the Console tab for detailed information about:

- Gallery detection and processing
- API requests and responses  
- Cache operations
- Matching logic

### Manual Cache Clearing

Use the "Clear Cache" button in the configuration panel or run in console:
```javascript
// Clear all LANraragi checker cache
GM_listValues().forEach(key => {
    if (key.startsWith('cache_')) {
        GM_deleteValue(key);
    }
});
```

## Integration with ExHentai Utilities

This script is part of the [ExHentai Utilities](https://github.com/troyt-666/exhentai-utilities) toolkit:

1. **Download Button** → Download galleries with one click
2. **H@H Watcher** → Monitor and process downloads automatically
3. **Archive Sorter** → Categorize content by type and author  
4. **LANraragi Checker** → Check library status while browsing

## Contributing

Issues and pull requests are welcome! Please check the [main repository](https://github.com/troyt-666/exhentai-utilities) for contribution guidelines.

## License

MIT License - see the [LICENSE](../../LICENSE) file for details.

## Disclaimer

This script is not affiliated with LANraragi or ExHentai. It's a personal project designed to enhance the browsing experience by connecting your local library with online galleries. The search functionality is based on title matching, so false positives are possible with galleries sharing identical titles.