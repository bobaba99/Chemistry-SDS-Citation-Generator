#!/usr/bin/env python3
import PyPDF2
import os
import re
import docx
import sys
import codecs
import calendar
from docx import Document
from datetime import datetime
from os import path

# format
# chemical name (italics); CAS RN; MSDS Number, revision number; Supplier: City, State, revision date. URL (accessed date)

def sigmaaldrich(path):
    # extract first page info
    pdfFileObj = open(path, 'rb')
    pdfReader = PyPDF2.PdfFileReader(pdfFileObj)
    pageHandle = pdfReader.getPage(0)
    # print(pageHandle.extractText())

    # output to .txt file
    output = open('temp.txt', 'w')
    output.write(pageHandle.extractText())
    output.close()
    # --------------------------------------------- parse
    readTemp = open('temp.txt', 'r')
    writeFile = open('parse.txt', 'w')

    parsed = readTemp.read().replace('\n', '')
    readTemp.close()
    writeFile.write(parsed)

    readTemp.close()
    writeFile.close()
    # --------------------------------------------- name
    readName = open('parse.txt', 'r')
    rName = re.findall(r'name : ([\s\S]*)  Product', readName.read())
    name = rName[0]
    readName.close()
    writeFile.close()
    # --------------------------------------------- cas
    readCAS = open('parse.txt', 'r')
    rCAS = re.findall(r'CAS-No. : (\d*\-\d*\-\d*)', readCAS.read())
    CAS = rCAS[0] 
    readCAS.close()
    writeFile.close()
    # --------------------------------------------- msds
    readMSDS = open('parse.txt', 'r')
    rMSDS = re.findall(r'Product Number : (\S*)', readMSDS.read())
    msds = rMSDS[0] 
    readMSDS.close()
    writeFile.close()
    # --------------------------------------------- revision num
    readRevNum = open('parse.txt', 'r')
    rRevNum = re.findall(r'Version (\d\.\d)', readRevNum.read())
    revNum = rRevNum[0] 
    readRevNum.close()
    writeFile.close()
    # --------------------------------------------- revision date
    readRevDate = open('parse.txt', 'r')
    rRevDate = re.findall(r'Revision Date (\d*\.\d*\.\d*)', readRevDate.read())
    revDate = rRevDate[0] 
    mNum = revDate[3:5]
    month = calendar.month_name[int(mNum)]
    rDate = month + ' ' + revDate[0:2] + ', ' + revDate[6:10]
    readRevDate.close()
    writeFile.close()
    # --------------------------------------------- city and state
    readCity = open('parse.txt', 'r')
    rCity = re.findall(r'([A-Z]* [A-Z]{2})  \w', readCity.read())
    temp = rCity[0] 
    lower = temp.lower()
    i = len(temp)
    state = temp[i-2:i]
    city = lower.capitalize()[0:i-3] + ', ' + state
    readCity.close()
    writeFile.close()
    # --------------------------------------------- access date
    aDate = '(accessed ' + datetime.today().strftime('%Y-%m-%d') + ')'
    # --------------------------------------------- url
    # https://www.sigmaaldrich.com/MSDS/MSDS/DisplayMSDSPage.do?country=CA&language=en&productNumber=239607&brand=SIAL&PageToGoToURL=%2Fsafety-center.html
    url = 'https://www.sigmaaldrich.com/MSDS/MSDS/DisplayMSDSPage.do?country=CA&language=en&productNumber=' + msds + '&brand=SIAL&PageToGoToURL=%2Fsafety-center.html'

    if os.path.isfile("./export.docx") == True:
        doc = Document('export.docx')
        para = doc.add_paragraph()
        para.style = 'List Number'
        para.add_run(name).italic = True
        para.add_run('; CAS RN: ' + CAS + '; ')
        para.add_run(msds)
        para.add_run(', ' + 'rev. ' + revNum)
        para.add_run('; Sigma-Aldrich: ' + city)
        para.add_run(', ' + rDate + '. ' + url + ' ' + aDate)
        doc.save('export.docx')
    else:
        doc = Document()
        para = doc.add_paragraph(style = 'List Number')
        para.add_run(name).italic = True
        para.add_run('; CAS RN: ' + CAS + '; ')
        para.add_run(msds)
        para.add_run(', ' + 'rev. ' + revNum)
        para.add_run('; Sigma-Aldrich: ' + city)
        para.add_run(', ' + rDate + '. ' + url + ' ' + aDate)
        doc.save('export.docx')

    pdfFileObj.close()

