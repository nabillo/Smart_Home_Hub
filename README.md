# Smart Home Management System - Phase 1 (MVP)

This is the Phase 1 MVP implementation of the Smart Home Management System, featuring both desktop and web modes with user authentication, profile management, and admin capabilities.

## Features

- User authentication with JWT tokens
- Role-based access control
- User management (admin only)
- Profile management (admin only)
- Secure password handling
- Audit logging
- Cross-platform compatibility

## Technology Stack

- **Backend**: Node.js with Express
- **Frontend**: React
- **Database**: PostgreSQL
- **Authentication**: JWT with HS512 signing
- **Security**: bcrypt for password hashing, AES-256-GCM for sensitive data encryption

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- PostgreSQL (v12+)

### Environment Setup

1. Clone the repository
2. Create a `.env` file based on the `.env.example` template
3. Configure your PostgreSQL connection details in the `.env` file

### Database Setup

1. Create a PostgreSQL database for the application
2. Update the database connection details in the `.env` file

### Installation

1. Install server dependencies:
   ```
   npm install
   ```

2. Install client dependencies:
   ```
   cd client
   npm install
   cd ..
   ```

3. Initialize the database and create an admin user:
   ```
   npm run setup -- --create-admin
   ```

### Running the Application

#### Development Mode

1. Start the server:
   ```
   npm run dev
   ```

2. In a separate terminal, start the client:
   ```
   npm run client
   ```

3. Access the application at `http://localhost:3000`

#### Production Mode

1. Build the client:
   ```
   npm run build
   ```

2. Start the server:
   ```
   npm start
   ```

3. Access the application at `http://localhost:5000`

## Default Credentials

After running the setup script, you can log in with:

- Username: `admin`
- Password: `AdminPassword123!`

**Important**: Change this password after the first login!

## API Documentation

The API follows RESTful conventions and includes endpoints for:

- Authentication (login/logout)
- User management (CRUD operations)
- Profile management (CRUD operations)

For detailed API documentation, refer to the OpenAPI specification.

## Security Features

- JWT tokens with HS512 signing
- Password requirements: Minimum 12 characters, 1 uppercase, 1 symbol
- Sensitive data encryption using AES-256-GCM
- Comprehensive audit logging
- HTTPS enforcement in production

## License

This project is proprietary and confidential.
