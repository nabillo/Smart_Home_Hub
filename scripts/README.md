# Utility Scripts

This directory contains utility scripts for the Smart Home Management API.

## Available Scripts

### create-admin.js

Creates an admin user in the database if one doesn't already exist.

**Usage:**

```bash
# Using default credentials (admin/admin123)
node scripts/create-admin.js

# Using custom credentials from environment variables
ADMIN_LOGIN=superadmin ADMIN_PASSWORD=secure123 node scripts/create-admin.js
```

You can also set the credentials in your `.env` file:

```
ADMIN_LOGIN=superadmin
ADMIN_PASSWORD=secure123
```

## Adding New Scripts

When adding new utility scripts:

1. Place the script in this directory
2. Update this README with usage instructions
3. Make sure to handle database connections properly (connect and disconnect)
4. Add appropriate error handling and logging
