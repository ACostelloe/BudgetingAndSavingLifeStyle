# Auto-Update Configuration

## Setting Up Auto-Updates

The app uses `electron-updater` for automatic updates. Here's how to configure it:

### Option 1: GitHub Releases (Recommended)

1. **Update package.json**:
   ```json
   "build": {
     "publish": {
       "provider": "github",
       "owner": "your-github-username",
       "repo": "budgeting-app"
     }
   }
   ```

2. **Create GitHub Personal Access Token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create a token with `repo` scope
   - Set as environment variable: `export GH_TOKEN=your_token_here`

3. **Build and Publish**:
   ```bash
   npm run dist
   ```
   This will automatically create a GitHub release and upload the build.

### Option 2: Custom Update Server

1. Host your update server (e.g., AWS S3, your own server)
2. Update `package.json`:
   ```json
   "build": {
     "publish": {
       "provider": "generic",
       "url": "https://your-update-server.com/updates"
     }
   }
   ```

3. Your server should serve:
   - `latest.yml` (or `latest-mac.yml`, `latest-linux.yml`)
   - Update files (`.exe`, `.dmg`, `.AppImage`, etc.)

### Testing Updates Locally

1. Build version 1.0.0:
   ```bash
   npm run dist
   ```

2. Increment version in `package.json` to 1.0.1

3. Build again:
   ```bash
   npm run dist
   ```

4. Install version 1.0.0, then launch it - it should detect the update

### Update Flow

1. App checks for updates on startup (production only)
2. If update available, downloads in background
3. User sees notification when download completes
4. User clicks "Restart to Update"
5. App closes, installs update, and restarts

### Manual Update Check

Users can manually check for updates (if you add a menu item):
```javascript
window.electronAPI.checkUpdates();
```

## Update Channels

You can set up different update channels (stable, beta, etc.) by modifying the `channel` in `electron-updater` configuration.

