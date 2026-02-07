
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://iopkqqyutateeppnyswd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ta7jTCEA5Url3_og16RTkA_tI14TD63";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function createTestRestaurant() {
    console.log('--- CREATING TEST RESTAURANT ---');

    const testRestaurant = {
        nome: 'Restaurante Teste',
        email: 'teste@pedeai.com',
        senha: '123', // Senha simples para teste, conforme lógica de comparação direta
        quantidade_mesas: '10',
        quantidade_max_mesas: '20',
        horario_fecha_cozinha: '23:00'
    };

    const { data, error } = await supabase
        .from('Restaurantes')
        .insert(testRestaurant)
        .select();

    if (error) {
        console.log('RESULT: ERROR');
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log('RESULT: SUCCESS');
        console.log(JSON.stringify(data, null, 2));
    }

    console.log('--- FINISHED ---');
}

createTestRestaurant();
