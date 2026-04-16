import { createClient } from '@supabase/supabase-js';
import { sendOrderEmails } from '../emailService.js';
import { handleCors } from './_cors.js';

const VALID_STATUSES = ['processing', 'out_for_delivery', 'delivered'];
const HARDCODED_ADMIN_TOKEN = 'admin-secret-key';

export default async function handler(req, res) {
  const corsResponse = handleCors(req, res, ['POST', 'OPTIONS']);
  if (corsResponse) return;

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication via hardcoded token
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== HARDCODED_ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing admin token' });
    }

    // Extract order ID and new status from request body
    const { orderId, status } = req.body;

    // Validate required fields
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status is one of allowed values
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    // Create Supabase client with service role (to bypass RLS for admin operations)
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

    // Update order status in database
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('id, status, updated_at, user_id, items, amount, created_at, phone, address, city, state, pincode');

    if (updateError) {
      console.error('❌ Error updating order status:', updateError);
      return res.status(500).json({
        error: 'Failed to update order status',
        details: updateError.message,
      });
    }

    // Check if order was found and updated
    if (!updatedOrder || updatedOrder.length === 0) {
      return res.status(404).json({
        error: 'Order not found',
        orderId,
      });
    }

    // Fetch full order data including user email for email sending
    const { data: fullOrderData, error: fetchError } = await supabase
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

    if (!fetchError && fullOrderData) {
      // Fetch user email separately to handle RLS policies
      let userEmail = null;
      let userName = null;
      
      if (fullOrderData.user_id) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', fullOrderData.user_id)
            .limit(1)
            .maybeSingle();
          
          if (userError) {
            console.error(`❌ Error fetching user data for user_id ${fullOrderData.user_id}:`, userError);
          } else if (userData) {
            userEmail = userData.email;
            userName = userData.full_name;
          } else {
            console.warn(`⚠️ No user found with user_id ${fullOrderData.user_id}`);
          }
        } catch (err) {
          console.error(`❌ Exception fetching user data: ${err.message}`);
        }
      } else {
        console.warn(`⚠️ Order ${orderId} has no user_id associated`);
      }

      // Check if we got the customer email
      if (!userEmail) {
        console.error(`❌ Could not retrieve customer email for order ${orderId}. Skipping email send.`);
        return res.status(200).json({
          message: 'Order status updated successfully (email sending failed - missing customer email)',
          order: updatedOrder[0],
        });
      }

      // Prepare order data for email template
      const emailOrderData = {
        id: fullOrderData.id,
        user_email: userEmail,
        email: userEmail,
        user_name: userName,
        items: fullOrderData.items || [],
        amount: fullOrderData.amount || 0,
        shipping: fullOrderData.shipping || 0,
        created_at: fullOrderData.created_at,
        updated_at: fullOrderData.updated_at,
        paymentId: fullOrderData.payment_id,
        phone: fullOrderData.phone,
        address: fullOrderData.address,
        city: fullOrderData.city,
        state: fullOrderData.state,
        pincode: fullOrderData.pincode,
      };

      // Send status update email to customer
      try {
        const emailResult = await sendOrderEmails(emailOrderData, status);
        if (emailResult.success) {
          console.log(`✅ Status update email sent for order ${orderId} to ${emailOrderData.email} (status: ${status})`);
        } else {
          console.error(`❌ Failed to send status email for order ${orderId}:`, emailResult.error);
        }
      } catch (emailError) {
        console.error(`❌ Error sending status email for order ${orderId}:`, emailError.message);
      }
    } else {
      console.error(`❌ Could not fetch full order data for order ${orderId}:`, fetchError);
    }

    // Return updated order data
    return res.status(200).json({
      message: 'Order status updated successfully',
      order: updatedOrder[0],
    });
  } catch (error) {
    console.error('❌ Update order status API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}
