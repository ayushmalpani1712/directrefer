import { readFileSync } from 'fs';

// Read env file
const env = readFileSync('.env.local', 'utf8');
function getEnv(key) {
  const match = env.match(new RegExp(`^${key}=(.+)`, 'm'));
  return match ? match[1].replace(/^"|"$/g, '') : null;
}

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY === '[SENSITIVE]') {
  console.log('Could not read env vars, trying hardcoded project ref...');
}

const PROJECT_REF = 'ecdqnysmosxmojhvxbdu';
console.log(`URL: ${SUPABASE_URL}`);
console.log(`Key length: ${SERVICE_KEY?.length}`);
console.log(`Key type: ${SERVICE_KEY?.substring(0, 10)}...`);
