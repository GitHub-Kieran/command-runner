const fs = require('fs');
const path = require('path');

// Helper function to copy directories recursively
function copyDirRecursive(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

module.exports = async (context) => {
  const { electronPlatformName, appOutDir } = context;
  const fs = require('fs');
  const path = require('path');

  console.log(`After pack script running for platform: ${electronPlatformName}`);
  console.log(`App output directory: ${appOutDir}`);

  // Handle Windows builds - ensure API files are copied
  if (electronPlatformName === 'win32') {
    console.log('Processing Windows build - checking for API files...');

    const sourceApiDir = path.join(process.cwd(), 'dist-electron', 'api');
    const targetResourcesDir = path.join(appOutDir, 'resources');

    console.log(`Source API directory: ${sourceApiDir}`);
    console.log(`Target resources directory: ${targetResourcesDir}`);

    // Check if API directory exists
    if (fs.existsSync(sourceApiDir)) {
      console.log('API directory found, copying to resources...');

      // Ensure resources directory exists
      if (!fs.existsSync(targetResourcesDir)) {
        fs.mkdirSync(targetResourcesDir, { recursive: true });
      }

      // Copy API files to resources directory
      const targetApiDir = path.join(targetResourcesDir, 'api');
      if (!fs.existsSync(targetApiDir)) {
        fs.mkdirSync(targetApiDir, { recursive: true });
      }

      // Copy all files from source to target
      const files = fs.readdirSync(sourceApiDir);
      files.forEach(file => {
        const sourcePath = path.join(sourceApiDir, file);
        const targetPath = path.join(targetApiDir, file);
        console.log(`Copying ${sourcePath} to ${targetPath}`);

        if (fs.statSync(sourcePath).isDirectory()) {
          // Copy directory recursively
          copyDirRecursive(sourcePath, targetPath);
        } else {
          // Copy file
          fs.copyFileSync(sourcePath, targetPath);
        }
      });

      console.log('API files copied successfully');
    } else {
      console.error('API directory not found at:', sourceApiDir);
      console.error('Available directories in dist-electron:', fs.readdirSync(path.join(process.cwd(), 'dist-electron')));
    }
  }

  // Only modify Linux builds for sandbox fixes
  if (electronPlatformName !== 'linux') {
    return;
  }

  console.log('Applying Linux AppImage sandbox fixes...');

  // Find the AppImage executable
  const appImagePath = path.join(appOutDir, 'CommandRunner-0.0.0.AppImage');

  if (fs.existsSync(appImagePath)) {
    console.log('Found AppImage, creating sandbox-disabled alternatives...');

    // Create a desktop file for the AppImage with sandbox disabled
    const desktopFile = `[Desktop Entry]
Name=CommandRunner
Exec="${appImagePath}" --no-sandbox --disable-setuid-sandbox %U
Terminal=false
Type=Application
Icon=command-runner
Categories=Utility;Development;
Comment=Cross-platform command execution tool
`;

    const desktopPath = path.join(appOutDir, 'CommandRunner.desktop');
    fs.writeFileSync(desktopPath, desktopFile);

    // Create a wrapper script
    const wrapperScript = `#!/bin/bash
# Command Runner AppImage wrapper to disable sandbox
echo "Starting Command Runner with sandbox disabled..."
echo "If you see sandbox errors, try running the .desktop file instead"
exec "${appImagePath}" --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-accelerated-2d-canvas --no-first-run --no-zygote --disable-gpu "$@"
`;

    const wrapperPath = path.join(appOutDir, 'CommandRunner.sh');
    fs.writeFileSync(wrapperPath, wrapperScript, { mode: 0o755 });

    // Create a README for Linux users
    const readme = `# Command Runner - Linux Installation

This directory contains multiple ways to run Command Runner on Linux:

## Option 1: .deb Package (Recommended)
\`\`\`bash
sudo dpkg -i commandrunner-reactwebsite_0.0.0_amd64.deb
# or use your package manager to install it
\`\`\`

## Option 2: AppImage with Sandbox Disabled
\`\`\`bash
chmod +x "Command Runner.sh"
./Command Runner.sh
\`\`\`

## Option 3: Desktop Integration
\`\`\`bash
# Copy the desktop file to your applications
cp "Command Runner.desktop" ~/.local/share/applications/
chmod +x ~/.local/share/applications/Command\ Runner.desktop
\`\`\`

## Troubleshooting
If you still get sandbox errors:
1. Try the .deb package instead of AppImage
2. Use the wrapper script (.sh file)
3. Run with additional flags:
   \`\`\`bash
   ./Command\\ Runner-0.0.0.AppImage --no-sandbox --disable-setuid-sandbox
   \`\`\`
`;

    const readmePath = path.join(appOutDir, 'README-Linux.md');
    fs.writeFileSync(readmePath, readme);

    console.log('Created sandbox-disabled alternatives:');
    console.log('- Wrapper script:', wrapperPath);
    console.log('- Desktop file:', desktopPath);
    console.log('- Linux README:', readmePath);
  } else {
    console.log('AppImage not found at expected location');
  }
};