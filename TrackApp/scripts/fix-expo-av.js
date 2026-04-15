const fs = require('fs');
const path = require('path');

const headerPath = path.join(__dirname, '..', 'node_modules', 'expo-av', 'ios', 'EXAV', 'EXAV.h');
const legacyImport = '#import <ExpoModulesCore/EXEventEmitter.h>\n';
const replacement = [
  '#import <ExpoModulesCore/EventEmitter.h>',
  '',
  '@protocol EXEventEmitter <NSObject>',
  '@optional',
  '- (void)sendEventWithName:(NSString *)name body:(id)body;',
  '@end',
  '',
].join('\n');

if (!fs.existsSync(headerPath)) {
  process.exit(0);
}

const current = fs.readFileSync(headerPath, 'utf8');

if (!current.includes(legacyImport)) {
  process.exit(0);
}

fs.writeFileSync(headerPath, current.replace(legacyImport, replacement), 'utf8');