def alfaaesar(path):
    # extract first page info
    pdfFileObj = open(path, 'rb')
    pdfReader = PyPDF2.PdfFileReader(pdfFileObj)
    pageHandle = pdfReader.getPage(0)

    # output to .txt file
    output = open('temp.txt', 'w')
    output.write(pageHandle.extractText())
    output.close()
    # --------------------------------------------- name
    readName = open('temp.txt', 'r')
    rName = re.findall(r'Name([\s\S]*)Cat No', readName.read())
    name = rName[0]
    readName.close()
    # --------------------------------------------- cas
    readCAS = open('temp.txt', 'r')
    rCAS = re.findall(r'CAS-No(\d*-\d*-\d*)Synonyms', readCAS.read())
    CAS = rCAS[0]
    readCAS.close()
    # --------------------------------------------- msds
    readMSDS = open('temp.txt', 'r')
    rMSDS = re.findall(r'Cat No. :(\S*)CAS', readMSDS.read())
    msds = rMSDS[0]
    readMSDS.close()
    # --------------------------------------------- revision num
    readRevNum = open('temp.txt', 'r')
    rRevNum = re.findall(r'Revision Number. (\d)', readRevNum.read())
    revNum = rRevNum[0] 
    readRevNum.close()
    # --------------------------------------------- revision date
    readRevDate = open('temp.txt', 'r')
    rRevDate = re.findall(r'Revision Date  (\S*)Revision', readRevDate.read())
    if len(rRevDate[0]) > 12:
        date = datetime.strptime(rRevDate[0], '%d-%B-%Y').strftime('%B %d, %Y')
    else:
        date = datetime.strptime(rRevDate[0], '%d-%b-%Y').strftime('%B %d, %Y')
    readRevDate.close()
    # --------------------------------------------- access date
    aDate = '(accessed ' + datetime.today().strftime('%Y-%m-%d') + ')'
    # --------------------------------------------- url
    # https://www.alfa.com/en/msds/?language=CE&subformat=AGHS&sku=A12804
    url = 'https://www.alfa.com/en/msds/?language=CE&subformat=AGHS&sku=' + msds

    if os.path.isfile("./export.docx") == True:
        doc = Document('export.docx')
        para = doc.add_paragraph(style = 'List Number')
        para.add_run(name).italic = True
        para.add_run('; CAS RN: ' + CAS + '; ')
        para.add_run(msds)
        para.add_run(', ' + 'rev. ' + revNum)
        para.add_run('; Alfa Aesar, Thermo Fisher: Ward Hill, MA, ')
        para.add_run(date + '. ' + url + ' ' + aDate)
        doc.save('export.docx')
    else:
        doc = Document()
        para = doc.add_paragraph()
        para.add_run(name).italic = True
        para.add_run('; CAS RN: ' + CAS + '; ')
        para.add_run(msds)
        para.add_run(', ' + 'rev. ' + revNum)
        para.add_run('; Alfa Aesar, Thermo Fisher: Ward Hill, MA, ')
        para.add_run(', ' + date + '. ' + url + ' ' + aDate)
        doc.save('export.docx')

    pdfFileObj.close()

def cleanup():
    switch = os.path.exists('parse.txt') and os.path.exists('temp.txt')
    if switch == True:
        os.remove("parse.txt")
        os.remove("temp.txt")

# main
if __name__ == '__main__':
    entries = os.listdir('./')
    list = []
    for entry in entries:
        matched = re.match(r"^.*\.pdf", entry)
        if bool(matched) == 1:
            list.append(entry)
            list.sort()
    for pdf in list:
        path = './' + pdf
        print(path + '\n')
        try:
            alfaaesar(path)
        except:
            sigmaaldrich(path)
cleanup()