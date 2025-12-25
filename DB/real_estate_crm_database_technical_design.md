# Real Estate CRM – Database & Technical Design

## 1. Core Tables (SQL Schema)

### users
```sql
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(50) UNIQUE,
  email VARCHAR(255),
  role VARCHAR(20) CHECK (role IN ('broker','supervisor')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### brokers
```sql
CREATE TABLE brokers (
  broker_id INT PRIMARY KEY REFERENCES users(user_id),
  overall_rate FLOAT DEFAULT 0,
  response_speed_score FLOAT DEFAULT 0,
  closing_rate FLOAT DEFAULT 0,
  lost_requests_count INT DEFAULT 0,
  withdrawn_requests_count INT DEFAULT 0
);
```

### areas
```sql
CREATE TABLE areas (
  area_id SERIAL PRIMARY KEY,
  name VARCHAR(255)
);
```

### broker_areas
```sql
CREATE TABLE broker_areas (
  broker_id INT REFERENCES brokers(broker_id),
  area_id INT REFERENCES areas(area_id),
  PRIMARY KEY (broker_id, area_id)
);
```

### customers
```sql
CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### requests
```sql
CREATE TABLE requests (
  request_id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id),
  assigned_broker_id INT REFERENCES brokers(broker_id),
  area_id INT REFERENCES areas(area_id),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### request_status_history
```sql
CREATE TABLE request_status_history (
  id SERIAL PRIMARY KEY,
  request_id INT REFERENCES requests(request_id),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  changed_by VARCHAR(20),
  from_broker_id INT,
  to_broker_id INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### projects
```sql
CREATE TABLE projects (
  project_id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  area_id INT REFERENCES areas(area_id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### units
```sql
CREATE TABLE units (
  unit_id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(project_id),
  unit_type VARCHAR(50),
  size FLOAT,
  price FLOAT,
  status VARCHAR(20) CHECK (status IN ('available','reserved')),
  
  -- Additional fields from Excel import
  code VARCHAR(100) UNIQUE,
  unit_name VARCHAR(50),
  building VARCHAR(50),
  floor VARCHAR(20),
  garden_size FLOAT DEFAULT 0,
  roof_size FLOAT DEFAULT 0,
  down_payment_10_percent FLOAT,
  installment_4_years FLOAT,
  installment_5_years FLOAT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### reservations
```sql
CREATE TABLE reservations (
  reservation_id SERIAL PRIMARY KEY,
  request_id INT REFERENCES requests(request_id),
  unit_id INT REFERENCES units(unit_id),
  broker_id INT REFERENCES brokers(broker_id),
  total_unit_price FLOAT,
  customer_pay_amount FLOAT,
  broker_commission_amount FLOAT,
  reservation_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### payment_records
```sql
CREATE TABLE payment_records (
  payment_id SERIAL PRIMARY KEY,
  reservation_id INT REFERENCES reservations(reservation_id),
  paid_amount FLOAT,
  payment_date DATE,
  payment_method VARCHAR(50),
  recorded_by_broker_id INT REFERENCES brokers(broker_id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### conversations
```sql
CREATE TABLE conversations (
  conversation_id SERIAL PRIMARY KEY,
  related_request_id INT REFERENCES requests(request_id),
  actor_type VARCHAR(20) CHECK (actor_type IN ('customer','broker','ai')),
  actor_id INT,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 2. Indexes & Constraints

```sql
CREATE INDEX idx_requests_broker ON requests(assigned_broker_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_conversations_request ON conversations(related_request_id);
CREATE INDEX idx_payment_reservation ON payment_records(reservation_id);
```

Additional Constraints:
- One active reservation per request
- Unit cannot be reserved twice
- Broker can only access assigned requests

---

## 3. Request State Diagram (Textual)

```
[New]
  |
  v
[Contacted]
  |
  v
[Reserved]
  |
  v
[Paid]

[New] --> [Reassigned]
[Contacted] --> [Reassigned]
[Reassigned] --> [Contacted]

[Any State] --> [Lost]
```

---

## 4. Design Notes
- Requests are the main workflow driver
- Payments are logged, not processed
- Conversation history is fully auditable
- System is ready for future payment and WhatsApp integrations

