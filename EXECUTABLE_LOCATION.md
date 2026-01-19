# Executable File Locations

## Output Directory

All executables are built in the **`dist-electron/`** directory in your project root.

**Full Path:**
```
C:\Users\The_u\BudgetingAndSavingLifeStyle\dist-electron\
```

## File Types by Platform

### Windows
After running `npm run dist` on Windows, you'll find:

- **`Budget Life Setup 1.0.0.exe`** - NSIS installer (this is what you distribute)
- **`latest.yml`** - Update manifest file (used by auto-updater)

**Location:** `dist-electron\Budget Life Setup 1.0.0.exe`

### macOS
After running `npm run dist` on macOS, you'll find:

- **`Budget Life-1.0.0.dmg`** - Disk image installer
- **`latest-mac.yml`** - Update manifest file

**Location:** `dist-electron/Budget Life-1.0.0.dmg`

### Linux
After running `npm run dist` on Linux, you'll find:

- **`Budget Life-1.0.0.AppImage`** - Portable AppImage executable
- **`latest-linux.yml`** - Update manifest file

**Location:** `dist-electron/Budget Life-1.0.0.AppImage`

## Installation Locations (After User Installs)

### Windows
When users install the app, it's installed to:
```
C:\Users\<Username>\AppData\Local\Programs\Budget Life\
```

The executable runs from:
```
C:\Users\<Username>\AppData\Local\Programs\Budget Life\Budget Life.exe
```

### macOS
When users install the app, it's installed to:
```
/Applications/Budget Life.app
```

### Linux
The AppImage can be run from anywhere, typically:
```
~/Applications/Budget Life.AppImage
```
or wherever the user places it.

## Data Storage Location

The app stores its database and user data in platform-specific locations:

### Windows
```
%APPDATA%\BudgetLife\budgeting.db
```
Example: `C:\Users\<Username>\AppData\Roaming\BudgetLife\budgeting.db`

### macOS
```
~/Library/Application Support/BudgetLife/budgeting.db
```

### Linux
```
~/.config/BudgetLife/budgeting.db
```

## Building the Executable

To create the executable:

```bash
# 1. Install all dependencies
npm run install:all

# 2. Build the application
npm run build

# 3. Build the executable
npm run dist
```

After building, check the `dist-electron/` directory for your executable files.

## Distribution

### For Distribution:
- **Windows**: Share the `.exe` installer file
- **macOS**: Share the `.dmg` file
- **Linux**: Share the `.AppImage` file

### For Auto-Updates:
When you publish to GitHub Releases, the app will automatically:
1. Check GitHub Releases for newer versions
2. Download updates from the release assets
3. Install updates automatically

The update manifest files (`latest.yml`, `latest-mac.yml`, `latest-linux.yml`) tell the app where to find updates.

