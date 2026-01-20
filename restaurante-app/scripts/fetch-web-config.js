const https = require('https');

const projectId = 'restaurante-6f221';

// Tentar obter informações públicas do projeto
const options = {
  hostname: `${projectId}.firebaseapp.com`,
  path: '/__/firebase/init.json',
  method: 'GET'
};

console.log('🔍 Tentando obter configuração Web do Firebase...\n');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const config = JSON.parse(data);
        console.log('✅ Configuração obtida com sucesso!\n');
        console.log('const firebaseConfig = {');
        console.log(`  apiKey: "${config.apiKey}",`);
        console.log(`  authDomain: "${config.authDomain}",`);
        console.log(`  projectId: "${config.projectId}",`);
        console.log(`  storageBucket: "${config.storageBucket}",`);
        console.log(`  messagingSenderId: "${config.messagingSenderId}",`);
        console.log(`  appId: "${config.appId}"`);
        console.log('};\n');
      } catch (e) {
        console.log('❌ Erro ao parsear resposta');
        console.log('Acesse manualmente: https://console.firebase.google.com/project/restaurante-6f221/settings/general');
      }
    } else {
      console.log('⚠️ Não foi possível obter automaticamente.');
      console.log('Por favor, acesse manualmente:');
      console.log('https://console.firebase.google.com/project/restaurante-6f221/settings/general\n');
    }
  });
});

req.on('error', (e) => {
  console.log('⚠️ Não foi possível obter automaticamente.');
  console.log('Por favor, acesse manualmente:');
  console.log('https://console.firebase.google.com/project/restaurante-6f221/settings/general\n');
});

req.end();
