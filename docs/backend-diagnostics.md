# Backend Diagnostics Playbook

## Overview
The backend now boots a lightweight `SystemProbe` that watches for fatal shutdowns, console command exits, and queue lifecycle hooks. Traffic is wrapped by `RequestDiagnosticsMiddleware`, which assigns an `X-Request-Id` to every call, measures runtime, and records anomalies (slow requests, uncaught exceptions). All diagnostic output is written to the dedicated `probe` log channel.

## Log Channels
- `storage/logs/laravel.log`: application errors surfaced through Laravel's default stack.
- `storage/logs/probe.log`: lifecycle checkpoints emitted by `SystemProbe` and `RequestDiagnosticsMiddleware`.
  - `request.start` / `request.finish`: request envelope, duration, memory usage.
  - `request.slow`: emitted when a request exceeds `PROBE_SLOW_REQUEST_THRESHOLD_MS` (default 1500 ms).
  - `fatal.shutdown`: triggered by PHP fatal/shutdown errors, including memory usage and file/line context.
  - `command.*`, `queue.job.*`: console and queue events for correlating background activity.

## Environment Flags
- `PROBE_SLOW_REQUEST_THRESHOLD_MS`: override the slow request threshold (milliseconds).
- `LOG_PROBE_LEVEL`: control verbosity (`debug`, `info`, etc.).
- `LOG_PROBE_DAYS`: retention window for probe logs (default 30 days).

## Operational Checklist
- Tail `probe.log` alongside `laravel.log` when diagnosing sudden process exits.
- Ensure a process supervisor (e.g., systemd, Supervisor, PM2) restarts `php artisan serve` during development. For production, prefer PHP-FPM behind Nginx/Apache; the probe logs remain valid.
- Forward `probe` logs to your centralized logging stack (e.g., ELK, Loki) for automated alerting on `fatal.shutdown` or `request.slow` spikes.
- Correlate requests across services by propagating the `X-Request-Id` header from clients and honoring it within downstream systems.

## Next Steps
- Add health and readiness probes that assert database/cache connectivity, emitting probe log entries when a dependency degrades.
- Instrument metrics (Prometheus, StatsD) off the same middleware hooks to gain quantitative dashboards on latency and error rates.
- Schedule periodic review of `probe.log` to tune thresholds and discover recurring slow endpoints before they escalate in production.


