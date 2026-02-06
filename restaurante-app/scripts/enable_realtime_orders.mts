import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.test') });

const supabaseUrl = process.env.TEST_SUPABASE_URL!;
const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableRealtime() {
  console.log('🔄 Habilitando realtime para tabela orders...\n');

  // Enable realtime
  const { error: enableError } = await supabase.rpc('exec_sql', {
    sql: `ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;`
  });

  if (enableError) {
    console.error('❌ Erro ao habilitar realtime:', enableError);
    
    // Try alternative method
    console.log('\n🔄 Tentando método alternativo...\n');
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro:', error);
    } else {
      console.log('✅ Tabela acessível, realtime pode já estar habilitado');
    }
  } else {
    console.log('✅ Realtime habilitado com sucesso!');
  }

  // Verify
  console.log('\n📋 Para verificar, execute no SQL Editor do Supabase:');
  console.log(`
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'orders';
  `);
}

enableRealtime().catch(console.error);
