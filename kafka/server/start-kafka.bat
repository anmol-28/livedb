@echo off
echo Starting Kafka Broker...
cd /d C:\Users\anmol\kafkatest
bin\windows\kafka-server-start.bat config\server.properties
