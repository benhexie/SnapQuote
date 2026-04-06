const fs = require('fs');
const path = require('path');
const dir = '/Users/bx3/Documents/my-projects/SnapQuote/api/node_server/src/views';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ejs') && f !== 'gallery.ejs');

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  
  // The bad format looks like: <%= formatMoney(locals.currency || '$' %><%= (item.quantity * item.unit_price)) %>
  // This happened because the original was: <%= locals.currency || '$' %><%= (item.quantity * item.unit_price).toFixed(2) %>
  // And the regex was: /<%=\s*(.*?)\.toFixed\(2\)\s*%>/g -> '<%= formatMoney($1) %>'
  
  // So we have: <%= formatMoney(locals.currency || '$' %><%= (some_expression)) %>
  // We want to turn this into: <%= locals.currency || '$' %><%= formatMoney(some_expression) %>
  
  // Regex to match: <%= formatMoney(locals.currency || '$' %><%= (some_expression)) %>
  // The first capture group is: formatMoney(locals.currency || '$'
  // Actually, wait, let's look exactly at the bad string:
  // <%= formatMoney(locals.currency || '$' %><%= (total - (locals.discount || 0))) %>
  // This is:
  // `<%= formatMoney(locals.currency || '$' %><%= ` + `(total - (locals.discount || 0)))` + ` %>`
  // Let's replace `<%= formatMoney(locals.currency || '$' %><%= ` with `<%= locals.currency || '$' %><%= formatMoney(`
  
  content = content.replace(/<%= formatMoney\(locals\.currency \|\| '\$'\s*<%= /g, "<%= locals.currency || '$' %><%= formatMoney(");
  
  // Also check for: <%= formatMoney(locals.currency || '€' <%= 
  // Just in case it was a different currency
  content = content.replace(/<%= formatMoney\(locals\.currency \|\| '([^']+)'\s*<%= /g, "<%= locals.currency || '$1' %><%= formatMoney(");

  fs.writeFileSync(path.join(dir, file), content);
});

console.log("Syntax fixed successfully");