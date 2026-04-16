import { createClient } from '@supabase/supabase-js';
import { sendOrderEmails } from '../emailService.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, customerEmail } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Create Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Supabase credentials',
      });
    }

    // Use service role if available (bypasses RLS), otherwise use anon key
    const apiKey = serviceRoleKey || anonKey;
    const supabase = createClient(supabaseUrl, apiKey);

    // Fetch order data from database
    const { data: orderData, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        items,
        amount,
        shipping,
        status,
        created_at,
        updated_at,
        payment_id,
        phone,
        address,
        city,
        state,
        pincode
      `)
      .eq('id', orderId)
      .single();

    if (fetchError || !orderData) {
      console.error('Error fetching order:', fetchError);
      return res.status(404).json({
        error: 'Order not found',
        orderId,
      });
    }

    // Fetch user email separately to handle RLS policies
    let userEmail = customerEmail;
    let userName = null;
    
    if (!userEmail && orderData.user_id) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', orderData.user_id)
          .limit(1)
          .maybeSingle();
        
        if (!userError && userData) {
          userEmail = userData.email;
          userName = userData.full_name;
        }
      } catch (err) {
        console.warn(`⚠️ Could not fetch user data: ${err.message}`);
      }
    }

    // Prepare order data for email template
    const emailOrderData = {
      id: orderData.id,
      user_email: userEmail,
      email: userEmail,
      user_name: userName,
      items: orderData.items || [],
      amount: orderData.amount || 0,
      shipping: orderData.shipping || 0,
      created_at: orderData.created_at,
      paymentId: orderData.payment_id,
      phone: orderData.phone,
      address: orderData.address,
      city: orderData.city,
      state: orderData.state,
      pincode: orderData.pincode,
    };

    // Send confirmation email
    const emailResult = await sendOrderEmails(emailOrderData, 'order_confirmation');

    if (!emailResult.success) {
      console.error('Failed to send confirmation email:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send confirmation email',
        details: emailResult.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Order confirmation email sent successfully',
      orderId,
      customerEmail: emailOrderData.email,
      messageIds: {
        customerEmail: emailResult.customerEmail,
        adminEmail: emailResult.adminEmail,
      },
    });

  } catch (error) {
    console.error('❌ Send order confirmation API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}
