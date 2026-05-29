import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data: user, error: userError } = await supabase.from('profiles').select('id').limit(1).single();
  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      user_id: user.id,
      topic_id: 'test-topic',
      score: 5.0,
      passed: true,
      type: 'quiz'
    })
    .select()
    .single();

  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Insert Success:", data);
  }
}

testInsert();
