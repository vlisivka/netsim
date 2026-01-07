#!/bin/bash
set -ueE -o pipefail

TRANSLATIONS_DIR="./translations"

for FILE in levels/*/*.html
do
  FILE_NAME=$(basename "$FILE")
  html2po --pot -i "$FILE" -o "$TRANSLATIONS_DIR/${FILE_NAME%.html}.pot"
done
