const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const webDir = path.resolve(rootDir, 'apps/web');

console.log('🚀 Building Lumora Web App...');

// Run vite build in apps/web
execSync('npx vite build', { cwd: webDir, stdio: 'inherit' });

// Ensure dist exists at both apps/web/dist and root/dist
const webDist = path.resolve(webDir, 'dist');
const rootDist = path.resolve(rootDir, 'dist');

if (fs.existsSync(webDist)) {
  fs.cpSync(webDist, rootDist, { recursive: true, force: true });
  console.log(`✓ Synchronized output to ${rootDist}`);
}

console.log('✅ Lumora web build and dist synchronization complete!');
