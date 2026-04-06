const fs = require('fs');
const path = require('path');
const dir = '/Users/bx3/Documents/my-projects/SnapQuote/api/node_server/src/views';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ejs') && f !== 'gallery.ejs');

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  if (!content.includes('formatMoney')) {
    content = content.replace(/<body/, '<%\n  function formatMoney(amount) {\n    return Number(amount).toLocaleString(\'en-US\', { minimumFractionDigits: 2, maximumFractionDigits: 2 });\n  }\n%>\n<body');
  }

  content = content.replace(/<%=\s*(.*?)\.toFixed\(2\)\s*%>/g, '<%= formatMoney($1) %>');

  if (file === 'elegant.ejs') {
    // Try multiple possible spaces just in case
    content = content.replace('class="flex justify-between py-6 mt-4 border-t-2 border-dark"', 'class="flex justify-between items-center py-6 mt-4 border-t-2 border-dark"');
  }
  
  fs.writeFileSync(path.join(dir, file), content);
});

console.log("Templates updated successfully");
