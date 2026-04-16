import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication via hardcoded token
    const adminToken = req.headers['x-admin-token'];
    const HARDCODED_ADMIN_TOKEN = 'admin-secret-key';

    if (!adminToken || adminToken !== HARDCODED_ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing admin token' });
    }

    // Create Supabase client - use the service role from environment if available
    // Fall back to anon key (frontend will handle RLS)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return res.status(500).json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      });
    }

    // Use service role if available (bypasses RLS), otherwise use anon key
    const apiKey = serviceRoleKey || anonKey;
    const supabase = createClient(supabaseUrl, apiKey);

    // Get pagination parameters
    const page = parseInt(req.query.page || '0');
    const limit = parseInt(req.query.limit || '20');
    const offset = page * limit;

    // Fetch all orders with user details
    const { data: orders, error: ordersError, count } = await supabase
      .from('orders')
      .select(
        'id, user_id, items, amount, status, created_at, updated_at, phone, address, city, state, pincode, users(email, full_name), color, code, payment_id, razorpay_order_id, tracking_id',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return res.status(500).json({ 
        error: 'Failed to fetch orders',
        details: ordersError.message 
      });
    }

    // Return orders with pagination metadata
    return res.status(200).json({
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: (page + 1) * limit < (count || 0)
      }
    });

  } catch (error) {
    console.error('❌ Admin orders API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
