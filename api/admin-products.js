import { createClient } from '@supabase/supabase-js';
import { handleCors } from './_cors.js';

const HARDCODED_ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-key';

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: Missing Supabase service role credentials');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function sanitizeProductData(raw = {}) {
  return {
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    quantity: Number.isFinite(Number(raw.quantity)) ? Number(raw.quantity) : 1,
    fabric: typeof raw.fabric === 'string' ? raw.fabric.trim() : '',
    original_price: Number.isFinite(Number(raw.original_price)) ? Number(raw.original_price) : 0,
    discount_price: Number.isFinite(Number(raw.discount_price)) ? Number(raw.discount_price) : 0,
    category: typeof raw.category === 'string' ? raw.category.trim() : '',
    color: Array.isArray(raw.color) ? raw.color : [],
    code: Array.isArray(raw.code) ? raw.code : [],
    hero_image_url: typeof raw.hero_image_url === 'string' ? raw.hero_image_url : '',
  };
}

export default async function handler(req, res) {
  const corsResponse = handleCors(req, res, ['POST', 'PATCH', 'DELETE', 'OPTIONS']);
  if (corsResponse) return;

  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== HARDCODED_ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing admin token' });
    }

    const supabase = getSupabaseAdminClient();
    const body = req.body || {};

    if (req.method === 'POST') {
      const productData = sanitizeProductData(body.productData);
      if (!productData.title) {
        return res.status(400).json({ error: 'Product title is required' });
      }

      const { data: product, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to create product', details: error.message });
      }

      return res.status(200).json({ message: 'Product created successfully', product });
    }

    if (req.method === 'PATCH') {
      const { productId } = body;
      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      const productData = sanitizeProductData(body.productData);
      if (!productData.title) {
        return res.status(400).json({ error: 'Product title is required' });
      }

      const { data: product, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to update product', details: error.message });
      }

      return res.status(200).json({ message: 'Product updated successfully', product });
    }

    const { productId } = body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete product', details: error.message });
    }

    return res.status(200).json({ message: 'Product deleted successfully', productId });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}
