const { execSync } = require('child_process');

if (process.env.EAS_BUILD_PLATFORM === 'ios') {
  console.log('Upgrading npm to 11.12.1 before EAS install step...');
  execSync('npm install -g npm@11.12.1', { stdio: 'inherit' });
  execSync('npm --version', { stdio: 'inherit' });
}