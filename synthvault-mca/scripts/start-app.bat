@echo off
rem ============================================================
rem  Starts the SynthVault API on http://localhost:8080
rem  Builds the jar first if it is missing.
rem ============================================================
setlocal
set BASE=%~dp0..
if not exist "%BASE%\target\synthvault-mca-1.0.0.jar" (
    echo [start-app] Jar missing - building with Maven...
    pushd "%BASE%"
    call mvn -q clean package
    popd
)
if not exist "%BASE%\target\synthvault-mca-1.0.0.jar" (
    echo [start-app] Build FAILED - check Maven output above.
    exit /b 1
)
echo [start-app] Starting SynthVault API on http://localhost:8080  (Ctrl+C to stop)
java -jar "%BASE%\target\synthvault-mca-1.0.0.jar"
endlocal
