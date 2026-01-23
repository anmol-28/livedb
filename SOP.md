# Kafka Data Pipeline - Standard Operating Procedure

**Version:** 1.0  
**Platform:** Windows  
**Last Updated:** January 2026

---

## 1. Purpose of Kafka in This System

### What Kafka Does

- **Stores database row changes as events** - When new rows appear in PostgreSQL `livedb` table, they are sent to Kafka
- **Persists messages independently** - Kafka keeps messages even if you delete rows from the database
- **Provides a message queue** - Consumers can read messages at their own pace
- **Maintains message history** - All messages sent to Kafka are stored until explicitly deleted

### What Kafka Does NOT Do

- **Does not query the database** - The Node.js producer (`kafka/producer/src/index.js`) handles database queries
- **Does not track database offsets** - Offset tracking happens in PostgreSQL `producer_offsets` table
- **Does not delete messages automatically** - Messages persist until Kafka log retention expires or logs are manually deleted
- **Does not run independently** - Kafka requires ZooKeeper to be running first

---

## 2. Kafka Startup Procedure (Correct Order)

### ⚠️ CRITICAL: Startup Order is Mandatory

Kafka **cannot** start without ZooKeeper. The order below is not optional.

### Step 1: Start ZooKeeper

**Option A: Use the entry point script (Recommended)**
```powershell
cd kafka\server
.\kafka-entry-point.bat
```

This script automatically:
- Starts ZooKeeper in a new terminal
- Waits 15 seconds for ZooKeeper to initialize
- Starts Kafka broker in a new terminal
- Waits 10 seconds for Kafka to initialize
- Creates topics in a new terminal

**Option B: Manual startup**
```powershell
cd C:\Users\anmol\kafkatest
bin\windows\zookeeper-server-start.bat config\zookeeper.properties
```

**Verification:**
- ZooKeeper terminal shows: `binding to port 0.0.0.0/0.0.0.0:2181`
- No error messages about port conflicts
- Terminal stays open (this is normal)

### Step 2: Start Kafka Broker

**Only if using manual startup (Option B above):**

Wait until ZooKeeper shows it's bound to port 2181, then:
```powershell
cd C:\Users\anmol\kafkatest
bin\windows\kafka-server-start.bat config\server.properties
```

**Verification:**
- Kafka terminal shows: `started (kafka.server.KafkaServer)`
- No `NodeExistsException` errors
- No connection timeout errors
- Terminal stays open (this is normal)

### Step 3: Verify Kafka is Running

**List topics:**
```powershell
cd C:\Users\anmol\kafkatest
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list
```

**Expected output:**
- `db_live_events` (your main topic)
- `__consumer_offsets` (internal Kafka topic - ignore this)

**If topics don't appear:**
- Check that both ZooKeeper and Kafka terminals are still running
- Wait 30 seconds and try again
- See Section 8: Kafka Debug Checklist

---

## 3. Kafka Topic Management

### How Topics Are Created

Topics are created automatically by `kafka-entry-point.bat` which runs:
```powershell
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic db_live_events --partitions 1 --replication-factor 1
```

**Location:** `kafka/server/create-topics.bat`

### How to List Topics

```powershell
cd C:\Users\anmol\kafkatest
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list
```

### What Internal Topics Are

Kafka creates topics starting with `__` (double underscore):
- `__consumer_offsets` - Stores consumer group offsets
- `__transaction_state` - Transaction state (if using transactions)

**Action:** Ignore these. They are managed by Kafka automatically.

### When Topics Should Be Deleted or Recreated

**Delete a topic:**
```powershell
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --delete --topic db_live_events
```

**When to delete:**
- Topic was created with wrong configuration
- You want to start fresh (all messages will be lost)
- Testing/resetting the pipeline

**When NOT to delete:**
- Just because messages aren't appearing (check producer first)
- Just because consumer shows nothing (check consumer flags)
- During normal operation

**Recreate after deletion:**
```powershell
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic db_live_events --partitions 1 --replication-factor 1
```

---

## 4. Producer → Kafka Flow

### What Triggers Kafka Messages

1. **You run the producer:** `node kafka/producer/src/index.js`
2. **Producer queries database:** Reads `producer_offsets` table to find last processed ID
3. **Producer polls for new rows:** Queries `livedb` table where `id > last_id`
4. **Producer maps rows to events:** Uses `mapper.js` to convert DB rows to Kafka events
5. **Producer sends to Kafka:** Sends events to `db_live_events` topic

