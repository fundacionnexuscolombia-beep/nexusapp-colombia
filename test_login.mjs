import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://svnywngprlkhhxdbiwds.supabase.co',
  'sb_publishable_iCh_t_lt7y96mmQ-RVZ8ig_9osIypi9' // Use anon key to simulate app login
);

async function testLogin() {
  const users = [
    { email: 'laugt0880@gmail.com', pass: '1029649609' },
    { email: 'alejandroalejand29@gmail.com', pass: '1044531274' }
  ];

  console.log('--- TEST DE LOGIN PROGRAMÁTICO ---');

  for (const u of users) {
    console.log(`\nProbando login para: ${u.email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: u.email,
      password: u.pass
    });

    if (error) {
      console.error(`❌ FALLÓ: ${error.message} (Status: ${error.status})`);
    } else {
      console.log(`✅ ÉXITO: Usuario autenticado. ID: ${data.user.id}`);
    }
  }
}

testLogin();
