# Troubleshooting Guide

## 500 Internal Server Error

If you're getting 500 errors when trying to fetch transactions or categories:

### 1. Check if the backend server is running

The backend server should be running on port 5000. Check:

```bash
# Windows PowerShell
cd server
npm run dev

# Or check if port 5000 is in use
netstat -ano | findstr :5000
```

### 2. Check server logs

Look for error messages in the server console. Common issues:

- **Database initialization errors**: Check if the database file can be created
- **Missing dependencies**: Run `npm run install:all`
- **Port already in use**: Change PORT in server/src/index.ts or kill the process using port 5000

### 3. Database Path Issues

The database is stored at:
- **Development**: `./budgeting.db` (in project root)
- **Production**: Platform-specific user data directory

If you see database errors:
1. Check file permissions
2. Ensure the directory exists
3. Try deleting `budgeting.db` to recreate it

### 4. Common Fixes

**Clear and reinstall dependencies:**
```bash
# Delete node_modules
rm -rf node_modules server/node_modules client/node_modules

# Reinstall
npm run install:all
```

**Reset the database:**
```bash
# Delete the database file
rm budgeting.db

# Restart the server (it will recreate the database)
```

**Check for TypeScript errors:**
```bash
cd server
npm run build
```

### 5. Development vs Production

- **Development**: Frontend proxy forwards `/api/*` to `http://localhost:5000`
- **Production**: Frontend makes direct requests to `http://localhost:5000/api`

Make sure the backend server is running before starting the frontend.

### 6. Network Issues

If requests are failing:
- Check firewall settings
- Ensure CORS is enabled (it should be by default)
- Verify the API base URL in `client/src/api/client.ts`

## Still Having Issues?

1. Check the browser console for detailed error messages
2. Check the server console for backend errors
3. Verify all dependencies are installed: `npm run install:all`
4. Try restarting both frontend and backend servers

