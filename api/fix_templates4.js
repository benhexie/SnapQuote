const fs = require('fs');
const path = require('path');
const dir = '/Users/bx3/Documents/my-projects/SnapQuote/api/node_server/src/views';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ejs') && f !== 'gallery.ejs');

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // OK, the regex didn't match. Let's just do a simpler replace.
  // The string is literally `<%= formatMoney(locals.currency || '$' %><%= ` + `something) %>`
  // We want to change `<%= formatMoney(locals.currency || '$' %><%= ` to `<%= locals.currency || '$' %><%= formatMoney(`
  
  content = content.replace(/<%= formatMoney\(locals\.currency \|\| '\$'\s*<%= /g, "<%= locals.currency || '$' %><%= formatMoney(");
  
  // Actually, wait, let's just replace all instances.
  // We can see from grep it looks like:
  // <%= formatMoney(locals.currency || '$' %><%= (total - (locals.discount || 0))) %>
  
  // I'll do a custom split and join.
  const badStr = "<%= formatMoney(locals.currency || '$' %><%= ";
  const goodStr = "<%= locals.currency || '$' %><%= formatMoney(";
  
  content = content.split(badStr).join(goodStr);

  fs.writeFileSync(path.join(dir, file), content);
});

console.log("Syntax fixed successfully part 4");