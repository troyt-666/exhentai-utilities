# ExHentai Utilities

A comprehensive toolkit for managing ExHentai/E-Hentai content, including download automation, archive organization, and LANraragi integration.

## 🚀 Features

- **Download Button Userscript**: Adds convenient download buttons directly to ExHentai/E-Hentai search pages
  - Original, Resample, and H@H download options
  - Batch download functionality with progress tracking
  - Error logging for failed downloads
  
- **H@H Download Watcher**: Automatically processes Hentai@Home downloads
  - Monitors download directory for new content
  - Auto-zips completed downloads
  - Cleans up original folders after processing

- **Archive Organizer**: Intelligent sorting system for downloaded archives
  - Categorizes content into 单行本 (tankoubon), 短篇 (doujinshi), and 猎奇 (guro)
  - Extracts author/circle information from filenames
  - Organizes files by author/circle directories

- **LANraragi Integration** (In Development): Connect your local library with ExHentai browsing
  - Check if galleries exist in your local collection
  - Visual indicators on ExHentai pages
  - Metadata synchronization

## 📁 Repository Structure

```
exhentai-utilities/
├── userscripts/           # Browser userscripts
│   ├── download-button.js # Main download functionality
│   └── lanraragi-check.js # LANraragi library checker
├── scripts/               # Shell scripts for automation
│   ├── hath-watcher.sh    # H@H download monitor
│   └── sort-archives.sh   # Archive organization
├── config/                # Configuration files
├── docs/                  # Documentation
└── tools/                 # Additional utilities
```

## 🛠️ Quick Start

### Prerequisites

- **For Userscripts**: Tampermonkey or compatible userscript manager
- **For Shell Scripts**: Linux/WSL environment with basic utilities (bash, unzip, inotify-tools)
- **For LANraragi Integration**: LANraragi server instance

### Installation

1. **Download Button Userscript**:
   - Install [Tampermonkey](https://www.tampermonkey.net/)
   - Open `userscripts/download-button.js` in your browser
   - Click "Install" when Tampermonkey prompts

2. **Shell Scripts**:
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/exhentai-utilities.git
   cd exhentai-utilities
   
   # Make scripts executable
   chmod +x scripts/*.sh
   ```

3. **Configure paths** in the scripts according to your setup

## 📖 Usage

### Download Button

Once installed, visit any ExHentai/E-Hentai search page. You'll see:
- Individual download buttons for each gallery
- Batch download panel in the top-right corner
- Select multiple galleries and download via H@H in bulk

### Archive Sorting

```bash
# Sort archives from source directory to organized library
./scripts/sort-archives.sh /path/to/downloads /path/to/library

# Example output structure:
# library/
# ├── 单行本/
# │   └── [Author Name]/
# ├── 短篇/
# │   └── [Author Name]/
# └── 猎奇/
#     └── [Author Name]/
```

### H@H Watcher

```bash
# Start monitoring H@H download directory
./scripts/hath-watcher.sh
```

The script will automatically:
- Detect new downloads
- Wait for completion (when galleryinfo.txt is created)
- Zip the folder and remove the original

## 🔧 Configuration

### Archive Sorting Rules

The sorting script uses tags from `galleryinfo.txt`:
- `female:guro` → 猎奇 (guro) directory
- `other:tankoubon` → 单行本 (tankoubon) directory
- Default → 短篇 (doujinshi) directory

### Filename Patterns

Supported filename formats for author/circle extraction:
- `[author]title.zip`
- `[circle (author)]title.zip`
- `(event)[circle (author)]title.zip`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This toolkit is for personal archival purposes only. Please respect the terms of service of the websites you use and ensure you have the right to download and store the content.

## 🗺️ Roadmap

- [ ] Complete LANraragi integration
- [ ] Add configuration file support
- [ ] Create GUI for archive management
- [ ] Implement duplicate detection
- [ ] Add metadata editing capabilities
- [ ] Support for additional archive formats

## 💡 Tips

- Use the batch download feature responsibly to avoid overloading servers
- Regularly backup your organized library
- Check the error log in the batch download panel for failed downloads
- Configure your H@H client to use a consistent download directory