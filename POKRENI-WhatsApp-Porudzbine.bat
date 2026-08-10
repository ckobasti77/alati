@echo off
title WhatsApp Porudzbine (Cale) - port 9223
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" (
  echo Ne mogu da nadjem chrome.exe. Javi Claude-u putanju do Chrome-a.
  pause
  exit /b 1
)
echo Pokrecem Chrome za nalog PORUDZBINE na portu 9223...
start "" "%CHROME%" --remote-debugging-port=9223 --user-data-dir="C:\wa-jovan" https://web.whatsapp.com
echo.
echo Ako se otvorio nov Chrome prozor sa WhatsApp Web-om:
echo   1) uloguj se kao nalog "Cale" (skeniraj QR jednom),
echo   2) proveri http://127.0.0.1:9223/json/version u bilo kom browseru (mora dati JSON),
echo   3) vrati se u aplikaciju i klikni "Povuci iz WhatsApp-a".
echo.
pause
