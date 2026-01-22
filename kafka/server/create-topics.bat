@echo off
echo Creating Kafka topic: db_live_events
cd /d C:\Users\anmol\kafkatest
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic db_live_events --partitions 1 --replication-factor 1
