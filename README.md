# Kafka + Flink Dashboard

Simple dashboard to display real-time updates from Kafka topics processed by Flink.

## Structure

```
livedb/
├── dashboard/
│   ├── index.html          # Main dashboard page
│   ├── css/
│   │   └── styles.css      # Styling for the dashboard
│   └── js/
│       └── app.js          # JavaScript for displaying messages (no logic/aggregation)
└── README.md
```

## Setup

1. Open `dashboard/index.html` in a web browser
2. Configure the connection endpoint in `dashboard/js/app.js` (WebSocket or SSE)

## Features

- Simple, clean UI
- Real-time message display
- Separate sections for each topic (Account Usage, Billing Records, Cost Data)
- All messages view
- No logic or aggregation - just displays messages as they arrive

## Next Steps

- Connect backend service to Kafka and forward messages via WebSocket/SSE
- Configure Kafka topics and Flink processing
