@echo off
:: Quick sort script for LANraragi archives

cd /d "%~dp0"

echo ========================================
echo   Smart Archive Sorter for LANraragi
echo ========================================
echo.

:: Set your paths here
set SOURCE=G:\LANraragi\source
set DEST=G:\LANraragi\dest

:: Check if paths exist
if not exist "%SOURCE%" (
    echo Error: Source directory not found: %SOURCE%
    pause
    exit /b 1
)

echo Source: %SOURCE%
echo Destination: %DEST%
echo.

:: Run the sorter
call smart-sort.bat sort "%SOURCE%" "%DEST%"

echo.
echo ========================================
echo   Sorting complete!
echo ========================================
pause