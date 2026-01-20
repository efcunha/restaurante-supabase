/**
 * Script para obter configuração Web do Firebase
 * Usa o Service Account para buscar as credenciais Web
 */

const admin = require('firebase-admin');

const serviceAccount = {
  "type": "service_account",
  "project_id": "restaurante-6f221",
  "private_key_id": "44ec94c3443b44a2fff70a790a9c0c570d26301a",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDlZ+FHj0/KKam+\nxPn6szEAIKI6veLP1lbFcyH1RdXDpnL0dXRjvpYE8Cp4Kysu0FKQf+CRvpQGG9xC\n2vNTMzhIzIZU+E7kjaanDa3seSCM3ztVE7T53Q40AxBG2WhiCm3TX2Aosbc+jrRN\n7XasyVvb1yU16XnRbFWJCgVbbK6j8PYjLoaP+T2uBHcAc2b+knuGeAdXtDrUpxeE\nkeiD4FKkpjUHtyl79vU5AjPbv0XDPPtQPuQQ4CHr+Iwcj1MlLyOp7384Plba0OSG\nyqDENoBV8v5aQE1pfGdsd6YRqwqa0iNfqzd3OhWzuVYRh20eYBwTC6u8zGr0gz8q\nFzNuroeRAgMBAAECggEAES5e3J7Vc/z7fefUwmZJ74os0ZzHxZcg9+LFPVBrT8mX\nPHXQ2hOREBzzS/1iW5GLTXqLqtQM1Amhd88G1Z61bXEGnTXc+sMdIyUkIdzPMkhv\nHNJqsHf83f+zaAr/sAVl76RqAuzkc3v5RwjXkDNN0kDibuTl6b26XkFw4JsFgrj0\no3hiKQ/Xeauoj5kjvTRz4bR/Sd5i+nkq59hvdhF2pU1TUIplq/PuIKPanGR5rKaM\nw8rvhAq2n3jtpoW7ulnwKLbDNCefeZSpFtgFOEJVNtrPsBJaJriaxUjasYMrahyw\nPgDmXMpIcBBhxIuaJJKG6+lJqNkqHE8jU/EmB6ByfQKBgQD1TFqMG9xOE1aWtTNW\nT7OXEbh8r0dChvIb7SSgKTrU+lj7gWsk43SHOZYJNkLx8ADTo1xRTpbDj2l0+xtu\njbTVf5fwbZ9e/GreHLNrvaqktXp1FDfKNa2bn2ls+xzQS/uy3EhtEpCGaB/PxIrX\n445RuqeddS3Zri1ZSyJJnBzq5wKBgQDvagdw5PqbRpQ87WbwT5a0JrPpQAsUqptf\nKDHX5X18D4VdYVnCPBwGhl50LH8EyNgdeDkRInNfL7XsRQDSxGtGbf4hr16k6ZH+\nGGQVASU5f4qkEhDzP1jYZNCcPDykU6pZWsQlqlOlh9CTV/R2e7gRrA5McV702drl\n1PzF5gzixwKBgQDKsGnNhiP3G8GbzGR8OGV0Of9Qf+EJFsqtyrlN4mOroqWuRJVN\nKOmb5ziTqhONKLz2I/FfeenX9AO21tsm8c7v73uT/nEHItoHaH3VVCbR7OcgITGs\nU8h9ZC7QD3sSnwZ/F8h84C8t8JIAsy3rECwEWpCv6iiVy3fLZesSGf5HFwKBgAyV\nwUBg+P9yjVZKkG+vb1eW9Twcnrh+Y150KXKU4KzF0Bfhhytbp4l8RLjMofypZhre\nd/l7mx70zhZWZj2uD4mLPKGeq1X15TO7Kn+kKMXF+462WGfA+7WcTw73Z6SntTuv\nNsJYGr+HzSIBrJsR09Ix/ipshzZNwWD1ejgY6LJ/AoGAfk/6LbC7rKXXMF2iGSxo\njansnTlKi6TuZDMaqBujhsUYP4R1D6cVBITrhkfdcHzXqmiO+k2C/8NLrZ3X3JK7\nl5imxWyaqCLk1R9KLUsfN5yFl8tVPgRCMoaeO8rL36abENh/IGKk5VmzsjSceXnH\n5bA+2YNraXvD1a+9Nm1T1qM=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@restaurante-6f221.iam.gserviceaccount.com",
  "client_id": "109978982434026468540",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40restaurante-6f221.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

console.log('\n📋 INSTRUÇÕES PARA OBTER CREDENCIAIS WEB:\n');
console.log('1. Acesse: https://console.firebase.google.com/project/restaurante-6f221/settings/general');
console.log('2. Role até "Seus apps" > "SDK setup and configuration"');
console.log('3. Selecione "Config" (não npm)');
console.log('4. Copie o objeto firebaseConfig\n');
console.log('Exemplo do que você verá:\n');
console.log('const firebaseConfig = {');
console.log('  apiKey: "AIza...",');
console.log('  authDomain: "restaurante-6f221.firebaseapp.com",');
console.log('  projectId: "restaurante-6f221",');
console.log('  storageBucket: "restaurante-6f221.appspot.com",');
console.log('  messagingSenderId: "123456789",');
console.log('  appId: "1:123456789:web:abc123"');
console.log('};\n');
console.log('5. Cole esses valores em src/config/firebaseConfig.js\n');
console.log('✅ Project ID confirmado:', serviceAccount.project_id);
