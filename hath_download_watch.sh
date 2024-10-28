# Check and install missing packages
for pkg in "${REQUIRED_PACKAGES[@]}"; do
  if ! dpkg -l | grep -q "^ii  $pkg"; then
    echo "Package $pkg is not installed. Installing $pkg..."
    sudo apt-get update
    sudo apt-get install -y $pkg
  else
    echo "Package $pkg is already installed."
  fi
done

WATCH_DIR="/root/block/HaH/download"

# Function to handle zipping a subfolder
zip_subfolder() {
  NEW=$1
  SUBFOLDER_NAME=$(basename "$NEW")
  echo "New subfolder detected: $SUBFOLDER_NAME"

  # Watch the new folder for the creation of galleryinfo.txt
  # inotifywait -m -e create --format '%w%f' "$NEW" | while read FILE
  while true; do
    FILE=$(inotifywait -q -e close_write --format '%w%f' "$NEW")
    BASENAME=$(basename "$FILE")
    if [ "$BASENAME" == "galleryinfo.txt" ]; then
      echo "Detected galleryinfo.txt in $NEW, waiting to ensure complete transfer..."

      # Wait for a few seconds to make sure galleryinfo.txt is fully transmitted
      sleep 5

      # Zip the subfolder
      ZIP_NAME="${NEW%/}.zip"
      echo "Zipping $NEW to $ZIP_NAME..."
      # zip -qr "$ZIP_NAME" "$NEW"
      (cd "$WATCH_DIR" && zip -qr "$ZIP_NAME" "$SUBFOLDER_NAME")
      echo "Zipping complete for $ZIP_NAME"

      # Remove the subfolder after zipping
      echo "Removing $NEW..."
      rm -rf "$NEW"
      echo "Removal complete for $NEW"

      # Exit the inner loop since we have completed the task for this folder
      break
    fi
  done
}

# Start watching the parent folder indefinitely
inotifywait -m -r -e create --format '%w%f' "$WATCH_DIR" | while read NEW
do
  # If it's a directory
  if [ -d "$NEW" ]; then
    # Call the function to handle the subfolder in the background (&)
    zip_subfolder "$NEW" &
  fi
done