### Role of index.js

**File:** `kafka/producer/src/index.js`

**What it does:**
- Initializes Kafka producer connection
- Reads current offset from `producer_offsets` table
- Polls database for new rows (batch size: 10)
- Maps rows to Kafka events using `mapper.js`
- Sends events to Kafka
- Updates offset in database (only after successful Kafka send)
- Exits cleanly

**Important:** The producer runs once and exits. It does not run continuously.

### How Messages Enter Kafka

1. Producer connects to Kafka broker at `localhost:9092`
2. Producer sends batch of messages to `db_live_events` topic
3. Kafka broker receives and stores messages in log files
4. Producer updates database offset (confirms messages were sent)

**Code flow:**
- `index.js` → calls `sendEvents()` from `producer.js`
- `producer.js` → uses KafkaJS library to send to broker
- Broker → writes to disk in `log.dirs` directory

### When Kafka Receives New Data

- **Only when you run the producer script**
- **Only if there are new rows** in database with `id > last_id`
- **Only if producer successfully connects** to Kafka broker

**Kafka does NOT:**
- Poll the database automatically
- Check for new rows on its own
- Run as a background service

---

## 5. Kafka Message Persistence Rules

### Why Kafka Keeps Messages Even If DB Rows Are Deleted

**Kafka and the database are separate systems:**

- Database stores the source data
- Kafka stores a copy of that data as events
- Deleting from database does NOT delete from Kafka

**Example:**
1. Row with `id=100` is inserted into database
2. Producer sends event to Kafka
3. You delete row `id=100` from database
4. **Kafka still has the event** - it's stored in Kafka log files

**This is by design** - Kafka provides an immutable event log.

### Why Restarting Kafka Does Not Clear Data

Kafka stores messages in **log files on disk** (configured in `server.properties` as `log.dirs`).

When you restart Kafka:
- Kafka reads existing log files
- All previous messages are still available
- Consumers can read from the beginning using `--from-beginning`

**Messages are only deleted when:**
- Log retention time expires (default: 7 days)
- Log size limit is reached
- You manually delete log directories (see Section 8)

### Difference Between Kafka Data and DB Data

| Aspect | Database | Kafka |
|--------|----------|-------|
| **Purpose** | Source of truth | Event log |
| **Can delete rows?** | Yes | No (immutable log) |
| **Stored where?** | PostgreSQL (Neon) | Local disk (`log.dirs`) |
| **Updated by?** | Your application | Producer sends events |
| **Deleted when?** | When you DELETE | Only on retention expiry |

**Key insight:** Kafka is a **write-once, append-only** log. Once a message is written, it stays until retention expires.

---

## 6. Consumer Behavior

### How kafka-console-consumer Works

**Basic command:**
```powershell
cd C:\Users\anmol\kafkatest
bin\windows\kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic db_live_events
```

**What it does:**
- Connects to Kafka broker
- Reads messages from `db_live_events` topic
- Prints messages to console as they arrive
- **Only shows NEW messages** (messages sent after consumer starts)

### Meaning of --from-beginning

**Command with flag:**
```powershell
bin\windows\kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic db_live_events --from-beginning
```

**What `--from-beginning` does:**
- Reads ALL messages from the start of the topic
- Shows historical messages first
- Then continues showing new messages

**When to use:**
- Testing/debugging - want to see all messages
- First time consuming a topic
- Verifying messages were sent

**When NOT to use:**
- Production monitoring (only want new messages)
- Long-running consumer (will print thousands of old messages)

### Why Consumers May Show Old Messages

**With `--from-beginning`:**
- Consumer reads from the first message ever sent
- You'll see all historical messages
- This is expected behavior

**Without `--from-beginning`:**
- Consumer only shows messages sent AFTER consumer starts
- If you see old messages, you likely used `--from-beginning` previously and the consumer group offset was set

### Why Consumers May Show Nothing

**Common reasons:**

1. **No messages in topic**
   - Producer hasn't run yet
   - Producer ran but found no new rows
   - Topic was deleted and recreated (messages lost)

2. **Consumer started before producer**
   - Without `--from-beginning`, consumer only sees NEW messages
   - Solution: Use `--from-beginning` or restart consumer after producer runs

3. **Wrong topic name**
   - Check topic name: `db_live_events` (not `db_live_event` or similar)
   - List topics to verify: `kafka-topics.bat --list`

