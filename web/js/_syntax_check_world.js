/** Parse-check world.js: node _syntax_check_world.js  (or: node --check world.js) */
var fs = require('fs');
var path = require('path');
var src = fs.readFileSync(path.join(__dirname, 'world.js'), 'utf8');
try {
  new Function(src);
  console.log('SYNTAX OK: world.js');
} catch (e) {
  console.error('SYNTAX FAIL:', e.message);
  process.exit(1);
}
