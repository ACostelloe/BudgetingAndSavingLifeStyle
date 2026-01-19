# Building and Releasing Executables

## Prerequisites

1. Install all dependencies:
```bash
npm run install:all
```

2. Build the application:
```bash
npm run build
```

## Creating a Release

### Option 1: Automatic Release via GitHub Actions (Recommended)

1. **Update version in package.json**:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Commit and push changes**:
   ```bash
   git add .
   git commit -m "Version 1.0.1 - Description of changes"
   git push
   ```

3. **Create and push a version tag**:
   ```bash
   git tag -a v1.0.1 -m "Version 1.0.1"
   git push origin v1.0.1
   ```

4. **GitHub Actions will automatically**:
   - Build executables for Windows, macOS, and Linux
   - Create a GitHub Release
   - Upload the executables to the release
   - The app will automatically check for updates from GitHub Releases

### Option 2: Manual Build and Release

#### Windows
```bash
npm run dist
```
Creates installer in `dist-electron/` directory.

#### macOS
```bash
npm run dist
```
Creates DMG file in `dist-electron/` directory.

#### Linux
```bash
npm run dist
```
Creates AppImage in `dist-electron/` directory.

#### Publish to GitHub Releases
```bash
npm run dist:publish
```
Requires `GH_TOKEN` environment variable with GitHub Personal Access Token.

## Auto-Update Configuration

The app automatically checks for updates:
- On startup (production builds only)
- Every 4 hours while running
- When user manually checks (via menu if implemented)

### How It Works

1. App checks GitHub Releases for newer versions
2. If update found, downloads in background
3. Shows notification when download completes
4. User clicks "Restart to Update"
5. App closes, installs update, and restarts

### Testing Updates Locally

1. Build version 1.0.0:
   ```bash
   npm run dist
   ```

2. Install and run the app

3. Update version in `package.json` to 1.0.1

4. Build and publish:
   ```bash
   npm run dist:publish
   ```

5. The installed app should detect the update

## Version Numbering

Follow semantic versioning:
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backwards compatible
- **PATCH** (0.0.1): Bug fixes

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Update CHANGELOG.md (if exists)
- [ ] Test the build locally
- [ ] Commit changes
- [ ] Create and push version tag
- [ ] Verify GitHub Release was created
- [ ] Test auto-update in installed app

