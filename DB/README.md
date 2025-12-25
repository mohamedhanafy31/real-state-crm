# Real Estate CRM Database Schema

This document explains the database schema for the Real Estate CRM system.

## Overview

The database is built on **PostgreSQL** and manages the complete lifecycle of real estate transactions, from customer inquiries to final payments. It supports:

- User and broker management
- Customer request tracking
- Property inventory (projects and units)
- Reservations and payments
- Conversation history (AI chatbot integration)

---

## Core Tables

### 1. Users & Authentication

#### `users`
Stores all system users (brokers and supervisors).

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | SERIAL | Primary key |
| `name` | VARCHAR(255) | User's full name |
| `phone` | VARCHAR(50) | Unique phone number |
| `email` | VARCHAR(255) | Email address |
| `role` | VARCHAR(20) | Either 'broker' or 'supervisor' |
| `is_active` | BOOLEAN | Account status (default: true) |
| `created_at` | TIMESTAMP | Account creation time |

#### `brokers`
Extended profile for users with the 'broker' role.

| Column | Type | Description |
|--------|------|-------------|
| `broker_id` | INT | FK to users(user_id) |
| `overall_rate` | FLOAT | Average performance rating |
| `response_speed_score` | FLOAT | How quickly broker responds |
| `closing_rate` | FLOAT | Success rate in closing deals |
| `lost_requests_count` | INT | Number of lost opportunities |
| `withdrawn_requests_count` | INT | Requests broker withdrew from |

#### `areas`
Geographic areas where properties are located.

| Column | Type | Description |
|--------|------|-------------|
| `area_id` | SERIAL | Primary key |
| `name` | VARCHAR(255) | Area name (e.g., "الرحاب", "التجمع الخامس") |

#### `broker_areas`
Junction table linking brokers to their service areas.

| Column | Type | Description |
|--------|------|-------------|
| `broker_id` | INT | FK to brokers |
| `area_id` | INT | FK to areas |

---

### 2. Customers & Requests

#### `customers`
Stores customer information.

| Column | Type | Description |
|--------|------|-------------|
| `customer_id` | SERIAL | Primary key |
| `name` | VARCHAR(255) | Customer name |
| `phone` | VARCHAR(50) | Contact phone |
| `created_at` | TIMESTAMP | First contact time |

#### `requests`
The main workflow table - tracks customer inquiries and their lifecycle.

| Column | Type | Description |
|--------|------|-------------|
| `request_id` | SERIAL | Primary key |
| `customer_id` | INT | FK to customers |
| `assigned_broker_id` | INT | FK to brokers (who handles this) |
| `area_id` | INT | FK to areas (requested location) |
| `status` | VARCHAR(50) | Current state (e.g., 'new', 'contacted', 'reserved') |
| `created_at` | TIMESTAMP | Request creation time |
| `updated_at` | TIMESTAMP | Last modification time |

**Status Flow**: `new` → `contacted` → `reserved` → `paid` (or `lost`/`reassigned`)

#### `request_status_history`
Audit log for all status changes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `request_id` | INT | FK to requests |
| `old_status` | VARCHAR(50) | Previous status |
| `new_status` | VARCHAR(50) | New status |
| `changed_by` | VARCHAR(20) | Who made the change |
| `from_broker_id` | INT | Previous broker (if reassigned) |
| `to_broker_id` | INT | New broker (if reassigned) |
| `created_at` | TIMESTAMP | Change timestamp |

---

### 3. Property Inventory

#### `projects`
Real estate development projects.

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | SERIAL | Primary key |
| `name` | VARCHAR(255) | Project name |
| `area_id` | INT | FK to areas |
| `is_active` | BOOLEAN | Is project still selling? |
| `created_at` | TIMESTAMP | Project added to system |

#### `units`
Individual property units within projects.

