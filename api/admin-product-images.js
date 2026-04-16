import { createClient } from '@supabase/supabase-js';
import { handleCors } from './_cors.js';

const HARDCODED_ADMIN_TOKEN = 'admin-secret-key';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: Missing Supabase service role credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export default async function handler(req, res) {
  const corsResponse = handleCors(req, res, ['POST', 'DELETE', 'OPTIONS']);
  if (corsResponse) return;

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== HARDCODED_ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing admin token' });
    }

    const { productId, imageUrls = [] } = req.body || {};

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const supabase = getSupabaseAdminClient();

    const { error: deleteError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);

    if (deleteError) {
      return res.status(500).json({
        error: 'Failed to delete existing product images',
        details: deleteError.message,
      });
    }

    if (req.method === 'DELETE') {
      return res.status(200).json({
        message: 'Product images deleted successfully',
        productId,
      });
    }

    if (!Array.isArray(imageUrls)) {
      return res.status(400).json({ error: 'imageUrls must be an array' });
    }

    const sanitizedImageUrls = imageUrls
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
      .slice(0, 3);

    if (sanitizedImageUrls.length === 0) {
      return res.status(200).json({
        message: 'Product images updated successfully',
        productId,
        count: 0,
      });
    }

    const rowsToInsert = sanitizedImageUrls.map((image_url) => ({
      product_id: productId,
      image_url,
    }));

    const { error: insertError } = await supabase
      .from('product_images')
      .insert(rowsToInsert);

    if (insertError) {
      return res.status(500).json({
        error: 'Failed to save product images',
        details: insertError.message,
      });
    }

    return res.status(200).json({
      message: 'Product images updated successfully',
      productId,
      count: rowsToInsert.length,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}
