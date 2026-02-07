
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://iopkqqyutateeppnyswd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ta7jTCEA5Url3_og16RTkA_tI14TD63";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testPedidos() {
    console.log('--- TESTING PEDIDOS ---');
    const { data, error } = await supabase
        .from('Pedidos')
        .select('id')
        .limit(1);

    if (error) {
        console.log('RESULT PEDIDOS: ERROR');
        console.error(JSON.stringify(error));
    } else {
        console.log('RESULT PEDIDOS: SUCCESS');
    }
}

testPedidos();
