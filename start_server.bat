@echo off
echo Starting Backend Server...
"C:\Program Files\nodejs\node.exe" server.js
if %errorlevel% neq 0 (
    echo Server crashed with error code %errorlevel%
    pause
)
pause
