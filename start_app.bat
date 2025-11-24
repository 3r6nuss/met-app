@echo off
echo MET Lagerverwaltung Launcher
echo ----------------------------
echo.

:: Check for Node.js
if not exist "C:\Program Files\nodejs\node.exe" (
    echo ERROR: Node.js not found at C:\Program Files\nodejs\node.exe
    pause
    exit
)

echo Node.js found. Checking dependencies...
if not exist node_modules (
    echo Installing dependencies...
    call "C:\Program Files\nodejs\npm.cmd" install
)

echo.
echo Starting Backend Server...
start "MET Backend Server" start_server.bat

echo.
echo Starting Frontend...
echo Open the link below in your browser (usually http://localhost:5173)
echo.

call "C:\Program Files\nodejs\npm.cmd" run dev
pause
