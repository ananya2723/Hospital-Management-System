# Environment Variables & Configuration

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `8080` | Edge API Gateway listening port |
| `JWT_SECRET` | `beahms-super-secret-key-32bytes-minimum-length-2026` | 256-bit HMAC secret key for access token signing |
| `HMS_DATA_KEY` | `beahms-medical-data-secret-key-32b` | 256-bit AES symmetric key for clinical EHR field encryption (diagnosis, Rx) |
| `DB_HOST` | `localhost` (in Docker: `postgres`) | Hostname of PostgreSQL database instance |
| `DB_PASSWORD` | `hms_dev_pw` | PostgreSQL password for user `hms` |
| `REDIS_HOST` | `localhost` (in Docker: `redis`) | Redis host for caching doctor directories and rate limiting |
| `RABBITMQ_HOST` | `localhost` (in Docker: `rabbitmq`) | RabbitMQ broker host for AMQP topic exchange `hms.events` |
| `MAIL_HOST` | `localhost` (in Docker: `mailpit`) | Mailpit SMTP host (port 1025) |
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Backend Gateway URL consumed by React SPA |
