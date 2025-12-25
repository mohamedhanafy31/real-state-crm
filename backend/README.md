# Real Estate CRM Backend

NestJS backend API for the Real Estate CRM system, providing comprehensive management for brokers, customers, requests, properties, and transactions.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Broker/Supervisor)
- **User Management**: Create and manage brokers and supervisors, assign service areas
- **Customer & Request Management**: Track customer inquiries from initial contact to closing
- **Property Inventory**: Manage projects and units with detailed specifications and pricing
- **Request Lifecycle**: Automated broker assignment, status tracking, and SLA monitoring
- **Performance Metrics**: Track broker performance, response times, and closure rates

## Technology Stack

- **Framework**: NestJS 10.x
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: class-validator and class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (running via Docker or locally)
- npm or yarn

## Installation

```bash
# Install dependencies
npm install
```

## Database Setup

1. **Start PostgreSQL using Docker Compose** (from project root):
   ```bash
   cd ..
   docker-compose up -d db
   ```

2. **Run database initialization** (if not already done):
   ```bash
   docker exec -i real_estate_crm_db psql -U admin -d real_estate_crm < ../DB/init.sql
   ```

3. **Add password column for authentication**:
   ```bash
   docker exec -i real_estate_crm_db psql -U admin -d real_estate_crm < ../DB/add_password_column.sql
   ```

## Configuration

Create a `.env` file in the backend directory (or copy from `.env.example`):

```env
# Environment
NODE_ENV=development

# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=admin
DB_PASSWORD=password
DB_DATABASE=real_estate_crm

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRATION=7d

# SLA Configuration
SLA_CHECK_INTERVAL=3600000
SLA_RESPONSE_TIMEOUT_HOURS=48
```

## Running the Application

```bash
# Development mode with hot-reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The server will start on `http://localhost:3000`

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs

The Swagger interface provides interactive API documentation where you can test all endpoints.

## API Endpoints Overview

### Authentication (`/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/profile` - Get current user profile

### Users (`/users`)
- `POST /users` - Create user (supervisor only)
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `PATCH /users/:id/status` - Block/unblock user
- `POST /brokers/:id/areas` - Assign areas to broker
- `GET /brokers/:id/performance` - Get broker performance metrics

### Customers (`/customers`)
- `POST /customers` - Create customer
- `GET /customers` - Get all customers
- `GET /customers/:id` - Get customer details

### Requests (`/requests`)
- `POST /requests` - Create request
- `GET /requests` - Get all requests (with filters)
- `GET /requests/:id` - Get request details
- `PATCH /requests/:id` - Update request
- `POST /requests/:id/reassign` - Reassign request
- `GET /requests/:id/history` - Get status history

### Projects (`/projects`)
- `POST /projects` - Create project (supervisor only)
- `GET /projects` - Get all projects
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project

### Units (`/units`)
- `POST /projects/:projectId/units` - Create unit (supervisor only)
- `GET /units` - Get all units (with filters)
- `GET /units/available` - Get available units
- `GET /units/:id` - Get unit details
- `PATCH /units/:id` - Update unit
- `DELETE /units/:id` - Delete unit (supervisor only)

## Authentication

The API uses JWT Bearer tokens for authentication. To access protected endpoints:

1. Register or login to get an access token
2. Include the token in the `Authorization` header:
   ```
   Authorization: Bearer <your-token>
   ```

### Role-Based Access Control

- **Supervisor**: Full access to all endpoints
- **Broker**: Limited access, cannot create/delete users or projects

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure

```
backend/
├── src/
│   ├── auth/              # Authentication module
│   ├── users/             # User & broker management
│   ├── requests/          # Customer & request management
│   ├── projects/          # Project & unit management
│   ├── entities/          # TypeORM entities
│   ├── config/            # Configuration files
│   ├── app.module.ts      # Root module
│   └── main.ts            # Application entry point
├── test/                  # E2E tests
├── .env                   # Environment variables
├── package.json
└── tsconfig.json
```

## Development

### Adding a New Module

```bash
# Generate a new module
nest g module module-name
nest g controller module-name
nest g service module-name
```

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## Deployment

### Using Docker

A `Dockerfile` is provided for containerized deployment:

```bash
# Build image
docker build -t real-estate-crm-backend .

# Run container
docker run -p 3000:3000 --env-file .env real-estate-crm-backend
```

### Production Considerations

1. Change `JWT_SECRET` to a strong, random value
2. Set `NODE_ENV=production`
3. Enable HTTPS
4. Configure proper CORS origins
5. Set up logging and monitoring
6. Configure database connection pooling
7. Enable rate limiting

## Integration with AI Chatbot

The backend provides endpoints that the AI chatbot can use:

- Query available units: `GET /units?status=available&areaId=X`
- Create customer inquiries: `POST /customers` and `POST /requests`
- Log conversations: `POST /conversations`

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL is running: `docker ps`
- Check connection parameters in `.env`
- Verify database exists: `docker exec -it real_estate_crm_db psql -U admin -l`

### Port Already in Use

Change the `PORT` in `.env` to an available port (e.g., 3001).

### Module Not Found Errors

Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## License

MIT

## Support

For issues or questions, please refer to the project documentation or contact the development team.
