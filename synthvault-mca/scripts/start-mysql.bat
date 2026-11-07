@echo off
rem ============================================================
rem  Starts the portable MySQL 8 used by SynthVault MCA.
rem  Layout expected:  <repo>\tools\mysql-portable\mysql-8.4.9-winx64
rem  Credentials:      root / root  (matches application.properties)
rem
rem  Machine-portable: locates the MySQL folder, (re)writes my.ini
rem  with the absolute paths of THIS machine, initializes the data
rem  directory on first run, starts the server with --defaults-file,
rem  waits until port 3306 listens, then makes sure root/root works.
rem ============================================================
setlocal enabledelayedexpansion

rem --- normalize .\..\.. style paths into clean absolute paths ---
rem  note: !CD! (delayed expansion) is required - %CD% would be expanded
rem  when the line is parsed, i.e. before pushing the directory.
pushd "%~dp0.."
set BASE=!CD!
popd
pushd "%BASE%\..\tools\mysql-portable"
set PORTABLE=!CD!
popd

if not exist "%PORTABLE%" (
    echo [start-mysql] Portable MySQL folder not found: %PORTABLE%
    echo [start-mysql] Use your own MySQL 8 install instead and set the
    echo [start-mysql] username/password in src\main\resources\application.properties
    exit /b 1
)

rem --- find the mysql-*-winx64 folder (works for any 8.x version) ---
set MYSQLDIR=
for /d %%D in ("%PORTABLE%\mysql-*-winx64") do set MYSQLDIR=%%D
if "%MYSQLDIR%"=="" (
    echo [start-mysql] No mysql-*-winx64 folder inside: %PORTABLE%
    exit /b 1
)
if not exist "%MYSQLDIR%\bin\mysqld.exe" (
    echo [start-mysql] mysqld.exe not found in: %MYSQLDIR%\bin
    exit /b 1
)

rem --- (re)write my.ini with this machine's absolute paths ----------
rem  Using a config file avoids passing paths that contain spaces as
rem  command-line arguments, which mysqld does not parse reliably.
set MYSQLINI=%PORTABLE%\my.ini
(
    echo [mysqld]
    echo basedir=!MYSQLDIR:\=/!
    echo datadir=!MYSQLDIR:\=/!/data
    echo port=3306
    echo max_allowed_packet=64M
) > "%MYSQLINI%"
echo [start-mysql] MySQL folder : %MYSQLDIR%
echo [start-mysql] Config file  : %MYSQLINI%

rem --- first run: create the data directory -------------------------
if not exist "%MYSQLDIR%\data\mysql" (
    echo [start-mysql] First run - initializing data directory...
    "%MYSQLDIR%\bin\mysqld.exe" --defaults-file="%MYSQLINI%" --initialize-insecure
    if errorlevel 1 (
        echo [start-mysql] Initialization FAILED - see messages above.
        exit /b 1
    )
)

rem --- already running? --------------------------------------------
netstat -an | findstr /C:":3306 " | findstr /C:"LISTENING" >nul
if not errorlevel 1 (
    echo [start-mysql] MySQL is already UP on port 3306.
    goto ensurecreds
)

echo [start-mysql] Starting MySQL on port 3306...
start "SynthVault MySQL" /MIN "%MYSQLDIR%\bin\mysqld.exe" --defaults-file="%MYSQLINI%" --console

set /a TRIES=0
:waitloop
timeout /t 2 /nobreak >nul
netstat -an | findstr /C:":3306 " | findstr /C:"LISTENING" >nul
if not errorlevel 1 goto ready
set /a TRIES+=1
if !TRIES! LSS 20 goto waitloop
echo [start-mysql] MySQL did not open port 3306 within 40 seconds.
echo [start-mysql] Check %PORTABLE%\mysqld-err.log for the reason.
exit /b 1

:ready
echo [start-mysql] MySQL is UP (localhost:3306)

:ensurecreds
rem --- make sure root/root works (matches application.properties) ---
"%MYSQLDIR%\bin\mysql.exe" --defaults-file="%MYSQLINI%" -u root --password=root -e "SELECT 1;" >nul 2>&1
if not errorlevel 1 (
    echo [start-mysql] Credentials root/root verified.
    endlocal
    exit /b 0
)
echo [start-mysql] Setting root password to 'root' (first-time setup)...
"%MYSQLDIR%\bin\mysql.exe" --defaults-file="%MYSQLINI%" -u root --skip-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';" >nul 2>&1
if errorlevel 1 (
    echo [start-mysql] WARNING: could not set the root password automatically.
    echo [start-mysql] Set it manually and update application.properties.
    endlocal
    exit /b 1
)
echo [start-mysql] Credentials root/root ready.
endlocal
exit /b 0