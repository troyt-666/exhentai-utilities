# Complete Workflow Guide

This guide describes the complete workflow from browsing ExHentai to having an organized, searchable library.

## Overview

```
Browse ExHentai → Download via H@H → Auto-process → Sort into Library → Browse with LANraragi
```

## Step-by-Step Workflow

### 1. Browsing and Selection

#### Using the Download Button Script

1. **Navigate to ExHentai/E-Hentai search results**
2. **Individual Downloads**:
   - Click "Download Original" for full quality
   - Click "Download Resample" for compressed version
   - Click "Download H@H" to queue for Hentai@Home client

3. **Batch Downloads** (Recommended):
   - Use checkboxes to select multiple galleries
   - Click "Download Selected H@H" in the batch panel
   - Monitor progress and check error logs

#### Best Practices
- Batch download during off-peak hours
- Limit batch size to 20-30 galleries at once
- Check your GP balance before large downloads
- Use H@H downloads for archival (original quality, no GP cost)

### 2. H@H Download Processing

#### Automatic Processing with Watcher

1. **Start the H@H watcher**:
   ```bash
   cd ~/exhentai-utilities
   ./scripts/hath-watcher.sh &
   ```

2. **What happens automatically**:
   - Detects new folders in H@H download directory
   - Waits for `galleryinfo.txt` (indicates completion)
   - Zips the entire folder
   - Removes the original folder
   - Creates `[gallery-name].zip` in the same location

#### Manual Processing

If the watcher isn't running, you can manually zip:
```bash
cd /path/to/hah/downloads
for dir in */; do
    if [ -f "$dir/galleryinfo.txt" ]; then
        zip -r "${dir%/}.zip" "$dir"
        rm -rf "$dir"
    fi
done
```

### 3. Organizing Your Library

#### Running the Archive Sorter

1. **Basic usage**:
   ```bash
   ./scripts/sort-archives.sh /path/to/downloads /path/to/library
   ```

2. **What the sorter does**:
   - Reads each archive's `galleryinfo.txt`
   - Extracts author/circle name from filename
   - Checks tags to determine category
   - Creates author directories as needed
   - Moves archives to appropriate locations

#### Library Structure

Your organized library will look like:
```
library/
├── 单行本/              # Full volumes (tankoubon)
│   ├── [Author A]/
│   │   ├── [Author A] Title 1.zip
│   │   └── [Author A] Title 2.zip
│   └── [Author B]/
│       └── [Author B] Series Vol.1.zip
├── 短篇/                # Doujinshi/short works
│   ├── [Circle X]/
│   │   └── (C99)[Circle X] Work.zip
│   └── [Artist Y]/
│       ├── [Artist Y] Story 1.zip
│       └── [Artist Y] Story 2.zip
└── 猎奇/                # Guro content (separated)
    └── [Author Z]/
        └── [Author Z] Dark Work.zip
```

### 4. LANraragi Integration

#### Initial Import

1. **Configure LANraragi watch folder** to point to your library
2. **Run a library scan** in LANraragi
3. **Archives are automatically imported** with metadata

#### Ongoing Usage

1. **Browse your library** through LANraragi web interface
2. **Use the LANraragi checker script** when browsing ExHentai:
   - Green border = Already in library
   - Red border = Not in library
   - Yellow border = Similar title exists

### 5. Maintenance Tasks

#### Regular Cleanup

```bash
# Find and remove empty directories
find /path/to/library -type d -empty -delete

# Check for corrupted archives
find /path/to/library -name "*.zip" -exec unzip -t {} \; 2>&1 | grep -B1 "cannot find"

# Generate library statistics
find /path/to/library -name "*.zip" | wc -l  # Total archives
du -sh /path/to/library/*                     # Size by category
```

#### Backup Strategy

1. **Regular backups**:
   ```bash
   rsync -av --progress /path/to/library/ /backup/location/
   ```

2. **Incremental backups**:
   ```bash
   rsync -av --progress --link-dest=/backup/prev/ /path/to/library/ /backup/current/
   ```

## Advanced Workflows

### Custom Tag Rules

Modify the sorter to handle additional categories:

```bash
# In sort-archives.sh, add new category:
CUSTOM_DIR="$TARGET_DIR/Custom"
mkdir -p "$CUSTOM_DIR"

# Add tag check:
if echo "$tags_line" | grep -q "your:custom_tag"; then
    target_dir="$CUSTOM_DIR"
fi
```

### Duplicate Detection

Before downloading, check for duplicates:

```bash
# Search by title in your library
find /path/to/library -name "*Title*" -type f

# Use LANraragi API
curl "http://localhost:3000/api/search?title=Gallery+Name"
```

### Metadata Enhancement

Add custom metadata after import:

1. Extract and edit `galleryinfo.txt`
2. Add custom fields
3. Re-zip the archive
4. Trigger LANraragi rescan

## Troubleshooting Common Issues

### Downloads Not Starting

- **Check H@H client status**: Ensure it's running and connected
- **Verify GP balance**: H@H downloads still require GP
- **Check disk space**: Both download and library locations

### Sorter Misses Files

- **Verify archive format**: Must be .zip files
- **Check galleryinfo.txt**: Must be in correct location within archive
- **Filename encoding**: Ensure UTF-8 support

### LANraragi Not Showing Archives

- **Check file permissions**: LANraragi needs read access
- **Verify archive integrity**: Corrupted zips won't import
- **Clear cache**: Sometimes needed after bulk imports

## Tips for Efficiency

1. **Schedule operations**:
   ```bash
   # Add to crontab
   0 3 * * * /path/to/sort-archives.sh /downloads /library
   ```

2. **Monitor disk usage**:
   ```bash
   df -h | grep -E "Filesystem|library"
   ```

3. **Parallel processing** for large libraries:
   ```bash
   find /downloads -name "*.zip" -print0 | xargs -0 -P 4 -I {} ./process-single.sh {}
   ```

## Integration Examples

### Discord Notifications

```bash
# Add to hath-watcher.sh after successful zip
curl -H "Content-Type: application/json" \
     -d "{\"content\":\"New archive ready: $ZIP_NAME\"}" \
     $DISCORD_WEBHOOK_URL
```

### Auto-upload to Cloud

```bash
# After sorting
rclone copy "$target_file" remote:hentai-library/ --progress
```

## Best Practices Summary

1. **Always backup** before major operations
2. **Test scripts** on small batches first
3. **Monitor logs** for errors and warnings
4. **Keep metadata** intact for future reference
5. **Respect rate limits** when batch downloading
6. **Organize consistently** to maintain library structure

## Next Steps

- Explore advanced LANraragi plugins
- Set up automated cloud backups
- Create custom metadata extractors
- Build a web interface for remote management