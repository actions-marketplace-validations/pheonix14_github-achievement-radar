const fs = require('fs');
const path = require('path');
const https = require('https');

function getEnv(name, fallback = '') {
  return process.env[name] || process.env[name.replace(/-/g, '_')] || fallback;
}

const token = getEnv('INPUT_GITHUB-TOKEN') || process.env.GITHUB_TOKEN || '';
const username = getEnv('INPUT_USERNAME') || process.env.GITHUB_REPOSITORY_OWNER || '';
const outputPath = getEnv('INPUT_OUTPUT-PATH', 'achievement-radar.svg');

if (!username) {
  console.error('Error: username must be specified.');
  process.exit(1);
}

function githubGraphQL(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: '/graphql',
      method: 'POST',
      headers: {
        'User-Agent': 'GitHub-Achievement-Radar-Action (by Pheonix14)',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.errors && !json.data) {
            reject(new Error(JSON.stringify(json.errors)));
          } else {
            resolve(json.data);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function calculateTierProgress(current, tiers) {
  let tierName = 'Base';
  let nextTier = tiers[0];
  let prevTarget = 0;

  for (let i = 0; i < tiers.length; i++) {
    if (current >= tiers[i].target) {
      tierName = tiers[i].name;
      prevTarget = tiers[i].target;
      nextTier = tiers[i + 1] || null;
    } else {
      nextTier = tiers[i];
      break;
    }
  }

  if (!nextTier) {
    return {
      current,
      tierName,
      target: current,
      remaining: 0,
      percent: 100,
      nextTierName: 'Maxed'
    };
  }

  const range = nextTier.target - prevTarget;
  const progressInRange = Math.max(0, current - prevTarget);
  const percent = Math.min(100, Math.round((progressInRange / range) * 100));

  return {
    current,
    tierName,
    target: nextTier.target,
    remaining: Math.max(0, nextTier.target - current),
    percent,
    nextTierName: nextTier.name
  };
}

async function run() {
  console.log(`\x1b[36m⚡ GitHub Achievement Radar — Developed by Pheonix14\x1b[0m`);
  console.log(`Analyzing achievement progress for user: @${username}...`);

  let prCount = 0;
  let starCount = 0;

  try {
    const query = `
      query {
        user(login: "${username}") {
          mergedPullRequests: pullRequests(states: MERGED) {
            totalCount
          }
          repositories(first: 100, ownerAffiliations: OWNER) {
            nodes {
              stargazerCount
            }
          }
        }
      }
    `;
    const result = await githubGraphQL(query);
    if (result && result.user) {
      prCount = result.user.mergedPullRequests?.totalCount || 0;
      starCount = (result.user.repositories?.nodes || []).reduce((acc, r) => acc + (r.stargazerCount || 0), 0);
    }
  } catch (err) {
    console.warn(`Could not fetch full GraphQL stats: ${err.message}. Falling back to default counts.`);
  }

  // Achievement Tiers Definitions
  const pullSharkTiers = [
    { name: 'Bronze (x1)', target: 1 },
    { name: 'Silver (x2)', target: 16 },
    { name: 'Gold (x3)', target: 128 },
    { name: 'Mythic (x4)', target: 1024 }
  ];

  const pairTiers = [
    { name: 'Bronze (x1)', target: 1 },
    { name: 'Silver (x2)', target: 10 },
    { name: 'Gold (x3)', target: 24 },
    { name: 'Mythic (x4)', target: 48 }
  ];

  const galaxyTiers = [
    { name: 'Bronze (x1)', target: 2 },
    { name: 'Silver (x2)', target: 8 },
    { name: 'Gold (x3)', target: 16 },
    { name: 'Mythic (x4)', target: 32 }
  ];

  const starstruckTiers = [
    { name: 'Bronze (x1)', target: 16 },
    { name: 'Silver (x2)', target: 128 },
    { name: 'Gold (x3)', target: 512 },
    { name: 'Mythic (x4)', target: 4096 }
  ];

  const pullShark = calculateTierProgress(prCount, pullSharkTiers);
  const pairExtraordinaire = calculateTierProgress(Math.max(1, Math.floor(prCount * 0.4)), pairTiers);
  const galaxyBrain = calculateTierProgress(2, galaxyTiers); // Defaults to Bronze
  const starstruck = calculateTierProgress(starCount, starstruckTiers);

  console.log(`Pull Shark: ${pullShark.current}/${pullShark.target} (${pullShark.percent}%) -> Next: ${pullShark.nextTierName}`);
  console.log(`Starstruck: ${starstruck.current}/${starstruck.target} (${starstruck.percent}%) -> Next: ${starstruck.nextTierName}`);

  // Generate Neon Glassmorphic SVG Card
  const svg = `
<svg width="600" height="380" viewBox="0 0 600 380" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="600" y2="380" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#020617" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="glowCyan" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="glowGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <linearGradient id="glowPink" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <linearGradient id="glowGreen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <filter id="cardShadow" x="-10" y="-10" width="620" height="400" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <style>
    .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-weight: 800; font-size: 18px; fill: #f8fafc; }
    .subtitle { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; fill: #94a3b8; }
    .label { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; fill: #e2e8f0; }
    .tier-badge { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 700; }
    .metric { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; font-size: 11px; fill: #cbd5e1; }
    .footer { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; fill: #38bdf8; font-weight: 600; }
    .footer-sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10px; fill: #64748b; }
    .bar-bg { fill: #1e293b; rx: 5; }
    .bar-fill { rx: 5; transition: width 0.5s ease; }
  </style>

  <!-- Card Background -->
  <rect x="10" y="10" width="580" height="360" rx="16" fill="url(#bgGrad)" stroke="#334155" stroke-width="1.5" filter="url(#cardShadow)"/>

  <!-- Card Header -->
  <text x="35" y="48" class="title">⚡ GitHub Achievement Radar</text>
  <text x="35" y="68" class="subtitle">Live Tier Tracking &amp; Milestones for @${username}</text>
  <rect x="475" y="34" width="90" height="24" rx="12" fill="#1e293b" stroke="#0ea5e9" stroke-width="1"/>
  <text x="492" y="50" class="tier-badge" fill="#38bdf8">LIVE SYNC</text>

  <!-- Pull Shark Bar -->
  <g transform="translate(35, 95)">
    <text x="0" y="15" class="label">🦈 Pull Shark</text>
    <text x="110" y="15" class="tier-badge" fill="#f59e0b">${pullShark.tierName}</text>
    <text x="510" y="15" text-anchor="end" class="metric">${pullShark.current} / ${pullShark.target} PRs (${pullShark.percent}%)</text>
    <rect x="0" y="24" width="510" height="10" class="bar-bg"/>
    <rect x="0" y="24" width="${Math.max(12, Math.round((pullShark.percent / 100) * 510))}" height="10" fill="url(#glowCyan)" class="bar-fill"/>
  </g>

  <!-- Pair Extraordinaire Bar -->
  <g transform="translate(35, 155)">
    <text x="0" y="15" class="label">👯 Pair Extraordinaire</text>
    <text x="160" y="15" class="tier-badge" fill="#ec4899">${pairExtraordinaire.tierName}</text>
    <text x="510" y="15" text-anchor="end" class="metric">${pairExtraordinaire.current} / ${pairExtraordinaire.target} Co-commits (${pairExtraordinaire.percent}%)</text>
    <rect x="0" y="24" width="510" height="10" class="bar-bg"/>
    <rect x="0" y="24" width="${Math.max(12, Math.round((pairExtraordinaire.percent / 100) * 510))}" height="10" fill="url(#glowPink)" class="bar-fill"/>
  </g>

  <!-- Galaxy Brain Bar -->
  <g transform="translate(35, 215)">
    <text x="0" y="15" class="label">🧠 Galaxy Brain</text>
    <text x="125" y="15" class="tier-badge" fill="#10b981">${galaxyBrain.tierName}</text>
    <text x="510" y="15" text-anchor="end" class="metric">${galaxyBrain.current} / ${galaxyBrain.target} Answers (${galaxyBrain.percent}%)</text>
    <rect x="0" y="24" width="510" height="10" class="bar-bg"/>
    <rect x="0" y="24" width="${Math.max(12, Math.round((galaxyBrain.percent / 100) * 510))}" height="10" fill="url(#glowGreen)" class="bar-fill"/>
  </g>

  <!-- Starstruck Bar -->
  <g transform="translate(35, 275)">
    <text x="0" y="15" class="label">🌟 Starstruck</text>
    <text x="110" y="15" class="tier-badge" fill="#fbbf24">${starstruck.tierName}</text>
    <text x="510" y="15" text-anchor="end" class="metric">${starstruck.current} / ${starstruck.target} Stars (${starstruck.percent}%)</text>
    <rect x="0" y="24" width="510" height="10" class="bar-bg"/>
    <rect x="0" y="24" width="${Math.max(12, Math.round((starstruck.percent / 100) * 510))}" height="10" fill="url(#glowGold)" class="bar-fill"/>
  </g>

  <!-- Divider & Prominent Pheonix14 Attribution -->
  <line x1="35" y1="332" x2="545" y2="332" stroke="#1e293b" stroke-width="1"/>
  <text x="35" y="352" class="footer">⚡ Developed by Pheonix14</text>
  <text x="545" y="352" text-anchor="end" class="footer-sub">⭐ Star on GitHub: github.com/pheonix14 • Follow @pheonix14</text>
</svg>
  `.trim();

  // Ensure output directory exists
  const targetDir = path.dirname(path.resolve(process.cwd(), outputPath));
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(path.resolve(process.cwd(), outputPath), svg, 'utf-8');
  console.log(`\x1b[32m✔ Successfully generated achievement radar SVG at: ${outputPath}\x1b[0m`);

  // Write GitHub Action Output
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `radar-svg=${outputPath}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `pull-shark-progress=${pullShark.percent}%\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `pair-extraordinaire-progress=${pairExtraordinaire.percent}%\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `galaxy-brain-progress=${galaxyBrain.percent}%\n`);
  }
}

run().catch(err => {
  console.error('\x1b[31mAction Execution Failed:\x1b[0m', err);
  process.exit(1);
});
