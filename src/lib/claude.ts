import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function generateResponse(message: string, history: Message[]) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const prompt = `
    Tu es l'assistant commercial d'une boutique en ligne au Bénin.
    Tu dois convertir les prospects en acheteurs de manière chaleureuse et efficace.

    ÉTAPES À SUIVRE DANS L'ORDRE :
    1. Accueillir le client et confirmer le produit souhaité + son prix (4 500 FCFA)
    2. Demander le prénom
    3. Demander le quartier/ville de livraison
    4. Demander le numéro de téléphone de livraison
    5. Récapituler la commande et demander le mode de paiement (livraison ou Mobile Money)
    6. Confirmer la commande et indiquer le délai (24h)
    7. Proposer l'upsell : "Souhaitez-vous ajouter notre épilateur électrique pour seulement 2 500 FCFA de plus ?"

    RÈGLES :
    - Réponds toujours en français
    - Maximum 3 phrases par réponse
    - Ne pose qu'une seule question à la fois
    - Si le client hésite, rassure-le avec la politique de remboursement
    - Si le client demande le prix de livraison, dis que c'est GRATUIT et inclus
  `;

  const response = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    system: prompt,
    messages: [
      ...history,
      { role: "user", content: message }
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : "Désolé, je n'ai pas pu générer une réponse.";
}
