#!/bin/bash
set -ueE -o pipefail

TRANSLATIONS_DIR="./translations"
RELEASE_DIR="./release"


for LANG_DIR in "$TRANSLATIONS_DIR"/??/
do
  LANG="${LANG_DIR%/}"
  LANG="${LANG##*/}"
  echo "INFO: Making release for \"$LANG\" language."

  rm -rf "$RELEASE_DIR/$LANG"

  for HTML_FILE in levels/*/*.html
  do
    HTML_FILE_NAME=$(basename "$HTML_FILE")
    HTML_TARGET_DIR="$RELEASE_DIR/$LANG/"$(dirname "$HTML_FILE")

    PO_FILE_NAME="${HTML_FILE_NAME%.html}.po"
    PO_FILE="$TRANSLATIONS_DIR/$LANG/$PO_FILE_NAME"

    mkdir -p "$HTML_TARGET_DIR"
    echo "'$HTML_FILE' -> '$RELEASE_DIR/$LANG/$HTML_FILE'"
    po2html --fuzzy -i "$PO_FILE" -t "$HTML_FILE" -o "$RELEASE_DIR/$LANG/$HTML_FILE"

    JSON_FILE="${HTML_FILE%.html}.json"
    cp -av --target-dir="$HTML_TARGET_DIR" "$JSON_FILE"
  done
done

cp -arv --target-directory="$RELEASE_DIR/$LANG/" css includes js *.php
