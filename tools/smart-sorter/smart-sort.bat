@echo off
:: Smart Archive Sorter - Windows batch file

:: Change to script directory
cd /d "%~dp0"

:: Check if node is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if dist folder exists
if not exist "dist" (
    echo Building project...
    call npm install
    call npm run build
)

:: Run the smart sorter with all arguments
node dist\index.js %*

:: Keep window open if there was an error
if %ERRORLEVEL% NEQ 0 pause