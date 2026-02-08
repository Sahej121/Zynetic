Telemetry Ingestion Engine

This project is a high-throughput telemetry ingestion service built using NestJS and PostgreSQL. It is designed to reliably handle millions of telemetry events per day while preserving transactional correctness and enabling fast analytical queries.

The system models a realistic fleet telemetry scenario where energy is observed from two independent sources: grid-side smart meters and vehicle-side chargers. The core focus of the implementation is correctness under scale, not surface-level features.

Architecture Overview

The service ingests telemetry from two independent streams every 60 seconds per device:

Smart meters reporting AC energy consumption from the grid

Vehicles reporting DC energy delivered to batteries

The system is intentionally split into three logical layers.

The ingestion layer exposes a single polymorphic endpoint. Incoming payloads are validated at runtime and classified as either meter or vehicle telemetry without relying on separate endpoints.

The persistence layer uses a transactional dual-write approach. Every telemetry event is written to an immutable historical store and simultaneously updates a live operational state.

The analytics layer performs time-bounded aggregations using indexed queries. Analytics are designed to avoid scanning historical tables, even as data volume grows.

Data Strategy: Hot and Cold Separation

To remain performant at large scale, telemetry is stored using two different access patterns.

Cold Storage (Historical)

Historical telemetry is stored in append-only tables:

meter_readings_history

vehicle_readings_history

Every heartbeat is inserted as a new row. This creates a complete audit trail suitable for reporting, debugging, and long-term analysis. No historical rows are ever updated or deleted.

Indexes are applied to time and device dimensions so that recent windows can be queried efficiently.

Hot Storage (Operational)

The latest known state for each device is stored separately in:

meter_latest_state

vehicle_latest_state

These tables always contain exactly one row per device. Updates are performed using database-level UPSERTs, ensuring atomicity and constant-time access for dashboards or monitoring systems.

This separation ensures that real-time reads never touch large historical tables.

Meter and Vehicle Correlation Assumption

The challenge specification does not define how meters map to vehicles. Rather than inventing an artificial relationship or introducing unnecessary joins, this implementation makes an explicit and documented assumption.

For analytics, AC energy is aggregated at the fleet level, while DC energy is aggregated at the vehicle level.

In practice, this means:

Total DC energy is computed from the specified vehicle over the last 24 hours

Total AC energy is computed from all meter readings over the same 24-hour window

Efficiency is calculated as DC divided by AC

This approach keeps analytics queries simple, avoids high-cardinality joins, and reflects how fleet-level billing and loss analysis is often performed in early diagnostic stages.

With more time or additional requirements, this assumption could be replaced by an explicit mapping table or service.

Performance and Scale Justification
Expected Ingestion Volume

Assuming 10,000 devices reporting two telemetry streams every 60 seconds:

20,000 events per minute

1.2 million events per hour

28.8 million events per day

The system is designed with this order of magnitude in mind.

Why Writes Scale

Historical tables use append-only inserts, which are efficient for PostgreSQL and minimize locking and index churn.

Live state tables are updated using atomic UPSERTs, ensuring consistency without requiring read-modify-write logic in application code.

Both writes occur inside a single database transaction, guaranteeing that historical and live state never diverge.

Why Reads Remain Fast

All analytical queries are time-bounded and operate on indexed columns.

PostgreSQL may choose sequential scans for very small datasets, which is expected and optimal. As data volume grows, the query planner automatically shifts to index or bitmap scans. Required indexes are present to ensure this transition happens naturally at production scale.

API Overview
Ingest Telemetry

POST /v1/telemetry/ingest

The endpoint accepts both meter and vehicle telemetry. Payload type is inferred at runtime.

Meter example

{
  "meterId": "M123",
  "kwhConsumedAc": 45.2,
  "voltage": 230.1,
  "timestamp": "2024-02-08T12:00:00Z"
}


Vehicle example

{
  "vehicleId": "V456",
  "soc": 82.5,
  "kwhDeliveredDc": 38.1,
  "batteryTemp": 32.2,
  "timestamp": "2024-02-08T12:00:00Z"
}

Performance Analytics

GET /v1/analytics/performance/:vehicleId

Returns a 24-hour summary of energy usage and battery health.

{
  "vehicleId": "V456",
  "totalAcKwh": 45.20,
  "totalDcKwh": 38.10,
  "efficiency": 0.8429,
  "avgBatteryTemp": 32.20
}


Note: With synthetic or uneven test data, efficiency may exceed 100%. In production scenarios, continuous AC ingestion naturally normalizes this ratio.

Getting Started

The entire system is containerized for reproducibility.

Prerequisites:

Docker

Docker Compose

Start the service using:

docker compose up --build


Once running, the API is available at:

http://localhost:3000

Development Decisions and Trade-offs

Telemetry values are stored using decimal types rather than floating point to avoid precision drift during aggregation.

Default PostgreSQL transaction isolation is used, which is sufficient for append-only writes and atomic UPSERT patterns.

DTO validation is strict. Only whitelisted fields are accepted, and malformed payloads are rejected early to protect the ingestion pipeline.

The system favors clarity and correctness over premature complexity. Areas such as meter-vehicle mapping, roll-up tables, or alerting are intentionally left as future extensions rather than assumptions baked into the core.

Optional Follow-Up

If extended beyond a take-home exercise, the next step would be validating this design against a small, anonymized slice of real telemetry data. Real data often reveals timing skew and sparsity patterns that synthetic inputs cannot fully capture.

This is not required for evaluation but reflects how the system would be hardened for production use.

Final note (important correction I made)

I removed the earlier contradiction where the README said both:

fleet-level AC aggregation

and meter_id == vehicle_id

Those two statements cannot both be true.
The updated version is internally consistent and defensible.