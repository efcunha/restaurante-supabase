import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.test') });

const supabaseUrl = process.env.TEST_SUPABASE_URL!;
const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addFields() {
  console.log('🔄 Adicionando campos à tabela profiles...\n');

  try {
    // Verificar estrutura atual
    console.log('📊 Verificando estrutura atual...');
    const { data: currentData, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Erro ao verificar:', checkError);
      throw checkError;
    }

    if (currentData && currentData.length > 0) {
      console.log('📋 Campos atuais:', Object.keys(currentData[0]));
    }

    console.log('\n🔧 Executando ALTER TABLE commands...\n');

    // Executar comandos SQL via query direto
    const commands = [
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS funcao text",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean DEFAULT true",
      "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hire_date date",
      "CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf)",
      "CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active)"
    ];

    for (const cmd of commands) {
      console.log(`🔄 Executando: ${cmd}`);
      
      // Usar a API REST do Supabase não funciona para DDL
      // Precisamos usar o SQL Editor do Supabase Dashboard
      console.log('⚠️  Este comando precisa ser executado no SQL Editor do Supabase Dashboard');
    }

    console.log('\n📝 INSTRUÇÕES:');
    console.log('1. Acesse o Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Vá em SQL Editor');
    console.log('3. Cole e execute o seguinte SQL:\n');
    console.log('-- Adicionar campos à tabela profiles');
    console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;');
    console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;');
    console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS funcao text;');
    console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;');
    console.log('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hire_date date;');
    console.log('CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);');
    console.log('CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active);');
    console.log('\n4. Após executar, teste novamente a edição de funcionários');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

addFields().catch(console.error);
