@echo off
echo Starting Kafka services in order...
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Step 1: Start ZooKeeper in a new PowerShell terminal
echo [1/3] Starting ZooKeeper in a new terminal...
start "ZooKeeper" powershell -NoExit -Command "cd '%SCRIPT_DIR%'; .\start-zookeeper.bat"
timeout /t 3 /nobreak >nul

REM Step 2: Start Kafka Server in a new PowerShell terminal
echo [2/3] Starting Kafka Server in a new terminal...
start "Kafka Server" powershell -NoExit -Command "cd '%SCRIPT_DIR%'; .\start-kafka-server.bat"
timeout /t 5 /nobreak >nul

REM Step 3: Create Topics in a new PowerShell terminal
echo [3/3] Creating Kafka topics in a new terminal...
start "Create Topics" powershell -NoExit -Command "cd '%SCRIPT_DIR%'; .\create-topics.bat"

echo.
echo All scripts have been launched in separate terminals!
echo Check the terminal windows for execution status.
pause
