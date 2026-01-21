# Seed Data Folder
Update the seed file when you want to increase rows/data
Place your data file here. Supported formats:

## CSV Format

**Option 1: Without ID column (recommended)**
```csv
org,amount,region
Acme Corp,1500.50,North
TechStart Inc,2300.75,South
Global Systems,890.25,East
```

**Option 2: With ID column**
```csv
id,org,amount,region
1,Acme Corp,1500.50,North
2,TechStart Inc,2300.75,South
3,Global Systems,890.25,East
```

## JSON Format

```json
[
  {"id": null, "org": "Acme Corp", "amount": 1500.50, "region": "North"},
  {"id": null, "org": "TechStart Inc", "amount": 2300.75, "region": "South"},
  {"id": null, "org": "Global Systems", "amount": 890.25, "region": "East"}
]
```

## Notes

- The script will automatically find the first `.csv` or `.json` file in this folder
- If ID is `null` or not provided, the database will auto-increment
- The script will cycle through all rows (2 rows per burst, every 60 seconds)
- After reaching the end, it will loop back to the beginning
