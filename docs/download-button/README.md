# ExHentai Download Button with Batch Support

![Download Button Screenshot](button-screenshot.png)

A powerful userscript that enhances ExHentai/E-Hentai gallery pages by adding convenient download buttons and batch download functionality.

## Features

### Individual Downloads
- **Download Original**: Download the original high-quality archive
- **Download Resample**: Download the resampled (lower quality) archive  
- **Download H@H**: Queue downloads to your Hentai@Home client

### Batch Downloads
- **Checkbox Selection**: Select multiple galleries with checkboxes
- **Batch H@H Downloads**: Queue multiple galleries to your H@H client at once
- **Progress Tracking**: Real-time progress modal with completion percentage
- **Error Logging**: Comprehensive error tracking with timestamps and details

### User Experience
- **Toast Notifications**: Visual feedback for H@H operations
- **Collapsible Panel**: Space-efficient batch download controls
- **GP Awareness**: Respects ExHentai's Gallery Point system
- **Rate Limiting**: Built-in delays to prevent server overload

## Installation

### Prerequisites
- [Tampermonkey](https://www.tampermonkey.net/) or compatible userscript manager
- Valid ExHentai/E-Hentai account
- (Optional) Hentai@Home client for H@H downloads

### Install Steps
1. Install Tampermonkey browser extension
2. Click this link: [Download Button Userscript](https://greasyfork.org/en/scripts/510654-exhentai-download-button-with-batch-support)
3. Click "Install" on the Greasyfork page to confirm and install the script

## Usage

### Individual Downloads
1. Navigate to any ExHentai/E-Hentai search page
2. Each gallery will show three new buttons:
   - **Download Original**: Direct download of original archive
   - **Download Resample**: Direct download of resampled archive
   - **Download H@H**: Queue to your H@H client

### Batch Downloads
1. **Access Panel**: Click the "📥 Batch H@H" button in the top-right corner
2. **Select Galleries**: Check the "Batch H@H" checkbox for desired galleries
3. **Bulk Selection**: Use "Select All" or "Select None" buttons for convenience
4. **Start Download**: Click "Download Selected H@H" to begin batch processing

### Progress Monitoring
- **Live Progress**: Modal shows current gallery being processed
- **Completion Stats**: Track successful and failed downloads
- **Error Details**: View detailed error logs with timestamps

## How It Works

### Individual Downloads
1. **Gallery Page Fetch**: Retrieves the gallery page HTML
2. **Archive Link Extraction**: Locates the archive download popup link
3. **Form Processing**: Submits the appropriate download form
4. **Download Initiation**: Triggers browser download or H@H queue

### Batch Processing
1. **Sequential Processing**: Downloads are processed one at a time
2. **Rate Limiting**: 800ms delay between requests to avoid rate limiting
3. **Error Handling**: Failed downloads are logged with detailed error messages
4. **Progress Feedback**: Real-time updates on batch progress

### H@H Integration
- Submits downloads to your configured Hentai@Home client
- Uses original resolution by default (`hathdl_xres=org`)
- Provides toast notifications for queue confirmations
- Handles H@H-specific error messages

## Technical Details

### Download Types
- **Original**: Full quality archives (consumes more GP)
- **Resample**: Compressed archives (consumes less GP) 
- **H@H**: Queued to Hentai@Home client (no GP cost)

### Rate Limiting
- Individual downloads: No artificial delay
- Batch downloads: 800ms delay between requests
- Respects ExHentai's server load recommendations

### Error Handling
- Network timeouts and connection errors
- Missing archive links on gallery pages
- H@H form submission failures
- GP insufficient errors
- Invalid gallery pages

### Browser Compatibility
- Chrome/Chromium (recommended)
- Firefox
- Edge
- Safari (with Tampermonkey)

## Troubleshooting

### Common Issues

**Downloads not starting**
- Check if you're logged into ExHentai/E-Hentai
- Verify sufficient GP for Original/Resample downloads
- Check browser's popup blocker settings

**H@H downloads failing**
- Ensure your H@H client is running and configured
- Check your H@H client's web interface settings
- Verify you have H@H download privileges

**Batch downloads stopping**
- Check the error log in the batch panel
- Network connectivity issues may cause failures
- Some galleries may not have archive downloads available

**Buttons not appearing**
- Refresh the page
- Check if Tampermonkey is enabled
- Verify the script is installed and active

### Debug Information
The script includes extensive console logging. Open browser developer tools (F12) and check the Console tab for detailed debug information.

## Configuration

### Script Settings
Settings are automatically saved and include:
- Batch panel expanded/collapsed state
- Error log history
- Selected gallery preferences

### Customization
The script can be modified to:
- Change default H@H resolution (`hathdl_xres` parameter)
- Adjust rate limiting delays
- Modify toast notification duration
- Customize button styling

## Integration with ExHentai Utilities

This userscript is part of the comprehensive [ExHentai Utilities](https://github.com/troyt-666/exhentai-utilities) toolkit:

1. **Download Button** (this script) → Download galleries from web interface
2. **[H@H Watcher](../../tools/hath-watcher/)** → Monitor and process H@H downloads
3. **[Smart Sorter](../../tools/smart-sorter/)** → Categorize downloaded archives
4. **[LANraragi Checker](../lanraragi-check/)** → Check local library status

### Workflow Integration
```
Browse Gallery → Download (this script) → H@H Client → Monitor & Zip → Sort Archives → LANraragi
```

## Contributing

Bug reports and feature requests are welcome:
- [Issues](https://github.com/troyt-666/exhentai-utilities/issues)
- [Pull Requests](https://github.com/troyt-666/exhentai-utilities/pulls)

## License

MIT License - see [LICENSE](https://github.com/troyt-666/exhentai-utilities/blob/main/LICENSE) for details.

## Disclaimer

- This script is not affiliated with ExHentai or E-Hentai
- Users are responsible for complying with site terms of service
- Respect rate limits and server resources
- GP costs apply to Original and Resample downloads