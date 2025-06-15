#!/bin/bash

# WSL wrapper script for smart-sorter with proper permissions
# This script helps with permission issues when sorting files on Windows drives

set -e

# Check if running in WSL
if ! grep -q Microsoft /proc/version 2>/dev/null; then
    echo "This script is designed for WSL. Running normal sort..."
    node "$(dirname "$0")/dist/index.js" "$@"
    exit $?
fi

# Function to fix Windows drive permissions
fix_permissions() {
    local target_dir="$1"
    
    # Extract drive letter from path like /mnt/g/...
    if [[ "$target_dir" =~ ^/mnt/([a-z])/ ]]; then
        local drive_letter="${BASH_REMATCH[1]}"
        echo "Detected Windows drive: $drive_letter"
        
        # Create mount point with metadata options if needed
        if ! mount | grep -q "/mnt/$drive_letter.*metadata"; then
            echo "Remounting drive $drive_letter with metadata support..."
            sudo umount "/mnt/$drive_letter" 2>/dev/null || true
            sudo mount -t drvfs "${drive_letter}:" "/mnt/$drive_letter" -o metadata,uid=$(id -u),gid=$(id -g),umask=022
        fi
    fi
}

# Parse arguments to find source and target directories
SOURCE=""
TARGET=""
ARGS=()
NEXT_IS_SOURCE=false
NEXT_IS_TARGET=false

for arg in "$@"; do
    if [[ "$arg" == "sort" ]]; then
        ARGS+=("$arg")
        NEXT_IS_SOURCE=true
    elif [[ "$NEXT_IS_SOURCE" == true ]]; then
        SOURCE="$arg"
        ARGS+=("$arg")
        NEXT_IS_SOURCE=false
        NEXT_IS_TARGET=true
    elif [[ "$NEXT_IS_TARGET" == true ]]; then
        TARGET="$arg"
        ARGS+=("$arg")
        NEXT_IS_TARGET=false
    else
        ARGS+=("$arg")
    fi
done

# Fix permissions if directories are on Windows drives
if [[ -n "$SOURCE" ]]; then
    fix_permissions "$SOURCE"
fi

if [[ -n "$TARGET" ]]; then
    fix_permissions "$TARGET"
fi

# Run the smart sorter
echo "Running smart sorter with improved permissions..."
node "$(dirname "$0")/dist/index.js" "${ARGS[@]}"