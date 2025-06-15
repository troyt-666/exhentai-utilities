# Smart Archive Sorter - PowerShell script

# Change to script directory
Set-Location -Path $PSScriptRoot

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if dist folder exists
if (-not (Test-Path "dist")) {
    Write-Host "Building project..." -ForegroundColor Yellow
    npm install
    npm run build
}

# Get all arguments
$allArgs = $args -join ' '

# Run the smart sorter
if ($allArgs) {
    node dist\index.js $allArgs
} else {
    node dist\index.js --help
}

# Check for errors
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nPress Enter to exit..." -ForegroundColor Yellow
    Read-Host
}