4. **Kafka broker not running**
   - Consumer can't connect
   - Check Kafka terminal is still open

5. **Consumer group offset already set**
   - Consumer already read messages and stored offset
   - Solution: Use `--from-beginning` or reset consumer group

---

## 7. Common Kafka Failure Scenarios

### Broker Started Before ZooKeeper

**Symptom:**
```
ERROR [KafkaServer id=0] Fatal error during KafkaServer startup. Prepare to shutdown (kafka.server.KafkaServer)
java.net.ConnectException: Connection refused
```

**Root cause:**
Kafka tried to connect to ZooKeeper, but ZooKeeper wasn't running yet.

**Fix:**
1. Stop Kafka broker (`Ctrl + C` in Kafka terminal)
2. Start ZooKeeper first (wait for "binding to port 2181")
3. Start Kafka broker second

**Prevention:**
Always use `kafka-entry-point.bat` which handles ordering automatically.

### Incorrect advertised.listeners

**Symptom:**
- Producer connects successfully
- Producer sends messages
- Consumer can't connect or shows timeout errors
- Messages appear to be sent but consumer sees nothing

**Root cause:**
`server.properties` has wrong `advertised.listeners` value. Producer connects to one address, but Kafka tells consumers to use a different address.

**Fix:**
Check `config/server.properties`:
```properties
advertised.listeners=PLAINTEXT://localhost:9092
```

Must match what producer uses: `localhost:9092`

**Verification:**
```powershell
# Producer should use: KAFKA_BROKER=localhost:9092
# Consumer uses: --bootstrap-server localhost:9092
# Both must match advertised.listeners
```

### Topic Exists But No Messages

**Symptom:**
- `kafka-topics.bat --list` shows `db_live_events`
- Consumer shows nothing (even with `--from-beginning`)
- Producer runs without errors

**Possible causes:**

1. **Producer found no new rows**
   - Check database: `SELECT * FROM livedb ORDER BY id DESC LIMIT 10;`
   - Check offset: `SELECT * FROM producer_offsets WHERE id = 1;`
   - If `last_id` matches highest `id` in `livedb`, producer has nothing to send

2. **Producer failed silently**
   - Check producer console output for errors
   - Verify `KAFKA_BROKER`, `KAFKA_CLIENT_ID`, `KAFKA_TOPIC` environment variables are set

3. **Messages sent to wrong topic**
   - Verify `KAFKA_TOPIC=db_live_events` in producer `.env` file
   - List topics to confirm topic exists

4. **Consumer reading from wrong topic**
   - Verify consumer command uses `--topic db_live_events`

### Timeout Errors in Consumer

**Symptom:**
```
[Consumer clientId=console-consumer-12345] Connection to node -1 (localhost/127.0.0.1:9092) could not be established. Broker may not be available.
```

**Root causes:**

1. **Kafka broker not running**
   - Check Kafka terminal is open
   - Restart Kafka if needed

2. **ZooKeeper not running**
   - Kafka broker may have shut down
   - Start ZooKeeper first, then Kafka

3. **Port conflict**
   - Another process using port 9092
   - Check: `netstat -ano | findstr :9092`

4. **Firewall blocking**
   - Windows Firewall blocking localhost connections
   - Usually not an issue for localhost, but check if other causes fail

**Fix:**
1. Verify ZooKeeper is running (port 2181)
2. Verify Kafka broker is running (port 9092)
3. Restart both in correct order if needed

---

## 8. Safe Kafka Reset Procedure (Local Only)

### ⚠️ WARNING: This Deletes All Kafka Data

This procedure is for **local development only**. It will delete all messages and reset Kafka to a clean state.

### Step 1: Stop Kafka and ZooKeeper (Correct Order)

**CRITICAL: Stop in reverse order of startup**

1. **Stop Kafka Broker first:**
   - Go to Kafka terminal window
   - Press `Ctrl + C`
   - Wait for "shut down completed" message
   - **Do NOT close terminal window directly** - this causes corruption

2. **Stop ZooKeeper second:**
   - Go to ZooKeeper terminal window
   - Press `Ctrl + C`
   - Wait for shutdown confirmation
   - **Do NOT close terminal window directly**

**Why order matters:**
- Kafka must unregister from ZooKeeper cleanly
- If ZooKeeper stops first, Kafka can't clean up
- This leaves stale state in ZooKeeper
- Next startup will see "ghost brokers" and fail

