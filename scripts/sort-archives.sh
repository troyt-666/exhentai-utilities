#!/bin/bash

# Archive sorter for hentai manga library
# Sorts archives into 单行本 (tankoubon) or 短篇 (doujinshi) based on tags
# Organizes by extracted author/circle name from filename

set -e

# Configuration
SOURCE_DIR="${1:-./unsorted}"
TARGET_DIR="${2:-./library}"
TANKOUBON_DIR="$TARGET_DIR/单行本"
DOUJINSHI_DIR="$TARGET_DIR/短篇"
GURO_DIR="$TARGET_DIR/猎奇"
LOG_FILE="sort_log.txt"

# Create target directories
mkdir -p "$TANKOUBON_DIR" "$DOUJINSHI_DIR" "$GURO_DIR"

# Function to extract author/circle from filename
extract_author() {
    local filename="$1"
    local prefer_circle="$2"  # true if we should prefer circle name over author
    local author=""
    local circle=""
    
    # Remove .zip extension
    filename="${filename%.zip}"
    
    # Pattern matching for different filename formats
    # [circle(author)]name.zip
    if [[ "$filename" =~ ^\[([^(]+)\(([^)]+)\)\] ]]; then
        circle="${BASH_REMATCH[1]}"
        author="${BASH_REMATCH[2]}"
    # (event)[circle(author)]name.zip
    elif [[ "$filename" =~ ^\([^)]+\)\[([^(]+)\(([^)]+)\)\] ]]; then
        circle="${BASH_REMATCH[2]}"
        author="${BASH_REMATCH[3]}"
    # [author]name.zip or (event)[author]name.zip
    elif [[ "$filename" =~ ^\[([^\]]+)\] ]] || [[ "$filename" =~ ^\([^)]+\)\[([^\]]+)\] ]]; then
        if [[ "$filename" =~ ^\([^)]+\)\[([^\]]+)\] ]]; then
            author="${BASH_REMATCH[2]}"
        else
            author="${BASH_REMATCH[1]}"
        fi
        circle="$author"  # Fallback to author if no separate circle
    else
        author="未知作者"
        circle="未知作者"
    fi
    
    # Choose which name to return based on preference
    local result=""
    if [[ "$prefer_circle" == "true" && -n "$circle" ]]; then
        result="$circle"
    else
        result="$author"
    fi
    
    # Clean up name (remove special characters that are problematic for directories)
    result=$(echo "$result" | sed 's/[\/\\:*?"<>|]/_/g')
    echo "$result"
}

# Function to analyze tags from galleryinfo.txt
analyze_tags() {
    local archive_path="$1"
    local archive_name=$(basename "$archive_path" .zip)
    local galleryinfo_path="${archive_name}/galleryinfo.txt"
    
    # Extract ONLY galleryinfo.txt (not the entire archive)
    if unzip -q -j -o "$archive_path" "$galleryinfo_path" -d /tmp/ 2>/dev/null; then
        local tags_line=$(grep "^Tags:" "/tmp/galleryinfo.txt" 2>/dev/null || echo "")
        
        # Check for different tag types
        local is_guro=false
        local is_tankoubon=false
        local is_goudoushi=false
        
        if echo "$tags_line" | grep -q "female:guro"; then
            is_guro=true
        fi
        
        if echo "$tags_line" | grep -q "other:tankoubon"; then
            is_tankoubon=true
        fi
        
        if echo "$tags_line" | grep -q "other:goudoushi"; then
            is_goudoushi=true
        fi
        
        rm -f "/tmp/galleryinfo.txt"  # Clean up temporary file
        
        # Return results as space-separated values
        echo "$is_guro $is_tankoubon $is_goudoushi"
    else
        # If galleryinfo.txt cannot be found, return defaults
        echo "  WARNING: Could not find galleryinfo.txt in $(basename "$archive_path")" >&2
        echo "false false false"
    fi
}

# Function to move archive to appropriate directory
move_archive() {
    local source_file="$1"
    local target_base_dir="$2"
    local author="$3"
    local filename=$(basename "$source_file")
    
    # Create author directory
    local author_dir="$target_base_dir/$author"
    mkdir -p "$author_dir"
    
    # Move file
    local target_file="$author_dir/$filename"
    if [[ -f "$target_file" ]]; then
        echo "WARNING: $target_file already exists, skipping..." | tee -a "$LOG_FILE"
        return 1
    fi
    
    mv "$source_file" "$target_file"
    echo "Moved: $filename -> $target_base_dir/$author/" | tee -a "$LOG_FILE"
    return 0
}

# Main sorting loop
echo "Starting archive sorting..." | tee "$LOG_FILE"
echo "Source: $SOURCE_DIR" | tee -a "$LOG_FILE"
echo "Target: $TARGET_DIR" | tee -a "$LOG_FILE"
echo "===========================================" | tee -a "$LOG_FILE"

total_files=0
moved_files=0
errors=0

for archive in "$SOURCE_DIR"/*.zip; do
    # Check if any zip files exist
    [[ -f "$archive" ]] || continue
    
    total_files=$((total_files + 1))
    filename=$(basename "$archive")
    
    echo "Processing: $filename"
    
    # Analyze tags from galleryinfo.txt
    tag_results=$(analyze_tags "$archive")
    read -r is_guro is_tankoubon is_goudoushi <<< "$tag_results"
    
    # Determine directory and author preference
    local target_dir=""
    local prefer_circle=false
    
    # Priority 1: Guro content goes to 猎奇 regardless of other tags
    if [[ "$is_guro" == "true" ]]; then
        target_dir="$GURO_DIR"
        echo "  -> Guro content detected"
    # Priority 2: Check if it's tankoubon or doujinshi
    elif [[ "$is_tankoubon" == "true" ]]; then
        target_dir="$TANKOUBON_DIR"
        echo "  -> Tankoubon detected"
    else
        target_dir="$DOUJINSHI_DIR"
        echo "  -> Doujinshi detected"
    fi
    
    # For goudoushi, prefer circle name over author name
    if [[ "$is_goudoushi" == "true" ]]; then
        prefer_circle=true
        echo "  -> Goudoushi detected, using circle name"
    fi
    
    # Extract author/circle name based on preference
    author=$(extract_author "$filename" "$prefer_circle")
    echo "  -> Author/Circle: $author"
    
    # Move the archive
    if move_archive "$archive" "$target_dir" "$author"; then
        moved_files=$((moved_files + 1))
    else
        errors=$((errors + 1))
    fi
done

echo "===========================================" | tee -a "$LOG_FILE"
echo "Sorting completed!" | tee -a "$LOG_FILE"
echo "Total files processed: $total_files" | tee -a "$LOG_FILE"
echo "Successfully moved: $moved_files" | tee -a "$LOG_FILE"
echo "Errors/Skipped: $errors" | tee -a "$LOG_FILE"

# Show directory structure
echo -e "\nDirectory structure:" | tee -a "$LOG_FILE"
echo "单行本:" | tee -a "$LOG_FILE"
find "$TANKOUBON_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null | sort | sed 's/^/  /' | tee -a "$LOG_FILE"
echo "短篇:" | tee -a "$LOG_FILE"
find "$DOUJINSHI_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null | sort | sed 's/^/  /' | tee -a "$LOG_FILE"
echo "猎奇:" | tee -a "$LOG_FILE"
find "$GURO_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null | sort | sed 's/^/  /' | tee -a "$LOG_FILE"