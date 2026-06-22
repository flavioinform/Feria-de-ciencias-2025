import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('proyectos')
    .select('id, titulo, participantes, estudiantes:participantes(nombre)')
    .limit(1);
  console.log("Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}
test();
