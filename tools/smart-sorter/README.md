# Smart Archive Sorter

AI-powered archive sorter for ExHentai/E-Hentai content with intelligent categorization and interactive confirmation.

## Features

- **Smart Classification**: Rule-based sorting with AI fallback for ambiguous cases
- **Interactive Mode**: Preview and confirm operations before execution
- **Batch Processing**: Group similar files for efficient sorting
- **Multiple Categories**: Support for magazines (杂志), image sets (图集), tankoubon (单行本), doujinshi (短篇), and guro (猎奇)
- **AI Integration**: Uses Gemini API for intelligent classification of difficult cases
- **Rollback Support**: Undo operations if needed
- **Dry Run Mode**: Preview operations without moving files

## Installation

1. Navigate to the smart-sorter directory:
```bash
cd tools/smart-sorter
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```
This will compile TypeScript and copy configuration files to the dist directory.

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

## Usage

### Basic Sorting

```bash
# Sort archives with interactive confirmation
node dist/index.js sort /path/to/source /path/to/target

# Quick batch mode (less interactive)
node dist/index.js sort /path/to/source /path/to/target --batch

# Dry run (preview without moving files)
node dist/index.js sort /path/to/source /path/to/target --dry-run
```

### Advanced Options

```bash
# Use custom configuration
node dist/index.js sort /path/to/source /path/to/target --config custom-config.json

# Non-interactive mode (auto-confirm all)
node dist/index.js sort /path/to/source /path/to/target --no-interactive

# Verbose output
node dist/index.js sort /path/to/source /path/to/target --verbose
```

### Operation Management

```bash
# View operation history
node dist/index.js history

# Rollback last 5 operations
node dist/index.js rollback --count 5

# Rollback all operations
node dist/index.js rollback
```

### Global Installation (Optional)

```bash
# Install globally to use 'smart-sort' command
npm install -g .

# Then use anywhere
smart-sort sort /path/to/source /path/to/target
```

## Configuration

The sorter uses `src/config/categories.json` for classification rules. You can customize:

- **Categories**: Add or modify sorting categories
- **Tag Rules**: Define which tags map to which categories
- **Filename Patterns**: Regex patterns for extracting metadata
- **AI Settings**: Gemini API configuration
- **Options**: Batch size, confidence thresholds, etc.

### Example Configuration

```json
{
  "categories": {
    "杂志": {
      "tags": ["other:anthology"],
      "excludeTags": ["other:goudoushi"],
      "priority": 3,
      "description": "Magazine collections",
      "patterns": ["COMIC\\s+([A-Z]+)", "([A-Za-z\\s]+)\\s+Vol\\."]
    }
  }
}
```

## Directory Structure

The sorter creates the following structure:

```
target/
├── 杂志/
│   ├── COMIC BAVEL/
│   ├── LQ -Little Queen-/
│   └── [other magazines]/
├── 图集/
│   ├── artist1/
│   ├── artist2/
│   └── [other artists]/
├── 单行本/
│   ├── author1/
│   └── [other authors]/
├── 短篇/
│   ├── circle1/
│   └── [other circles]/
└── 猎奇/
    ├── author1/
    └── [other authors]/
```

## Archive Analysis

The sorter analyzes each archive by:

1. **Extracting galleryinfo.txt** from the archive
2. **Parsing tags** and metadata
3. **Extracting author/circle/magazine names** from filenames
4. **Applying classification rules** in priority order
5. **Using AI for ambiguous cases** (if API key provided)

## Filename Patterns

Supports various filename formats:

- `[author]title.zip`
- `[circle (author)]title.zip`
- `(event)[circle (author)]title.zip`
- `COMIC MAGAZINE 2025年1月号.zip`
- `[Pixiv] artist (12345).zip`
- `[Fanbox][Pixiv] artist | 中文名.zip`

## AI Classification

When enabled with `GEMINI_API_KEY`, the sorter uses Gemini AI to:

- Classify ambiguous archives
- Extract appropriate directory names
- Provide reasoning for decisions
- Handle edge cases not covered by rules

## Error Handling

- **Validation**: Checks source/target paths before operations
- **Logging**: Detailed logs in `smart_sort_log.txt`
- **Rollback**: Can undo operations if something goes wrong
- **Graceful Failures**: Continues processing if individual files fail

## Development

```bash
# Watch mode for development
npm run dev

# Clean build
npm run clean && npm run build

# Syntax check shell scripts (from project root)
bash -n scripts/*.sh
```

## Troubleshooting

### Common Issues

1. **"Source file does not exist"**: Check file paths and permissions
2. **"Target file already exists"**: Use `--dry-run` to preview conflicts
3. **"GEMINI_API_KEY not found"**: AI features disabled, rule-based sorting only
4. **"Could not find galleryinfo.txt"**: Archive may be corrupted or different format
5. **Permission errors on WSL**: Use the WSL wrapper script or see below

### WSL Permission Issues

If you encounter "EACCES: permission denied" errors when sorting files on Windows drives:

#### Option 1: Use the WSL wrapper script (Recommended)
```bash
# Use the provided wrapper script that handles permissions
./wsl-sort.sh sort /mnt/g/source /mnt/g/dest

# The script will automatically handle drive mounting with proper permissions
```

#### Option 2: Manual mount with metadata
```bash
# Remount Windows drive with metadata support
sudo umount /mnt/g
sudo mount -t drvfs G: /mnt/g -o metadata,uid=$(id -u),gid=$(id -g),umask=022
```

#### Option 3: Use sudo (Not recommended)
```bash
# Run with sudo (files will be owned by root)
sudo node dist/index.js sort /mnt/g/source /mnt/g/dest
```

The application will automatically try copy+delete if move fails due to permissions.

### Debug Mode

```bash
# Enable debug logging
DEBUG=* node dist/index.js sort /path/to/source /path/to/target
```

## Integration

The smart sorter integrates with the existing ExHentai utilities:

- **Input**: Archives from H@H watcher output
- **Output**: Sorted archives ready for LANraragi import
- **Fallback**: Compatible with existing bash script behavior

## License

MIT License - see main project license.