@echo off
title JimpitanKu Server
color 0A
cls

REM PENTING: Mengaktifkan Delayed Expansion & Pindah ke direktori skrip
SETLOCAL ENABLEDELAYEDEXPANSION
pushd "%~dp0"

echo ==================================================
echo      Aplikasi JimpitanKu - Manajemen Iuran
echo ==================================================
echo.

REM --- 1. Cek Node.js ---
echo [INFO] Memeriksa instalasi Node.js...
node -v >nul 2>&1
if !errorlevel! neq 0 goto :NODE_NOT_FOUND
echo [INFO] Node.js ditemukan.

REM --- 2. Install library jika folder node_modules belum ada ---
if exist "node_modules" goto :SKIP_INSTALL

echo [INFO] Folder 'node_modules' tidak ditemukan.
echo [INFO] Sedang menginstall library (hanya sekali)...
call npm install

if !errorlevel! neq 0 goto :INSTALL_FAILED
echo [INFO] Instalasi library selesai.
goto :START_SERVER

:SKIP_INSTALL
echo [INFO] Folder 'node_modules' sudah ada. Melewatkan instalasi.

REM --- 4. Buka browser spesifik dan jalankan server ---
:START_SERVER
echo.
echo [SUCCESS] Aplikasi siap dijalankan!
echo [INFO] Membuka Google Chrome dalam 3 detik...

REM LOKASI CHROME TELAH DIPERBARUI SESUAI PATH ANDA
SET "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
SET "URL=http://localhost:4173"

timeout /t 3 >nul

REM Perintah untuk menjalankan Google Chrome ke URL tertentu
START "" "%CHROME_PATH%" %URL%

echo.
echo [PENTING] JANGAN TUTUP JENDELA HITAM INI SELAMA APLIKASI DIGUNAKAN.
echo Tekan Ctrl+C jika ingin mematikan server.
echo.
echo Server berjalan di: %URL%
echo.

call npm run preview
pause
EXIT /B 0

REM ==================================================
REM === BLOK PENANGANAN ERROR ===
REM ==================================================

:NODE_NOT_FOUND
color 0C
echo [ERROR] Node.js tidak ditemukan di komputer ini.
echo Harap download dan install Node.js dari https://nodejs.org/
echo.
pause
EXIT /B 1

:INSTALL_FAILED
color 0C
echo [ERROR] Gagal menginstall library. Cek koneksi internet Anda.
pause
EXIT /B 1