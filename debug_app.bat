@echo off
echo DIAGNOSTIC MODE
echo ----------------
echo Checking for Node.js...

if exist "C:\Program Files\nodejs\node.exe" (
    echo Node.exe found.
) else (
    echo ERROR: Node.exe NOT found at C:\Program Files\nodejs\node.exe
    pause
    exit
)

if exist "C:\Program Files\nodejs\npm.cmd" (
    echo npm.cmd found.
) else (
    echo ERROR: npm.cmd NOT found at C:\Program Files\nodejs\npm.cmd
    pause
    exit
)

echo.
echo Installing dependencies...
call "C:\Program Files\nodejs\npm.cmd" install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit
)

echo.
echo Starting App...
call "C:\Program Files\nodejs\npm.cmd" run dev
pause
