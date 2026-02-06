
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykalocfhnetxenvmtlcn.supabase.co';
const anonKey = 'sb_publishable_sUAhOXyPkUhEb4tpbVU8wQ_71qyFI3x';

const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const defaultSettings = {
    temperosCaldos: ["Cebolinha", "Salsinha", "Torrada", "Pimenta"],
    temperosComidas: ["Farofa", "Vinagrete", "Pimenta"],
    variacoesEspetinho: ['Simples', 'com Arroz', 'com Macaxeira', 'Completo'],
    ingredientesPizza: ["Orégano", "Azeitona", "Cebola", "Milho"],
    pizzaConfig: {
        sizes: [
            { name: 'Fatia', maxFlavors: 1, active: true },
            { name: 'Broto', maxFlavors: 1, active: true },
            { name: 'Média', maxFlavors: 2, active: true },
            { name: 'Grande', maxFlavors: 4, active: true }
        ],
        pricingMode: 'HIGHER'
    }
};

async function fixSettings() {
    console.log('🛠️  Fixing Company Settings...');

    // 1. Login
    const { data: auth, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lu@m.com',
        password: 'mudar123',
    });

    if (loginError) {
        console.error('❌ Login failed:', loginError.message);
        return;
    }

    const user = auth.session?.user;
    console.log(`✅ Logged in as ${user?.email}`);

    // 2. Get User Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

    if (!profile?.company_id) {
        console.error('❌ No company_id found!');
        return;
    }

    // 3. Update Settings
    const { error } = await supabase
        .from('companies')
        .update({ settings: defaultSettings })
        .eq('id', profile.company_id);

    if (error) {
        console.error('❌ Error updating settings:', error.message);
    } else {
        console.log('✅ Settings successfully populated with defaults!');
        console.log(JSON.stringify(defaultSettings, null, 2));
    }
}

fixSettings();
