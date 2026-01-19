# Building an Executable with Auto-Updates

This guide explains how to build an executable program that automatically updates when you push new versions to GitHub.

## Quick Start

### 1. Build the Executable

```bash
# Install all dependencies
npm run install:all

# Build the application
npm run build

# Build the executable
npm run dist
```

This creates platform-specific installers:
- **Windows**: `.exe` installer in `dist-electron/`
- **macOS**: `.dmg` file in `dist-electron/`
- **Linux**: `.AppImage` in `dist-electron/`

### 2. Set Up Auto-Updates

The app is already configured to check GitHub Releases for updates. Here's how it works:

#### Automatic Updates Flow

1. **App checks for updates**:
   - On startup (production builds only)
   - Every 4 hours while running
   - When manually triggered

2. **Update detection**:
   - Compares current version with latest GitHub Release
   - Downloads update if newer version found

3. **Update installation**:
   - Downloads in background
   - Shows notification when ready
   - User clicks "Restart to Update"
   - App installs update and restarts

### 3. Creating a New Release

#### Method 1: Using GitHub Actions (Automatic)

1. **Update version** in `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Commit and push**:
   ```bash
   git add package.json
   git commit -m "Version 1.0.1"
   git push
   ```

3. **Create and push tag**:
   ```bash
   git tag -a v1.0.1 -m "Version 1.0.1"
   git push origin v1.0.1
   ```

4. **GitHub Actions automatically**:
   - Builds executables for all platforms
   - Creates a GitHub Release
   - Uploads executables to the release
   - App will detect and download updates automatically

#### Method 2: Manual Release

1. **Build locally**:
   ```bash
   npm run dist
   ```

2. **Create GitHub Release manually**:
   - Go to GitHub → Releases → Draft a new release
   - Tag: `v1.0.1`
   - Title: `Version 1.0.1`
   - Upload executables from `dist-electron/`

### 4. Testing Auto-Updates

1. **Install version 1.0.0**:
   ```bash
   npm run dist
   # Install the generated installer
   ```

2. **Update to version 1.0.1**:
   - Update `package.json` version
   - Build and publish: `npm run dist:publish`
   - Or create GitHub Release manually

3. **Launch the installed app**:
   - It should detect the update
   - Download and prompt to restart

## Configuration

### GitHub Repository

The app checks for updates at:
```
https://github.com/ACostelloe/BudgetingAndSavingLifeStyle/releases
```

Configured in `package.json`:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "ACostelloe",
      "repo": "BudgetingAndSavingLifeStyle"
    }
  }
}
```

### Update Frequency

Configured in `electron/main.js`:
- Checks on startup
- Checks every 4 hours
- Can be manually triggered

### Update Notification

The `UpdateNotification` component shows:
- Update available status
- Download progress
- "Restart to Update" button when ready

## Troubleshooting

### Updates Not Detected

1. **Check version number**: Must be higher than current version
2. **Check GitHub Release**: Must exist and be published (not draft)
3. **Check network**: App needs internet connection
4. **Check logs**: Look for auto-updater messages in console

### Build Fails

1. **Install dependencies**: `npm run install:all`
2. **Check Node version**: Requires Node.js 20+
3. **Check platform**: Build on target platform or use GitHub Actions

### Update Download Fails

1. **Check GitHub token**: If publishing, need `GH_TOKEN` environment variable
2. **Check release exists**: Verify release is published on GitHub
3. **Check file permissions**: Ensure release files are accessible

## Development vs Production

- **Development**: Auto-updates disabled (uses local dev servers)
- **Production**: Auto-updates enabled (checks GitHub Releases)

The app detects environment automatically using `app.isPackaged`.

## Version Numbering

Use semantic versioning:
- **MAJOR.MINOR.PATCH** (e.g., 1.0.1)
- **MAJOR**: Breaking changes
- **MINOR**: New features
- **PATCH**: Bug fixes

Tag format: `v1.0.1` (with 'v' prefix)

