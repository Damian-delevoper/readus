#!/bin/bash

# Script to copy files to iOS Simulator for testing
# Usage: ./scripts/copy-to-simulator.sh <file-path>

if [ -z "$1" ]; then
  echo "Usage: ./scripts/copy-to-simulator.sh <file-path>"
  echo "Example: ./scripts/copy-to-simulator.sh ~/Documents/test.pdf"
  exit 1
fi

FILE_PATH="$1"

if [ ! -f "$FILE_PATH" ]; then
  echo "Error: File not found: $FILE_PATH"
  exit 1
fi

# Get the booted simulator device ID
DEVICE_ID=$(xcrun simctl list devices | grep Booted | head -1 | sed 's/.*(\([^)]*\)).*/\1/')

if [ -z "$DEVICE_ID" ]; then
  echo "Error: No booted simulator found. Please start the iOS Simulator first."
  exit 1
fi

# Get the app's data container
APP_CONTAINER=$(xcrun simctl get_app_container "$DEVICE_ID" com.scriptum.app 2>/dev/null)

if [ -z "$APP_CONTAINER" ]; then
  echo "Error: Scriptum app not found on simulator. Make sure the app is installed."
  exit 1
fi

# Get the app's Documents directory
APP_DOCUMENTS=$(dirname "$APP_CONTAINER")/../Data/Documents

# Create Documents directory if it doesn't exist
mkdir -p "$APP_DOCUMENTS"

# Copy the file
FILENAME=$(basename "$FILE_PATH")
cp "$FILE_PATH" "$APP_DOCUMENTS/$FILENAME"

echo "✅ Copied $FILENAME to simulator"
echo "📁 Location: $APP_DOCUMENTS/$FILENAME"
echo ""
echo "Note: You may need to restart the app or use the file picker to access the file."
