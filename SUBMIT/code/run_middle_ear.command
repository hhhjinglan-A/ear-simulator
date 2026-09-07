#!/bin/bash
# Double-click this file to run the whole middle-ear model in MATLAB.
#
# Note: MATLAB's bin/matlab re-splits the -r string on whitespace, so a path
# containing two consecutive spaces gets mangled if embedded in -r. Passing the
# folder via -sd avoids that entirely.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MATLAB_BIN="/Applications/MATLAB_R2026a.app/bin/matlab"

if [ ! -x "$MATLAB_BIN" ]; then
    echo "MATLAB not found at $MATLAB_BIN"
    echo "Edit MATLAB_BIN in this script to point at your install."
    read -r -p "Press Return to close."
    exit 1
fi

echo "Running the middle-ear model from:"
echo "  $DIR"
"$MATLAB_BIN" -sd "$DIR" -desktop -r "runAll" &
sleep 3
echo "MATLAB is starting; this window can be closed."
