#!/bin/bash

set -ueE -o pipefail

TRANSLATIONS_DIR="./translations"

for LANG_DIR in "$TRANSLATIONS_DIR"/??/
do
  for FILE in "$LANG_DIR"/*.po
  do
    FILE_NAME=$(basename "$FILE")
    msgmerge --update --backup=none "$FILE" "$TRANSLATIONS_DIR/pot/${FILE_NAME%??-}t"
  done
done
