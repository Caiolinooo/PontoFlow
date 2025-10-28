const sodium = require('tweetsodium');

// Dados obtidos da API do GitHub
const PUBLIC_KEY = 'b3Tjs3+Kef9iqWa5qxe+jRhNH7QJbmu1sYwjQYJ6UC0=';
const KEY_ID = '3380204578043523366';

const APP_URL = 'https://pontoflow.netlify.app';
const CRON_SECRET = 'cf208c71c46f446908cf17f79541c8697511bdc04959373fcd87df34688467af';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function getPublicKey() {
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/public-key`,
    method: 'GET',
    headers: {
      'User-Agent': 'Node.js',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };
  
  return makeRequest(options);
}

function encryptSecret(publicKey, secretValue) {
  const messageBytes = Buffer.from(secretValue);
  const keyBytes = Buffer.from(publicKey, 'base64');
  const encryptedBytes = sodium.seal(messageBytes, keyBytes);
  return Buffer.from(encryptedBytes).toString('base64');
}

async function createOrUpdateSecret(secretName, secretValue, keyId, publicKey) {
  const encryptedValue = encryptSecret(publicKey, secretValue);
  
  const options = {
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/${secretName}`,
    method: 'PUT',
    headers: {
      'User-Agent': 'Node.js',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    }
  };
  
  const data = {
    encrypted_value: encryptedValue,
    key_id: keyId
  };
  
  return makeRequest(options, data);
}

async function main() {
  try {
    console.log('🔐 Criptografando secrets...\n');

    // Criptografar APP_URL
    const encryptedAppUrl = encryptSecret(PUBLIC_KEY, APP_URL);
    console.log('📝 APP_URL criptografado:');
    console.log(`   Valor: ${APP_URL}`);
    console.log(`   Encrypted: ${encryptedAppUrl.substring(0, 20)}...`);
    console.log(`   Key ID: ${KEY_ID}\n`);

    // Criptografar CRON_SECRET
    const encryptedCronSecret = encryptSecret(PUBLIC_KEY, CRON_SECRET);
    console.log('📝 CRON_SECRET criptografado:');
    console.log(`   Valor: ${CRON_SECRET.substring(0, 10)}...`);
    console.log(`   Encrypted: ${encryptedCronSecret.substring(0, 20)}...`);
    console.log(`   Key ID: ${KEY_ID}\n`);

    console.log('✅ Secrets criptografados com sucesso!');
    console.log('\n📋 Para adicionar manualmente via GitHub API:');
    console.log('\nAPP_URL:');
    console.log(`curl -L -X PUT \\`);
    console.log(`  -H "Accept: application/vnd.github+json" \\`);
    console.log(`  -H "Authorization: Bearer YOUR_TOKEN" \\`);
    console.log(`  -H "X-GitHub-Api-Version: 2022-11-28" \\`);
    console.log(`  https://api.github.com/repos/Caiolinooo/PontoFlow/actions/secrets/APP_URL \\`);
    console.log(`  -d '{"encrypted_value":"${encryptedAppUrl}","key_id":"${KEY_ID}"}'`);

    console.log('\n\nCRON_SECRET:');
    console.log(`curl -L -X PUT \\`);
    console.log(`  -H "Accept: application/vnd.github+json" \\`);
    console.log(`  -H "Authorization: Bearer YOUR_TOKEN" \\`);
    console.log(`  -H "X-GitHub-Api-Version: 2022-11-28" \\`);
    console.log(`  https://api.github.com/repos/Caiolinooo/PontoFlow/actions/secrets/CRON_SECRET \\`);
    console.log(`  -d '{"encrypted_value":"${encryptedCronSecret}","key_id":"${KEY_ID}"}'`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

