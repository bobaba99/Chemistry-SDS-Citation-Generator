/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python
pip install PyPDF2
pip install python-docx
chmod +x citation.py
./citation.py
