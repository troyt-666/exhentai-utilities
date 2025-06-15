# Setup Guide

This guide will walk you through setting up all components of the ExHentai Utilities toolkit.

## Table of Contents

- [System Requirements](#system-requirements)
- [Userscript Installation](#userscript-installation)
- [Shell Scripts Setup](#shell-scripts-setup)
- [LANraragi Integration](#lanraragi-integration)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## System Requirements

### For Userscripts
- Modern web browser (Chrome, Firefox, Edge)
- Tampermonkey extension (or compatible userscript manager)
- Active ExHentai/E-Hentai account with appropriate permissions

### For Shell Scripts
- Linux or WSL (Windows Subsystem for Linux) environment
- Required packages:
  - `bash` (usually pre-installed)
  - `unzip` - For archive manipulation
  - `inotify-tools` - For directory monitoring
  - `grep`, `sed` - Text processing (usually pre-installed)

## Userscript Installation

### 1. Install Tampermonkey

Download from official sources:
- [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 2. Install Download Button Script

1. Open `userscripts/download-button.js` in your browser
2. Tampermonkey should detect the userscript and show an installation page
3. Click "Install" button
4. Verify installation in Tampermonkey dashboard

### 3. Install LANraragi Checker (Optional)

Follow the same process for `userscripts/lanraragi-check.js` if you use LANraragi.

## Shell Scripts Setup

### 1. Install Required Packages

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y unzip inotify-tools
```

#### Arch Linux:
```bash
sudo pacman -S unzip inotify-tools
```

#### RHEL/CentOS/Fedora:
```bash
sudo dnf install -y unzip inotify-tools
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/exhentai-utilities.git
cd exhentai-utilities
```

### 3. Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

### 4. Configure Scripts

#### H@H Watcher Configuration

Edit `scripts/hath-watcher.sh` and update the watch directory:

```bash
WATCH_DIR="/path/to/your/hah/download/directory"
```

#### Archive Sorter Configuration

The sorter accepts command-line arguments, but you can also create an alias:

```bash
alias sort-hentai='~/exhentai-utilities/scripts/sort-archives.sh /downloads /library'
```

## LANraragi Integration

### 1. Prerequisites

- Running LANraragi instance
- API access enabled in LANraragi settings

### 2. Configure Connection

Create `config/lanraragi-config.json`:

```json
{
  "server_url": "http://localhost:3000",
  "api_key": "your-api-key-here",
  "check_duplicates": true,
  "show_indicators": true
}
```

### 3. Get Your API Key

1. Log into LANraragi
2. Go to Settings → Other → API Key
3. Copy the key and paste into config file

## Configuration

### Archive Sorting Rules

Create `config/sort-config.json` to customize sorting behavior:

```json
{
  "directories": {
    "tankoubon": "单行本",
    "doujinshi": "短篇",
    "guro": "猎奇"
  },
  "tag_rules": [
    {
      "tag": "female:guro",
      "category": "guro",
      "priority": 1
    },
    {
      "tag": "other:tankoubon",
      "category": "tankoubon",
      "priority": 2
    }
  ],
  "default_category": "doujinshi",
  "use_circle_for_goudoushi": true
}
```

### H@H Watcher Settings

You can modify the watcher behavior by editing these variables in the script:

```bash
WATCH_DIR="/root/block/HaH/download"  # Download directory
WAIT_TIME=5                           # Seconds to wait after galleryinfo.txt appears
ZIP_OPTIONS="-qr"                     # Zip command options
```

## Troubleshooting

### Common Issues

#### Userscript Not Working

1. **Check Tampermonkey is enabled**: Click the extension icon and ensure it's not disabled
2. **Verify site permissions**: Check that Tampermonkey has permission to run on ExHentai/E-Hentai
3. **Console errors**: Press F12 and check the Console tab for error messages

#### H@H Watcher Not Detecting Files

1. **Check permissions**: Ensure the script has read/write access to the watch directory
2. **Verify inotify-tools**: Run `inotifywait --help` to confirm installation
3. **Check logs**: Add debug output to the script:
   ```bash
   echo "Watching directory: $WATCH_DIR" >> /tmp/hath-watcher.log
   ```

#### Archive Sorter Errors

1. **Missing galleryinfo.txt**: Some archives may not contain metadata
2. **Permission denied**: Check file ownership and permissions
3. **Filename encoding**: Ensure your system supports UTF-8 filenames

### Getting Help

If you encounter issues:

1. Check existing [GitHub Issues](https://github.com/yourusername/exhentai-utilities/issues)
2. Enable debug mode in scripts by adding `set -x` after the shebang
3. Create a new issue with:
   - Error messages
   - System information (OS, browser version)
   - Steps to reproduce

## Security Considerations

- Never share your LANraragi API key
- Be cautious with file permissions on sorted archives
- Use HTTPS for LANraragi connections when possible
- Regularly update your userscripts and dependencies

## Next Steps

- Read the [Workflow Guide](WORKFLOW.md) to understand the complete process
- Customize configuration files to match your preferences
- Set up automated backups for your organized library