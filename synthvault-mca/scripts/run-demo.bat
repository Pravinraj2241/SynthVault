@echo off
rem ============================================================
rem  One-click demo: MySQL (portable) + SynthVault API.
rem  Then open Postman and follow "MCA Project Final.md" Part G.3
rem ============================================================
call "%~dp0start-mysql.bat"
if errorlevel 1 exit /b 1
call "%~dp0start-app.bat"
