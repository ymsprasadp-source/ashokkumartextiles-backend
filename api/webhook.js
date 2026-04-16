import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendOrderEmails } from '../emailService.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function setJson(res) {
  res.setHeader('Content-Type', 'application/json');
}

async function parseBody(req) {
  if (req.body) return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    setJson(res);
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      console.error('Missing webhook signature');
      setJson(res);
      return res.status(400).end(JSON.stringify({ error: 'Missing signature' }));
    }

    const payload = await parseBody(req);
    
    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature, process.env.RAZORPAY_WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      setJson(res);
      return res.status(400).end(JSON.stringify({ error: 'Invalid signature' }));
    }

    const event = payload.event;
    const paymentData = payload.payload.payment.entity;
    
    console.log('Webhook received:', {
      event,
      payment_id: paymentData.id,
      order_id: paymentData.order_id,
      status: paymentData.status,
      amount: paymentData.amount
    });

    // Handle different payment events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(paymentData);
        break;
      case 'payment.failed':
        await handlePaymentFailed(paymentData);
        break;
      case 'payment.authorized':
        await handlePaymentAuthorized(paymentData);
        break;
      default:
        console.log('Unhandled webhook event:', event);
    }

    setJson(res);
    return res.status(200).end(JSON.stringify({ status: 'success' }));
  } catch (error) {
    console.error('Webhook processing error:', error);
    setJson(res);
    return res.status(500).end(JSON.stringify({ error: 'Webhook processing failed' }));
  }
}

async function handlePaymentCaptured(paymentData) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_id: paymentData.id,
        payment_status: 'completed',
        status: 'processing',
        payment_captured_at: new Date().toISOString(),
        payment_amount: paymentData.amount,
        payment_method: paymentData.method
      })
      .eq('razorpay_order_id', paymentData.order_id);

    if (error) {
      console.error('Error updating order on payment capture:', error);
      return;
    }

    console.log('Order updated successfully on payment capture:', paymentData.order_id);

    // Fetch order data to send confirmation email
    try {
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
        .eq('razorpay_order_id', paymentData.order_id)
        .single();

      if (!fetchError && orderData) {
        // Fetch user email separately to handle RLS policies
        let userEmail = null;
        let userName = null;
        
        if (orderData.user_id) {
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

        // Send order confirmation email
        const emailResult = await sendOrderEmails(emailOrderData, 'order_confirmation');
        if (emailResult.success) {
          console.log(`✅ Payment confirmation email sent for order ${orderData.id} to ${emailOrderData.email}`);
        } else {
          console.warn(`⚠️ Failed to send payment confirmation email for order ${orderData.id}:`, emailResult.error);
        }
      }
    } catch (emailError) {
      console.error(`❌ Error sending payment confirmation email:`, emailError.message);
    }
  } catch (error) {
    console.error('Error in handlePaymentCaptured:', error);
  }
}

async function handlePaymentFailed(paymentData) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_id: paymentData.id,
        payment_status: 'failed',
        status: 'payment_failed',
        payment_failed_at: new Date().toISOString(),
        payment_error_code: paymentData.error_code,
        payment_error_description: paymentData.error_description
      })
      .eq('razorpay_order_id', paymentData.order_id);

    if (error) {
      console.error('Error updating order on payment failure:', error);
    } else {
      console.log('Order updated successfully on payment failure:', paymentData.order_id);
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

async function handlePaymentAuthorized(paymentData) {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_id: paymentData.id,
        payment_status: 'authorized',
        payment_authorized_at: new Date().toISOString()
      })
      .eq('razorpay_order_id', paymentData.order_id);

    if (error) {
      console.error('Error updating order on payment authorization:', error);
    } else {
      console.log('Order updated successfully on payment authorization:', paymentData.order_id);
    }
  } catch (error) {
    console.error('Error in handlePaymentAuthorized:', error);
  }
}