### Step 2: Delete Kafka Log Directories

**Find log directory location:**
Check `C:\Users\anmol\kafkatest\config\server.properties` for `log.dirs` value.

**Common locations:**
- `C:\Users\anmol\kafkatest\logs\kafka-logs`
- Or path specified in `server.properties`

**Delete logs:**
```powershell
# Navigate to Kafka installation
cd C:\Users\anmol\kafkatest

# Delete Kafka logs (adjust path if different)
Remove-Item -Recurse -Force logs\kafka-logs\*

# Verify deletion
dir logs\kafka-logs
```

**What gets deleted:**
- All topic data (all messages)
- Broker metadata
- Consumer offsets
- Topic configurations

### Step 3: Delete ZooKeeper Data Directory

**Find ZooKeeper data directory:**
Check `C:\Users\anmol\kafkatest\config\zookeeper.properties` for `dataDir` value.

**Common locations:**
- `C:\Users\anmol\kafkatest\logs\zookeeper`
- Or path specified in `zookeeper.properties`

**Delete ZooKeeper data:**
```powershell
# Navigate to Kafka installation
cd C:\Users\anmol\kafkatest

# Delete ZooKeeper data (adjust path if different)
Remove-Item -Recurse -Force logs\zookeeper\*

# Verify deletion
dir logs\zookeeper
```

**What gets deleted:**
- Broker registration records
- Controller state
- Topic metadata
- Cluster coordination data

### Step 4: Restart Kafka (Clean State)

After deletion, restart using normal procedure:

```powershell
cd kafka\server
.\kafka-entry-point.bat
```

**What happens after reset:**
- Kafka starts as a "new" cluster
- No topics exist (must be recreated)
- No messages exist
- No consumer offsets exist
- Producer offset in database is unchanged (still points to last processed ID)

### What Data Will Be Lost

**Lost (deleted from Kafka):**
- ✅ All Kafka messages
- ✅ All topic configurations
- ✅ All consumer group offsets
- ✅ Broker metadata

**NOT lost (still in database):**
- ❌ Database rows in `livedb` table
- ❌ Producer offset in `producer_offsets` table
- ❌ Your code and configuration files

**Important:** After reset, producer will re-send all rows where `id > last_id` from `producer_offsets` table. If you want to reprocess from the beginning, reset the `producer_offsets` table:

```sql
UPDATE producer_offsets SET last_id = 0, last_created_at = '1970-01-01' WHERE id = 1;
```

---

## 9. Kafka Debug Checklist

Use this checklist when messages don't appear or Kafka behaves unexpectedly.

### Step 1: Verify ZooKeeper is Running

**Check:**
- ZooKeeper terminal window is open
- Terminal shows "binding to port 0.0.0.0/0.0.0.0:2181"
- No error messages

**Test connection:**
```powershell
cd C:\Users\anmol\kafkatest
bin\windows\zookeeper-shell.bat localhost:2181
# Type: ls /
# Should show: [zookeeper, brokers, controller, ...]
# Type: quit
```

**If ZooKeeper is not running:**
- Start ZooKeeper first
- Wait 15 seconds for initialization
- Proceed to Step 2

### Step 2: Verify Kafka Broker is Running

**Check:**
- Kafka terminal window is open
- Terminal shows "started (kafka.server.KafkaServer)"
- No `NodeExistsException` errors
- No connection timeout errors

**Test connection:**
```powershell
cd C:\Users\anmol\kafkatest
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list
```

**Expected output:**
- `db_live_events`
- `__consumer_offsets` (internal topic)

**If Kafka is not running:**
- Check ZooKeeper is running first (Step 1)
- Start Kafka broker
- Wait 10 seconds for initialization
- If errors persist, see Section 8: Safe Kafka Reset Procedure

### Step 3: Verify Topic Exists

**List topics:**
```powershell
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list
```

**Check topic details:**
```powershell
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --describe --topic db_live_events
```

**Expected output:**
- Topic name: `db_live_events`
- PartitionCount: 1
- ReplicationFactor: 1

**If topic doesn't exist:**
```powershell
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic db_live_events --partitions 1 --replication-factor 1
```

### Step 4: Verify Producer Environment Variables

**Check producer `.env` file:**
```powershell
cd kafka\producer
cat .env
# Or on Windows:
type .env
```

