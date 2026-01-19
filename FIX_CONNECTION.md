# Fix Connection Issues

If you're getting connection errors, try these steps:

## Quick Fixes

1. **Hard Refresh Browser**
   - Windows: `Ctrl + Shift + R` or `Ctrl + F5`
   - This clears cached requests

2. **Check Server Status**
   - Backend should be on: http://localhost:5000
   - Frontend should be on: http://localhost:3000
   - Open these URLs directly to verify

3. **Restart Everything**
   ```powershell
   # Stop all Node processes
   Get-Process -Name node | Stop-Process -Force
   
   # Start backend (in server directory)
   cd server
   npm run dev
   
   # Start frontend (in client directory, new terminal)
   cd client
   npm run dev
   ```

4. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for errors in Console tab
   - Check Network tab to see which requests are failing

5. **Verify Ports**
   - Make sure ports 5000 and 3000 aren't used by other apps
   - Check firewall settings

## Common Issues

- **ECONNREFUSED**: Backend server not running
- **404 errors**: Route not found (check server logs)
- **CORS errors**: Backend CORS not configured (should be fine)
- **Proxy errors**: Frontend can't reach backend

## Test Server Manually

Open these URLs in your browser:
- http://localhost:5000/api/health (should return `{"status":"ok"}`)
- http://localhost:5000/api/gamification/progress (should return progress data)

If these work, the backend is fine and it's a frontend/proxy issue.

