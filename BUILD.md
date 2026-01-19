# Building the Executable App

## Prerequisites

1. Install all dependencies:
```bash
npm run install:all
```

2. Build the client and server:
```bash
npm run build
```

## Creating Executables

### Windows
```bash
npm run dist
```

This will create a Windows installer in `dist-electron/` directory.

### macOS
```bash
npm run dist
```

This will create a DMG file for macOS.

### Linux
```bash
npm run dist
```

This will create an AppImage for Linux.

## Development Mode

To run in development mode with hot reload:
```bash
npm run dev
```

This will:
1. Start the backend server on port 5000
2. Start the frontend dev server on port 3000
3. Launch Electron window

## Auto-Updates

The app includes auto-update functionality using `electron-updater`. 

### Setting up Auto-Updates

1. **GitHub Releases** (recommended):
   - Update `package.json` build.publish section with your GitHub repo
   - Create a GitHub Personal Access Token with repo permissions
   - Set it as `GH_TOKEN` environment variable
   - Releases will be automatically published

2. **Custom Server**:
   - Configure your own update server
   - Update the publish configuration in `package.json`

### Testing Auto-Updates

1. Build the app: `npm run dist`
2. Increment version in `package.json`
3. Build again: `npm run dist`
4. The app will check for updates on startup

## Data Persistence

The app stores data in:
- **Windows**: `%APPDATA%/BudgetLife/budgeting.db`
- **macOS**: `~/Library/Application Support/BudgetLife/budgeting.db`
- **Linux**: `~/.config/BudgetLife/budgeting.db`

Data persists across app updates and restarts.

## Troubleshooting

- **Build fails**: Make sure all dependencies are installed (`npm run install:all`)
- **App won't start**: Check that both client and server are built (`npm run build`)
- **Database not found**: The database is created automatically on first run
- **Updates not working**: Ensure you've configured the publish settings in `package.json`

