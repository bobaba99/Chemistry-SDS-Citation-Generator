#!/usr/bin/env bash
# Install Python and the required libraries, then run the citation generator.
# All SDS PDFs, citation.py, requirements.txt and setup.sh must be in the
# same folder before running this script.
set -e

if ! command -v python3 >/dev/null 2>&1; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: install Homebrew (if needed) and Python.
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        brew install python
    else
        echo "Python 3 was not found. Please install it and re-run this script." >&2
        exit 1
    fi
fi

python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
chmod +x citation.py
python3 citation.py
