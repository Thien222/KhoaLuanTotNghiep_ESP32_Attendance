const fs = require('fs');
const path = require('path');

exports.retrievePolicySnippets = (query) => {
  const docsPath = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsPath)) return [];
  const files = fs.readdirSync(docsPath).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
  const q = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  let results = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(docsPath, f), 'utf8');
    const sections = content.split(/\n\s*##\s*/g);
    for (const sec of sections) {
      const score = q.reduce((acc, w) => acc + (sec.toLowerCase().includes(w) ? 1 : 0), 0);
      if (score > 0) results.push({ file: f, score, snippet: sec.trim().slice(0, 800) });
    }
  }
  return results.sort((a,b)=>b.score-a.score).slice(0,2);
};
