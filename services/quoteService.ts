
const quotes = [
    "Cada paso que das hoy te acerca a tu meta. ¡Estamos orgullosos de ti!",
    "Tu esfuerzo de hoy es el éxito de mañana. ¡Sigue adelante!",
    "El aprendizaje es un tesoro que te seguirá a todas partes. ¡Aprovecha el día!",
    "No te detengas hasta que te sientas orgulloso. ¡Tú puedes!",
    "La persistencia es la clave del éxito. ¡Hoy es un gran día para aprender!",
    "Cada módulo completado es una gran victoria. ¡Vamos por más!",
    "El conocimiento es poder. ¡Sigue construyendo tu futuro con Nexus!",
    "Cree en ti mismo y todo será posible. ¡Excelente jornada de estudio!",
    "La educación es el arma más poderosa para cambiar el mundo.",
    "Tus metas no tienen límites, tu dedicación tampoco debería tenerlos."
];

export const quoteService = {
    getDailyQuote: (): string => {
        const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        return quotes[dayOfYear % quotes.length];
    }
};
