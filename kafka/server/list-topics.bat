@echo off
echo Listing Kafka topics...
cd /d C:\Users\anmol\kafkatest
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list
pause
