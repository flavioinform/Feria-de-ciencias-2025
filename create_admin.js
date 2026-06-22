import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vmomdwcppeoaazaqojdu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtb21kd2NwcGVvYWF6YXFvamR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxOTcwMjMsImV4cCI6MjA5NDc3MzAyM30.ZPYpl_6TES0Y7pENkdFdeP_sREZ6Ek4IX26QmJQYYCM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Creating new user as visitante...');
  const { data, error } = await supabase.from('usuarios').insert([
    {
      rut: '146803180', // the normalizarRut strips dashes
      pin_hash: 'Feria2026F',
      role: 'visitante',
      nombre: 'Administrador'
    }
  ]).select();

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Successfully inserted as visitante:', data);
    
    console.log('Attempting to update to admin...');
    const { data: updateData, error: updateError } = await supabase
      .from('usuarios')
      .update({ role: 'admin' })
      .eq('rut', '146803180')
      .select();
      
    if (updateError) {
       console.error('Update Error:', updateError);
    } else {
       console.log('Successfully updated to admin:', updateData);
    }
  }
}

main();
