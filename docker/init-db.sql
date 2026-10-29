-- Database initialization script for PostgreSQL 16
-- Creates all isolated microservice databases
CREATE DATABASE auth_db;
CREATE DATABASE patient_db;
CREATE DATABASE doctor_db;
CREATE DATABASE appointment_db;
CREATE DATABASE record_db;
CREATE DATABASE billing_db;
CREATE DATABASE reporting_db;
CREATE DATABASE notification_db;

-- Grant permissions to dev user
GRANT ALL PRIVILEGES ON DATABASE auth_db TO hms;
GRANT ALL PRIVILEGES ON DATABASE patient_db TO hms;
GRANT ALL PRIVILEGES ON DATABASE doctor_db TO hms;
GRANT ALL PRIVILEGES ON DATABASE appointment_db TO hms;
GRANT ALL PRIVILEGES ON DATABASE record_db TO hms;
GRANT ALL PRIVILEGES ON DATABASE billing_db TO hms;
GRANT ALL PRIVILEGES ON DATABASE reporting_db TO hms;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO hms;
