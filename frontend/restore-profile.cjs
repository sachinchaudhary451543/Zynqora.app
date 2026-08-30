const fs = require('fs');
const log = fs.readFileSync('C:/Users/DELL/.gemini/antigravity-ide/brain/1e1fb43e-f04c-4da1-86c7-053c138bc0e1/.system_generated/tasks/task-427.log', 'utf8');

// The log contains JSON entries with "content":"..." 
const matches = [...log.matchAll(/"content":"(.*?)"(?:,|$)/g)];
let fullContent = '';

for (const match of matches) {
  let text = match[1];
  // Unescape JSON string
  text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  // Find where the code starts
  const codeStart = text.indexOf('line number, colon, and leading space.\n');
  if (codeStart !== -1) {
    let code = text.substring(codeStart + 'line number, colon, and leading space.\n'.length);
    // Remove the line numbers "1: ", "2: ", etc.
    code = code.replace(/^\d+: /gm, '');
    fullContent += code;
  }
}

fs.writeFileSync('c:/Users/DELL/OneDrive/Desktop/familyapp/frontend/src/pages/Profile.tsx', fullContent);
console.log('Restored Profile.tsx, bytes:', fullContent.length);
