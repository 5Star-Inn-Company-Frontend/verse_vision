Write-Host "Installing PyInstaller..."
# Use python -m pip to ensure we install to the current python environment
python -m pip install pyinstaller

Write-Host "Building offline_server..."
Set-Location "c:\Users\odeji\Documents\trae_projects\versevision\python"

# Use python -m PyInstaller to bypass PATH issues
# Use --collect-all to ensure faster_whisper and ctranslate2 binaries/data are included
python -m PyInstaller --clean --onefile --name offline_server --collect-all faster_whisper --collect-all ctranslate2 offline_server.py

Write-Host "Moving executable..."
if (Test-Path "dist/offline_server.exe") {
    Move-Item -Path "dist/offline_server.exe" -Destination "offline_server.exe" -Force
    Write-Host "Build success! Executable is at python/offline_server.exe"
} else {
    Write-Host "Build failed. Check output."
}
