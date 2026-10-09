const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Not available? I'll use recursive read
function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes('node_modules') && !name.includes('.next')) {
        getFiles(name, files);
      }
    } else {
      if (name.endsWith('.ts') || name.endsWith('.tsx')) {
        files.push(name);
      }
    }
  }
  return files;
}

const allTsFiles = getFiles('app/api');
allTsFiles.push('lib/validations.ts');

let fixes = 0;
for (const file of allTsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Fix (await params).id -> (await Promise.resolve(params)).id
  if (content.includes('(await params).')) {
    content = content.replace(/\(await params\)\.([a-zA-Z0-9_]+)/g, '(await Promise.resolve(params)).$1');
    changed = true;
  }
  
  if (file.includes('multi-currency-trial-balance')) {
    if (content.includes('??')) {
      content = content.replace(/\?\?/g, '||');
      changed = true;
    }
  }

  // Check lib/validations.ts for any obvious parsing errors
  if (file.endsWith('validations.ts')) {
    // maybe there's a weird character?
  }

  if (changed) {
    fs.writeFileSync(file, content);
    fixes++;
  }
}
console.log('Fixed', fixes, 'files.');
