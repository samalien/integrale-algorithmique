import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Autoriser uniquement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code manquant' });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Chercher le code dans Supabase
    const { data, error } = await supabase
      .from('codes')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Code invalide' });
    }

    // 2. Vérifier s'il a déjà été utilisé
    if (data.used === true) {
      return res.status(400).json({ error: 'Code déjà utilisé' });
    }

    // 3. Marquer le code comme utilisé
    const { error: updateError } = await supabase
      .from('codes')
      .update({ 
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('code', cleanCode);

    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    // 4. Succès
    return res.status(200).json({ 
      success: true,
      message: 'Code valide'
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}