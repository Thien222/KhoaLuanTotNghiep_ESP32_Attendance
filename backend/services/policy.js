const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

let cached = null;

exports.loadPolicy = () => {
  if (cached) return cached;
  const policyPath = process.env.POLICY_PATH ||
    path.join(__dirname, '..', 'policies', 'policy.yaml');
  const y = fs.readFileSync(policyPath, 'utf8');
  cached = yaml.load(y);
  return cached;
};
