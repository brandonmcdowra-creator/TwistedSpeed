/** Parse-check materials.js + world.js: node _syntax_check_facade.js */
var fs = require('fs');
var path = require('path');
var failed = false;
['materials.js', 'world.js'].forEach(function (f) {
  var src = fs.readFileSync(path.join(__dirname, f), 'utf8');
  try {
    new Function(src);
    console.log('SYNTAX OK: ' + f);
  } catch (e) {
    console.error('SYNTAX FAIL ' + f + ':', e.message);
    failed = true;
  }
});
if (failed) process.exit(1);
