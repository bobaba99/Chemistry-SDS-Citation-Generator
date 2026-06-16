# Chemistry-SDS-Citation-Generator
This is a python project to generate chemical safety data sheet in ACS format for your chemistry related papers!

## Disclaimers
The example safety data sheets come from Sigma-Aldrich and Alfa Aesar.
This is a free program, not for commercial profits, so don't get scammed 😉. Feel free to improve it for your personal and academic uses!

## Introduction
This program generates your SDS citations from the safety data sheet PDFs in two formats at once:

* `export.docx` — an ACS-style, numbered reference list (alphabetical by file name), and
* `export.ris` — an RIS file you can import directly into Zotero, EndNote, Mendeley and other reference managers.

The supplier is detected automatically from each PDF. **Supported suppliers: Sigma-Aldrich and Thermo Fisher / Alfa Aesar.** Safety data sheets from other suppliers are skipped with a message rather than mis-cited.

Since this is a Python program, you will need to install Python on your laptop along with the `python-docx` and `PyPDF2` libraries (pinned in `requirements.txt`).
I am not an experienced programmer, some codes might not fit in your professional format. Criticism and feedbacks are welcomed! This is a generic program I wrote for academic use. Let me know if there are runtime problems.

## Setup for Python and libraries & instructions
### Mac and Linux
There is a shell script `setup.sh` for Linux and Mac OS. To execute it, open the folder in terminal that contains this shell script and type the following code in the terminal:
```
$ ./setup.sh
```
This script will install [Homebrew](https://brew.sh) (if you haven't), [Python](https://www.python.org/downloads/mac-osx/), and the [PyPDF2](https://pypi.org/project/PyPDF2/#description) and [python-docx](https://python-docx.readthedocs.io/en/latest/user/install.html) libraries (from `requirements.txt`) on your computer. Then it will modify the permission to execute of `citation.py` and execute the program to generate `export.docx` and `export.ris` in the same folder.
For this script to work, the SDS PDFs, `citation.py`, `requirements.txt` and `setup.sh` all need to be in the same folder. If, however, you need to run the program multiple times, simply open the folder in terminal and type
```
$ ./citation.py
```
And it will run. The previous setup for Python and its libraries is one-time only.
If you decide to do it manually, instructions can be found here([python-docx](https://python-docx.readthedocs.io/en/latest/user/install.html)) and here([PyPDF2](https://pypi.org/project/PyPDF2/#description))

### Windows
To install Python, you can find install instructions [here](https://www.python.org/downloads/windows/).
To install [python-docx](https://python-docx.readthedocs.io/en/latest/user/install.html) and [PyPDF2](https://pypi.org/project/PyPDF2/#description), open Command Prompt and type the following command:
```
$ pip install -r requirements.txt
```
Download `citation.py` and place it in the same folder as the SDS. Open the folder containing the python file and pdf files in Command Prompt and type
```
$ python citation.py
```
This will run the program and generate citations.

### Key elements
1. Make sure `citation.py` and `setup.sh` are executable, usually it can be done with
```
$ chmod +x citation.py
$ chmod +x setup.sh
```
in Linux and Mac OS. It needs to be done by editing file permission in file property in Windows.

2. All SDS files, `citation.py` and `setup.sh` needs to be in the same folder before executing.

3. If an `export.docx` already exists, new citations are **appended** to it (so you can build a list across several runs). The `export.ris` file is rewritten each run. To start a fresh `.docx`, delete the old one before running again.

License: Creative Commons Zero v1.0 Universal