**Required variables:**
- `KAFKA_BROKER=localhost:9092`
- `KAFKA_CLIENT_ID=<your-client-id>`
- `KAFKA_TOPIC=db_live_events`
- `DATABASE_URL=<your-postgresql-connection-string>`

**Verify values:**
- `KAFKA_BROKER` must match `advertised.listeners` in `server.properties`
- `KAFKA_TOPIC` must match topic name: `db_live_events`

### Step 5: Check Database for New Rows

**Query database:**
```sql
-- Check latest rows
SELECT * FROM livedb ORDER BY id DESC LIMIT 10;

-- Check producer offset
SELECT * FROM producer_offsets WHERE id = 1;

-- Check if there are new rows to process
SELECT COUNT(*) FROM livedb WHERE id > (SELECT last_id FROM producer_offsets WHERE id = 1);
```

**If no new rows:**
- Producer will exit immediately (this is normal)
- Insert test data into `livedb` table
- Run producer again

### Step 6: Run Producer and Check Output

**Run producer:**
```powershell
cd kafka\producer
node src/index.js
```

**Check for errors:**
- Connection errors → Check Kafka broker is running
- Database errors → Check `DATABASE_URL` and database connection
- Missing env vars → Check `.env` file exists and has all variables

**Expected successful output:**
- "Producer initialized"
- "Sent X events to Kafka"
- Clean exit (exit code 0)

### Step 7: Verify Messages in Kafka

**Start consumer with `--from-beginning`:**
```powershell
cd C:\Users\anmol\kafkatest
bin\windows\kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic db_live_events --from-beginning
```

**Expected:**
- JSON messages printed to console
- Messages match database rows
- No timeout errors

**If consumer shows nothing:**
- Check producer actually sent messages (Step 6)
- Verify topic name matches: `db_live_events`
- Try recreating topic (see Step 3)

### Step 8: Check Kafka Logs (If Issues Persist)

**Kafka broker logs:**
```powershell
cd C:\Users\anmol\kafkatest
# Logs are usually in logs/ directory
dir logs\server.log
# Or check the terminal where Kafka is running
```

**Look for:**
- `ERROR` messages
- `WARN` messages about connections
- `Exception` stack traces

**Common log errors:**
- `NodeExistsException` → ZooKeeper has stale state (reset needed)
- `Connection refused` → ZooKeeper not running
- `TimeoutException` → Network/configuration issue

### Step 9: Confirm Kafka is Not the Issue

**If all steps pass but messages still don't appear:**

1. **Producer issue:**
   - Check producer code logic
   - Verify `mapper.js` creates correct event format
   - Check `producer.js` error handling

2. **Database issue:**
   - Verify database connection works
   - Check `producer_offsets` table has correct data
   - Verify `livedb` table has rows

3. **Consumer issue:**
   - Verify consumer command syntax
   - Check if consumer group offset is set (use `--from-beginning`)
   - Try different consumer: `kafka-console-consumer.bat` with different flags

**Final verification:**
```powershell
# Get message count (approximate)
bin\windows\kafka-run-class.bat kafka.tools.GetOffsetShell --broker-list localhost:9092 --topic db_live_events --time -1
```

This shows the latest offset. If offset > 0, messages exist in Kafka.

---

## Quick Reference: Common Commands

### Startup
```powershell
cd kafka\server
.\kafka-entry-point.bat
```

### List Topics
```powershell
cd C:\Users\anmol\kafkatest
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list
```

### Create Topic
```powershell
bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --create --topic db_live_events --partitions 1 --replication-factor 1
```

### Run Producer
```powershell
cd kafka\producer
node src/index.js
```

### Consume Messages (New Only)
```powershell
cd C:\Users\anmol\kafkatest
bin\windows\kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic db_live_events
```

### Consume Messages (From Beginning)
```powershell
bin\windows\kafka-console-consumer.bat --bootstrap-server localhost:9092 --topic db_live_events --from-beginning
```

### Shutdown (Correct Order)
1. Kafka broker terminal: `Ctrl + C`
2. ZooKeeper terminal: `Ctrl + C`

---

## Important Reminders

- ✅ **Always start ZooKeeper before Kafka**
- ✅ **Always stop Kafka before ZooKeeper**
- ✅ **Use `Ctrl + C` to stop, never close terminal windows directly**
- ✅ **Kafka messages persist independently of database**
- ✅ **Producer runs once and exits (not a daemon)**
- ✅ **Use `--from-beginning` to see all messages in consumer**

---

**End of SOP**
