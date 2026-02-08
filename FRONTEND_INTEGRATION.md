# Frontend Integration Guide

This backend is designed to be consumed by any frontend application (React, Vue, Angular, Mobile, etc.).

## 1. Base URL
- **Local Development:** `http://localhost:3000`
- **Production (Render):** `https://zynetic-api.onrender.com` (or your specific Render URL)

## 2. CORS (Cross-Origin Resource Sharing)
CORS is **enabled** on the backend, allowing requests from any origin (`*`). This means your frontend running on `localhost:5173` (Vite) or `localhost:3001` can verify communicate with the API without issues.

---

## 3. Usage Examples (JavaScript/TypeScript)

### A. Ingest Telemetry (POST)
Send this when the vehicle or meter "ticks".

```javascript
const INGEST_API = 'https://zynetic-api.onrender.com/v1/telemetry/ingest';

async function sendTelemetry(data) {
  try {
    const response = await fetch(INGEST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Ingest failed');
    const result = await response.json();
    console.log('Ingested:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example Calls:
sendTelemetry({
  meterId: "M-101",
  kwhConsumedAc: 50.5,
  voltage: 230.1,
  timestamp: new Date().toISOString()
});

sendTelemetry({
  vehicleId: "V-101",
  soc: 85.0,
  kwhDeliveredDc: 45.0,
  batteryTemp: 32.5,
  timestamp: new Date().toISOString()
});
```

### B. Get Analytics (GET)
Call this to display the dashboard.

```javascript
const ANALYTICS_API = 'https://zynetic-api.onrender.com/v1/analytics/performance';

async function getPerformance(vehicleId) {
  try {
    const response = await fetch(`${ANALYTICS_API}/${vehicleId}`);
    
    if (!response.ok) throw new Error('Analytics failed');
    const data = await response.json();
    
    // Update your UI with this data
    console.log('Efficiency:', data.efficiency + '%');
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example Call:
getPerformance("V-101");
```

## 4. Error Handling
- **400 Bad Request:** Payload validation failed (check your data types!).
- **500 Internal Server Error:** Something went wrong on the server.
