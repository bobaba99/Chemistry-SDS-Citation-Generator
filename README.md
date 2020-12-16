# Chemistry-SDS-Citation-Generator
This is a python project to generate chemical safety data sheet in ACS format for your chemistry related papers!

## Disclaimers
The example safety data sheets come from Sigma-Aldrich and Alfa Aesar.
This is a free program, not for commercial profits, so don't get scammed 😉. Feel free to improve it for your personal and academic uses!

## Introduction
This program will generate your SDS citations in ACS format (alphabetical order and numbered list) in a .docx file. This program is specifically designed for SDS from Sigma-Aldrich and Alfa Aesar. Since this is a Python program, you will need to install Python on your laptop. Two libraries that also needs to be installed are python-docx and PyPDF2.
I am not an experienced programmer, some codes might not fit in your professional format. Criticism and feedbacks are welcomed! This is a generic program I wrote for academic use, not tested to the full extent yet. Let me know if there are runtime problems.

## Setup for Python and libraries & instructions
### Mac and Linux
There is a shell script `setup.sh` for Linux and Mac OS. To execute it, open the folder in terminal that contains this shell script and type the following code in the terminal:
```
$ ./setup.sh
```
This script will install [Homebrew](https://brew.sh) (if you haven't), [Python](https://www.python.org/downloads/mac-osx/), [PyPDF2](https://pypi.org/project/PyPDF2/#description) and [python-docx](https://python-docx.readthedocs.io/en/latest/user/install.html) libraries on your computer. Then it will modify the permission to execute of `citation.py` and execute the program to generate citations in `export.docx` in the same folder.
For this script to work, SDS, `citation.py` and `setup.sh` all need to be in the same folder. If, however, you need to run the program multiple times, simply open the folder in terminal and type
```
$ ./citation.py
```
And it will run. The previous setup for Python and its libraries is one-time only.
If you decide to do it manually, instructions can be found here([python-docx](https://python-docx.readthedocs.io/en/latest/user/install.html)) and here([PyPDF2](https://pypi.org/project/PyPDF2/#description))

### Windows
To install Python, you can find install instructions [here](https://www.python.org/downloads/windows/).
To install [python-docx](https://python-docx.readthedocs.io/en/latest/user/install.html) and [PyPDF2](https://pypi.org/project/PyPDF2/#description), open Command Prompt and type the following commands:
```
$ pip install python-docx
$ pip install PyPDF2
```
Download `citatoin.py` and place it in the same folder as the SDS. Right click and open Property of `citation.py` and allow execute permission for user. Open the folder containing python file and pdf files in Command Prompt and type
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

3. Current version cannot overwrite previous .docx file, best to delete it before the next execution of the program.

License: Creative Commons Zero v1.0 Universal
