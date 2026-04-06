const fs = require('fs');
const path = require('path');
const dir = '/Users/bx3/Documents/my-projects/SnapQuote/api/node_server/src/views';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ejs') && f !== 'gallery.ejs');

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // The regex replace failed before because we didn't handle the exact pattern. Let's fix the broken EJS syntax directly.
  // Example broken string: <%= formatMoney(locals.currency || '$' %><%= (item.quantity * item.unit_price)) %>
  // Needs to become: <%= locals.currency || '$' %><%= formatMoney(item.quantity * item.unit_price) %>
  
  // This regex matches exactly what we have:
  content = content.replace(/<%= formatMoney\(locals\.currency \|\| '\$'\s*<%= (.*?)\) %>/g, "<%= locals.currency || '$' %><%= formatMoney($1) %>");
  
  // Wait, there's another pattern:
  // <%= formatMoney(locals.currency || '$' %><%= Number(discount)) %>
  
  fs.writeFileSync(path.join(dir, file), content);
});

console.log("Syntax fixed successfully part 3");