| Column | Type | Description |
|--------|------|-------------|
| `unit_id` | SERIAL | Primary key |
| `project_id` | INT | FK to projects |
| `unit_type` | VARCHAR(50) | Type (e.g., 'شقة', 'فيلا') |
| `size` | FLOAT | Total area (sqm) |
| `price` | FLOAT | Total price |
| `status` | VARCHAR(20) | 'available' or 'reserved' |
| `code` | VARCHAR(100) | Unique unit identifier |
| `unit_name` | VARCHAR(50) | Unit reference |
| `building` | VARCHAR(50) | Building number |
| `floor` | VARCHAR(20) | Floor level |
| `garden_size` | FLOAT | Garden area (if applicable) |
| `roof_size` | FLOAT | Rooftop area (if applicable) |
| `down_payment_10_percent` | FLOAT | 10% down payment amount |
| `installment_4_years` | FLOAT | Monthly payment for 4-year plan |
| `installment_5_years` | FLOAT | Monthly payment for 5-year plan |
| `created_at` | TIMESTAMP | Unit added to inventory |

---

### 4. Sales & Payments

#### `reservations`
Links customers, units, and brokers when a deal is made.

| Column | Type | Description |
|--------|------|-------------|
| `reservation_id` | SERIAL | Primary key |
| `request_id` | INT | FK to requests |
| `unit_id` | INT | FK to units |
| `broker_id` | INT | FK to brokers (who closed the deal) |
| `total_unit_price` | FLOAT | Final agreed price |
| `customer_pay_amount` | FLOAT | Amount customer pays |
| `broker_commission_amount` | FLOAT | Broker's commission |
| `reservation_status` | VARCHAR(20) | Reservation state |
| `created_at` | TIMESTAMP | Reservation date |

#### `payment_records`
Tracks all payments made by customers.

| Column | Type | Description |
|--------|------|-------------|
| `payment_id` | SERIAL | Primary key |
| `reservation_id` | INT | FK to reservations |
| `paid_amount` | FLOAT | Payment amount |
| `payment_date` | DATE | When payment was made |
| `payment_method` | VARCHAR(50) | How they paid (cash, bank transfer, etc.) |
| `recorded_by_broker_id` | INT | FK to brokers (who recorded it) |
| `notes` | TEXT | Additional payment notes |
| `created_at` | TIMESTAMP | Record creation time |

---

### 5. Communication

#### `conversations`
Stores all messages (customer, broker, AI chatbot).

| Column | Type | Description |
|--------|------|-------------|
| `conversation_id` | SERIAL | Primary key |
| `related_request_id` | INT | FK to requests (which inquiry is this about) |
| `actor_type` | VARCHAR(20) | 'customer', 'broker', or 'ai' |
| `actor_id` | INT | ID of the actor (customer_id, user_id, etc.) |
| `message` | TEXT | Message content |
| `created_at` | TIMESTAMP | Message timestamp |

> **Note**: The AI chatbot also maintains its own vector-based conversation store (see `ai/customer_chatbot`) for RAG functionality.

---

## Performance Indexes

The following indexes are created for query optimization:

- `idx_requests_broker` - Fast lookup of requests by broker
- `idx_requests_status` - Filter requests by status
- `idx_units_status` - Find available/reserved units quickly
- `idx_conversations_request` - Retrieve conversation threads
- `idx_payment_reservation` - Payment history per reservation

---

## Relationships Diagram

```
users (1) ←→ (1) brokers
brokers (1) ←→ (M) broker_areas ←→ (M) areas
customers (1) ←→ (M) requests
requests (1) ←→ (1) reservations ←→ (1) units
units (M) ←→ (1) projects ←→ (1) areas
reservations (1) ←→ (M) payment_records
requests (1) ←→ (M) conversations
requests (1) ←→ (M) request_status_history
```

---

## Usage Notes

1. **Initialization**: Run `init.sql` to create all tables and indexes.
2. **Data Import**: Use `import_units.py` to bulk-import units from Excel.
3. **Migrations**: See `migrate_units.sql` for schema updates.
4. **Inspection**: Run `inspect_db.sh` to view current database state.

---

## Integration Points

- **AI Chatbot**: Reads from `customers`, `requests`, `units`, `projects` to provide intelligent responses.
- **CRM Frontend**: CRUD operations on all tables for broker workflow management.
- **Analytics**: Status history and payment records enable reporting and KPIs.
