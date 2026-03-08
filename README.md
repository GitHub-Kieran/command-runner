# Command Runner

A cross-platform desktop application for executing commands through a user-friendly interface. Built with React, TypeScript, Electron, and ASP.NET Core.

![License](https://img.shields.io/github/license/GitHub-Kieran/command-runner?color=green) ![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)

## Quick Start

1. **Download** the appropriate installer for your platform from [Releases](https://github.com/GitHub-Kieran/command-runner/releases)
2. **Install** and launch the application
3. **Create a profile** and add your first command
4. **Execute** commands with a click

## Features

### 🚀 **Multi-Directory Command Execution**
Execute commands across multiple directories simultaneously.

![Command Runner Main Interface](images/app-full.png)

*Main application interface showing command execution across multiple directories*

### 🎯 **Compact Mode**
Focus mode provides a distraction-free interface for intensive command execution sessions, hiding unnecessary UI elements.

![Compact Mode View](images/compact-mode.png)

*Compact mode minimizes the interface for better focus during command execution*

### ⚙️ **Profile Management**
Create and manage command profiles with custom settings, environment variables, and execution parameters.

- Import profile files directly from JSON
- Reorder profiles and commands with drag-and-drop in the profile manager

![Profile Settings Dialog](images/profile-settings.png)
*Comprehensive profile configuration with environment variables and command settings*

### 🌐 **Cross-Platform Support**
Works seamlessly on Windows, Linux, and macOS with native file dialogs and platform-specific optimizations.

### 📁 **Directory Management**
Easily switch between working directories with a user-friendly selector.

### 🔄 **Command Iteration**
Run commands across multiple subdirectories recursively with configurable depth and error handling options.

### 📡 **Live Output Streaming**
See command output in real time while commands are still running, including iterative runs across directories.

### 🌓 **Theme Support**
Built-in dark and light themes for comfortable viewing in any environment or lighting condition.

## Upcoming Features

- **Keyboard Shortcuts**: Use keys to select and execute commands
- **Multiple Execution**: Combine commands and run them together
- **Multiple Directories**: Add multiple directories to a command for quick switching

## Desktop App Installation

Desktop installers include the API backend and start it automatically when the app launches. You should not need to manually run the API in normal desktop usage.

### Linux

#### Option 1: Debian/Ubuntu (.deb)
1. Download the latest `.deb` file from the [Releases](https://github.com/GitHub-Kieran/command-runner/releases) page
2. Install using your package manager: `sudo dpkg -i commandrunner-reactwebsite_*.deb`
3. If there are dependency issues, run: `sudo apt-get install -f`

#### Option 2: AppImage
1. Download the latest `.AppImage` file from the [Releases](https://github.com/GitHub-Kieran/command-runner/releases) page
2. Make the file executable: `chmod +x CommandRunner-*.AppImage`
3. Run the AppImage: `./CommandRunner-*.AppImage` or right click and run

#### Option 3: Other Linux Distributions
For distributions not supporting .deb or AppImage:
```bash
cd src/CommandRunner.ReactWebsite
npm run build-electron-linux
```
### Windows

1. Download the latest `.exe` installer from the [Releases](https://github.com/GitHub-Kieran/command-runner/releases) page
2. Run the installer and follow the setup wizard
3. The app will be installed and available in your Start Menu

Note: Windows may handle built-in shell commands differently to other platforms. For example, to run 'dir' you can use 'cmd' as the executable and shell, with '/c dir' as the arguments.

### macOS

1. Download the latest `.dmg` file from the [Releases](https://github.com/GitHub-Kieran/command-runner/releases) page
2. Open the DMG file and drag the app to your Applications folder
3. Launch the app from Applications

### Data Storage

Command Runner stores user profiles and settings in the following locations:

- **Windows**: `%APPDATA%\CommandRunner\` (typically `C:\Users\<username>\AppData\Roaming\CommandRunner\`)
- **Linux**: `~/.config/CommandRunner/` (or fallback to the application directory if not accessible)
- **macOS**: `~/Library/Application Support/CommandRunner/`

Profile data is stored as JSON files in these directories and persists between application sessions.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- .NET 10.0 SDK (for API/backend projects)

### Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GitHub-Kieran/command-runner.git
   cd command-runner
   ```

2. **Start the app from VS Code (recommended)**
   - Select launch profile: `Command Runner (Electron + API)`
   - This starts both the API and Electron app together

3. **Alternative manual start** (two terminals)

   **API server:**
   ```bash
   cd src/CommandRunner.Api
   dotnet run
   ```
   The API will be available at `http://localhost:5081`

   **Frontend + Electron:**
   ```bash
   cd src/CommandRunner.ReactWebsite
   npm install
   npm run electron-dev
   ```

This will start both the Vite dev server and Electron app with hot reloading.

### Building for Production

#### Build Electron App
```bash
cd src/CommandRunner.ReactWebsite

# Build for current platform
npm run build-electron

# Build for Linux only
npm run build-electron-linux

# Build for Windows only
npm run build-electron-win
```

The built packages will be available in `src/CommandRunner.ReactWebsite/dist-electron/`.

## Example Profiles

You can import ready-to-use profile files from [`examples/profiles`](examples/profiles):

- [`dotnet-local-dev.json`](examples/profiles/dotnet-local-dev.json)
- [`javascript-tooling.json`](examples/profiles/javascript-tooling.json)
- [`windows-maintenance.json`](examples/profiles/windows-maintenance.json)

Import flow:
1. Open **Settings**
2. Select **Import Profile**
3. Choose one of the JSON files above

## Keyboard Shortcuts

Coming soon...

## Architecture

```
src/
├── CommandRunner.ReactWebsite/     # React frontend + Electron wrapper
│   ├── electron/                   # Electron main process files
│   ├── public/                     # Static assets
│   ├── src/                        # React application source
│   └── package.json                # Electron dependencies and scripts
├── CommandRunner.Api/              # ASP.NET Core API backend (REQUIRED)
├── CommandRunner.Business/         # Business logic layer
├── CommandRunner.Data/             # Data access layer
└── CommandRunner.Console/          # Console application
```

## Troubleshooting

### Common Issues

**App won't start on Linux:**
- Try the .deb package instead of AppImage
- Run: `sudo apt-get install -f` to fix dependencies

**API connection errors:**
- Ensure the API server is running on port 5081
- Check firewall settings
- In development, use VS Code launch profile `Command Runner (Electron + API)` or run `cd src/CommandRunner.Api && dotnet run`

**Build issues:**
- Ensure .NET 10.0 SDK is installed
- Clear node_modules: `rm -rf node_modules && npm install`

**Permission issues:**
- On Linux: `chmod +x CommandRunner-*.AppImage`
- On Windows: Run as administrator if needed

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -am 'Add some feature'`
5. Push to the branch: `git push origin feature/your-feature`
6. Submit a pull request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/GitHub-Kieran/command-runner/issues) page
2. Create a new issue with detailed information about your problem
3. Include your operating system, app version, and steps to reproduce

## Changelog

See [Releases](https://github.com/GitHub-Kieran/command-runner/releases) for the latest changes and version history.
