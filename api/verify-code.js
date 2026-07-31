import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { code, device_id } = req.body;

    if (!code || !device_id) {
      return res.status(400).json({ error: 'Code ou device_id manquant' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Chercher le code
    const { data, error } = await supabase
      .from('codes')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Code invalide' });
    }

    // Cas 1 : le code n'a jamais été utilisé → on l'associe à cette machine
    if (!data.device_id) {
      const { error: updateError } = await supabase
        .from('codes')
        .update({ 
          device_id: device_id,
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('code', cleanCode);

      if (updateError) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.status(200).json({ success: true, message: 'Code activé sur cette machine' });
    }

    // Cas 2 : le code est déjà lié à une machine
    if (data.device_id === device_id) {
      // Même machine → accès autorisé
      return res.status(200).json({ success: true, message: 'Accès autorisé' });
    } else {
      // Autre machine → refusé
      return res.status(403).json({ error: 'Ce code est déjà utilisé sur une autre machine' });
    }

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}