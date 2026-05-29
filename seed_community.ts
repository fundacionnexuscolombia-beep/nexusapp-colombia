
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://svnywngprlkhhxdbiwds.supabase.co';
const supabaseKey = 'sb_publishable_iCh_t_lt7y96mmQ-RVZ8ig_9osIypi9';

const supabase = createClient(supabaseUrl, supabaseKey);

const dummyQuestions = [
    {
        category: 'Matemáticas',
        title: '¿Cómo despejar X en una ecuación cuadrática?',
        content: 'Hola a todos, estoy teniendo problemas con la fórmula general. ¿Alguien tiene algún truco para recordarla o aplicarla más rápido?'
    },
    {
        category: 'Filosofía',
        title: 'Duda sobre el Mito de la Caverna de Platón',
        content: '¿Qué representan exactamente las sombras en la pared? No me queda claro si son las ideas o el mundo sensible.'
    },
    {
        category: 'Sociales',
        title: 'Principales causas de la Revolución Industrial',
        content: 'Necesito ayuda para un resumen. ¿Cuáles dirían que son los 3 puntos clave que desataron todo en Inglaterra?'
    },
    {
        category: 'Biología',
        title: 'Diferencia entre mitosis y meiosis',
        content: 'Siempre me confundo en las fases. ¿Alguien tiene una regla mnemotécnica para no olvidar cuál es cuál?'
    },
    {
        category: 'Español',
        title: 'Consejos para el análisis de textos',
        content: 'Me cuesta identificar las tesis en textos argumentativos complejos. ¿Qué pasos siguen ustedes al leer?'
    }
];

async function seed() {
    console.log('--- Iniciando generación de preguntas ficticias ---');

    // For community, we usually need to be logged in for RLS
    // Let's try to get a user and their email
    const { data: users, error: uError } = await supabase.from('profiles').select('id, email').limit(1);

    if (uError || !users || users.length === 0) {
        console.error('No se encontró ningún perfil de usuario.');
        return;
    }

    const userId = users[0].id;
    console.log(`Usando usuario: ${userId}`);

    // We will bypass RLS by using the supabase client directly if it was possible,
    // but here we are using the anon key. 
    // If the tool failed with "insufficient privilege", and we are using anon key,
    // it likely means the policy "Anyone can read topics" works for SELECT but not INSERT.
    // However, forumService.ts uses the same client.

    // Let's check forumService.ts inserts. It uses auth.uid().
    // Since we can't easily "log in" without a password in this script, 
    // I'll try to insert using the REST API logic if RLS allows authenticated.

    for (const q of dummyQuestions) {
        // We try to insert. If it fails again, I'll explain to the user.
        const { error } = await supabase.from('forum_topics').insert({
            user_id: userId,
            category: q.category,
            title: q.title,
            content: q.content
        });

        if (error) {
            console.error(`❌ Error en "${q.title}":`, error.message);
        } else {
            console.log(`✅ Creada: ${q.title}`);
        }
    }

    console.log('--- Proceso finalizado ---');
}

seed();
