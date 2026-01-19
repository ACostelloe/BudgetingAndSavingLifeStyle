# How to Start the Application

## Quick Start

1. **Install all dependencies** (first time only):
   ```bash
   npm run install:all
   ```

2. **Start the application**:
   ```bash
   npm run dev
   ```

This will start:
- Backend server on `http://localhost:5000`
- Frontend dev server on `http://localhost:3000`
- Open your browser to `http://localhost:3000`

## Important Notes

### Backend Server Must Be Running

The frontend makes API calls to the backend server. **Make sure the backend is running** before using the app.

You'll know the backend is running when you see:
```
Server running on http://localhost:5000
Database initialized at: [path]
```

### If You Get 500 Errors

1. **Check if backend is running**: Look for the server console output
2. **Check server logs**: Look for error messages in the server console
3. **Verify database**: The database file should be created automatically
4. **Restart servers**: Stop both servers (Ctrl+C) and restart with `npm run dev`

### Starting Electron App

To run as an Electron desktop app:

```bash
npm run dev:electron
```

This will:
1. Start the backend server
2. Start the frontend dev server
3. Wait for both to be ready
4. Launch the Electron window

## Troubleshooting

### Port Already in Use

If you see "Port 5000 is already in use":
- Stop any other processes using port 5000
- Or change the PORT in `server/src/index.ts`

### Database Errors

If you see database errors:
- Check file permissions
- Delete `budgeting.db` to recreate it
- Ensure the directory is writable

### Dependencies Issues

If you see module not found errors:
```bash
npm run install:all
```

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more help.

