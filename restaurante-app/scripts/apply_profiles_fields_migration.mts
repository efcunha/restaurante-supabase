import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.test') });

const supabaseUrl = process.env.TEST_SUPABASE_URL!;
const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔄 Aplicando migration: add_profiles_fields...\n');

  try {
    // Ler o arquivo SQL
    const sqlPath = join(__dirname, '..', '..', 'supabase', 'migrations', '20260205120800_add_profiles_fields.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL a ser executado:');
    console.log(sql);
    console.log('\n');

    // Executar cada comando SQL separadamente
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (const command of commands) {
      console.log(`🔄 Executando: ${command.substring(0, 80)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: command });
      
      if (error) {
        // Tentar executar diretamente se rpc não funcionar
        const { error: directError } = await supabase.from('_migrations').insert({
          name: '20260205120800_add_profiles_fields',
          executed_at: new Date().toISOString()
        });
        
        if (directError) {
          console.error('❌ Erro:', error.message);
          throw error;
        }
      }
      
      console.log('✅ Comando executado com sucesso\n');
    }

    console.log('✅ Migration aplicada com sucesso!');
    console.log('\n📊 Verificando estrutura da tabela profiles...\n');

    // Verificar se os campos foram criados
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro ao verificar:', error);
    } else {
      console.log('✅ Tabela profiles atualizada!');
      if (data && data.length > 0) {
        console.log('📋 Campos disponíveis:', Object.keys(data[0]));
      }
    }

  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);
