// Email templates for order status notifications

export const emailTemplates = {
  orderConfirmation: (orderData) => {
    // Convert paise to rupees for display
    const convertPaiseToRupees = (paise) => {
      if (!paise) return 0;
      return (paise / 100).toFixed(2);
    };

    const itemsHTML = (orderData.items || [])
      .map(item => {
        const price = convertPaiseToRupees(item.price);
        const qty = item.qty || 1;
        const total = (price * qty).toFixed(2);
        
        return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            <div style="display:flex;gap:12px;align-items:center;">
              ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name || 'Product'}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">` : '<div style="width:60px;height:60px;background:#f0f0f0;border-radius:4px;"></div>'}
              <div>
                <p style="margin:0;font-weight:bold;">${item.name || 'Product'}</p>
                ${item.variant ? `<p style="margin:4px 0 0 0;color:#666;font-size:14px;">Color: ${item.variant}</p>` : ''}
              </div>
            </div>
          </td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">${qty}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">₹${parseFloat(total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 28px; color: #c9a96e; }
            .header p { margin: 8px 0 0 0; opacity: 0.9; }
            .content { padding: 30px; }
            .section { margin-bottom: 25px; }
            .section h2 { color: #1a1a2e; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #c9a96e; padding-bottom: 10px; }
            .order-info { background: #f9f7f4; padding: 15px; border-radius: 6px; margin-bottom: 15px; }
            .order-info p { margin: 8px 0; color: #333; }
            .order-info strong { color: #1a1a2e; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            table th { background: #f0f0f0; padding: 12px; text-align: left; font-weight: bold; color: #1a1a2e; border-bottom: 2px solid #ddd; }
            .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .summary-row strong { color: #1a1a2e; }
            .total-row { display: flex; justify-content: space-between; padding: 15px 0; font-size: 18px; font-weight: bold; color: #c9a96e; border-top: 2px solid #c9a96e; }
            .address-box { background: #fffbf7; padding: 15px; border-left: 4px solid #c9a96e; border-radius: 4px; margin: 15px 0; }
            .address-box p { margin: 6px 0; color: #333; }
            .address-box strong { color: #1a1a2e; }
            .cta-button { background: linear-gradient(135deg, #c9a96e 0%, #b8944d 100%); color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; font-weight: bold; }
            .footer { background: #1a1a2e; color: white; padding: 25px; text-align: center; font-size: 12px; }
            .footer p { margin: 8px 0; }
            .footer strong { color: #c9a96e; }
            .badge { display: inline-block; background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin: 0 0 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Order Confirmed!</h1>
              <p>Thank you for your order</p>
            </div>
            
            <div class="content">
              <div class="badge">🎉 Payment Successful</div>
              
              <div class="section">
                <div class="order-info">
                  <p><strong>Order Number:</strong> <span style="color: #c9a96e; font-weight: bold; font-size: 16px;">#${orderData.id}</span></p>
                  <p><strong>Order Date:</strong> ${new Date(orderData.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p><strong>Order Status:</strong> <span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-weight: bold;">Processing</span></p>
                  ${orderData.paymentId ? `<p><strong>Payment ID:</strong> ${orderData.paymentId}</p>` : ''}
                </div>
              </div>

              <div class="section">
                <h2>📦 Order Summary</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style="text-align:center;">Qty</th>
                      <th style="text-align:right;">Price</th>
                      <th style="text-align:right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHTML}
                  </tbody>
                </table>
                
                <div class="summary-row">
                  <strong>Subtotal:</strong>
                  <strong>₹${parseFloat(convertPaiseToRupees(orderData.amount)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div class="summary-row">
                  <strong>Shipping:</strong>
                  <strong style="color: #10b981;">₹${parseFloat(convertPaiseToRupees(orderData.shipping || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div class="total-row">
                  <span>Total Paid:</span>
                  <span>₹${parseFloat(convertPaiseToRupees((orderData.amount || 0) + (orderData.shipping || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              ${orderData.address ? `
                <div class="section">
                  <h2>🚚 Delivery Address</h2>
                  <div class="address-box">
                    <p><strong>${orderData.user_name || 'Recipient'}</strong></p>
                    <p>${orderData.address || ''}</p>
                    <p>${orderData.city || ''}, ${orderData.state || ''}</p>
                    <p><strong>PIN Code:</strong> ${orderData.pincode || ''}</p>
                    ${orderData.phone ? `<p><strong>Phone:</strong> ${orderData.phone}</p>` : ''}
                  </div>
                </div>
              ` : ''}

              <div class="section">
                <h2>📋 What's Next?</h2>
                <p>We're preparing your order for shipment. Here's what to expect:</p>
                <ul style="padding-left: 20px;">
                  <li>We'll process your order within 1-2 business days</li>
                  <li>You'll receive a shipping notification with tracking details</li>
                  <li>Your order will be delivered within 5-7 business days</li>
                  <li>We'll keep you updated every step of the way</li>
                </ul>
              </div>

              <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #065f46;"><strong>💚 Thank You!</strong></p>
                <p style="margin: 8px 0 0 0; color: #065f46;">We appreciate your business and look forward to serving you again.</p>
              </div>
            </div>

            <div class="footer">
              <p style="font-weight: bold; color: #c9a96e;">ASHOK KUMAR TEXTILES</p>
              <p>Premium Quality Fabrics & Textiles</p>
              <p>Kanchan Towers, Plot No-1, beside Swami Theatre<br>Rajarajeswaripuram, Pattabhipuram<br>Guntur, Andhra Pradesh 522006</p>
              <p>📞 097044 47158<br>📸 <a href="https://www.instagram.com/ashok_kumar_textiles/" style="color: #c9a96e; text-decoration: none;">Instagram</a></p>
              <p style="margin-top: 15px; border-top: 1px solid #444; padding-top: 15px; opacity: 0.8;">This is an automated email. Please do not reply. For support, contact us at the phone number above.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  },

  processingEmail: (orderData) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; color: #c9a96e; }
          .content { padding: 30px; }
          .status-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 15px 0; }
          .section { margin-bottom: 25px; }
          .timeline { position: relative; padding: 20px 0; }
          .timeline-item { display: flex; margin-bottom: 20px; }
          .timeline-dot { width: 20px; height: 20px; background: #c9a96e; border-radius: 50%; flex-shrink: 0; margin-top: 5px; margin-right: 15px; }
          .timeline-item.active .timeline-dot { background: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2); }
          .timeline-item.inactive .timeline-dot { background: #d1d5db; }
          .timeline-content { flex: 1; }
          .timeline-content h3 { margin: 0 0 5px 0; color: #1a1a2e; font-size: 16px; }
          .timeline-content p { margin: 0; color: #666; font-size: 14px; }
          .info-box { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 15px 0; }
          .footer { background: #1a1a2e; color: white; padding: 25px; text-align: center; font-size: 12px; }
          .footer p { margin: 8px 0; }
          .footer strong { color: #c9a96e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚙️ Order Processing</h1>
            <p>Your order is being prepared</p>
          </div>
          
          <div class="content">
            <div class="status-badge">🏗️ Processing in Progress</div>
            
            <div class="section">
              <h2 style="color: #1a1a2e; margin: 0 0 15px 0;">Order #${orderData.id}</h2>
              <p style="color: #666;">Updated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div class="info-box">
              <p style="margin: 0;"><strong>✓ Payment Received</strong></p>
              <p style="margin: 5px 0 0 0;">We've confirmed your payment of <strong>₹${(orderData.amount / 100).toFixed(2).toLocaleString('en-IN')}</strong></p>
            </div>

            <div class="section">
              <h2 style="color: #1a1a2e; font-size: 18px; margin: 0 0 15px 0;">📦 Delivery Timeline</h2>
              <div class="timeline">
                <div class="timeline-item active">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Order Confirmed</h3>
                    <p>${new Date(orderData.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div class="timeline-item active">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Processing</h3>
                    <p>Your order is being prepared for shipment</p>
                  </div>
                </div>
                <div class="timeline-item inactive">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Out for Delivery</h3>
                    <p>Coming soon...</p>
                  </div>
                </div>
                <div class="timeline-item inactive">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Delivered</h3>
                    <p>Coming soon...</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="section" style="background: #ecfdf5; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">
              <p style="margin: 0; color: #065f46;"><strong>✓ Your order is secure</strong></p>
              <p style="margin: 8px 0 0 0; color: #065f46; font-size: 14px;">We're carefully packing your items to ensure they arrive in perfect condition.</p>
            </div>
          </div>

          <div class="footer">
            <p style="font-weight: bold; color: #c9a96e;">ASHOK KUMAR TEXTILES</p>
            <p>Kanchan Towers, Plot No-1, beside Swami Theatre<br>Guntur, Andhra Pradesh 522006</p>
            <p>📞 097044 47158</p>
          </div>
        </div>
      </body>
    </html>
  `,

  outForDeliveryEmail: (orderData) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; color: #c9a96e; }
          .content { padding: 30px; }
          .status-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 15px 0; }
          .section { margin-bottom: 25px; }
          .timeline { position: relative; padding: 20px 0; }
          .timeline-item { display: flex; margin-bottom: 20px; }
          .timeline-dot { width: 20px; height: 20px; background: #3b82f6; border-radius: 50%; flex-shrink: 0; margin-top: 5px; margin-right: 15px; }
          .timeline-item.active .timeline-dot { background: #10b981; }
          .timeline-item.current .timeline-dot { background: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2); }
          .timeline-item.inactive .timeline-dot { background: #d1d5db; }
          .timeline-content { flex: 1; }
          .timeline-content h3 { margin: 0 0 5px 0; color: #1a1a2e; font-size: 16px; }
          .timeline-content p { margin: 0; color: #666; font-size: 14px; }
          .alert-box { background: #dbeafe; padding: 15px; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 15px 0; }
          .footer { background: #1a1a2e; color: white; padding: 25px; text-align: center; font-size: 12px; }
          .footer p { margin: 8px 0; }
          .footer strong { color: #c9a96e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚚 Out for Delivery!</h1>
            <p>Your package is on its way</p>
          </div>
          
          <div class="content">
            <div class="status-badge">📍 Out for Delivery</div>
            
            <div class="section">
              <h2 style="color: #1a1a2e; margin: 0 0 15px 0;">Order #${orderData.id}</h2>
              <p style="color: #666;">Updated: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div class="alert-box">
              <p style="margin: 0;"><strong>🎯 Your package is out for delivery!</strong></p>
              <p style="margin: 5px 0 0 0;">It should arrive at your doorstep shortly. Please be available to receive it.</p>
            </div>

            <div class="section">
              <h2 style="color: #1a1a2e; font-size: 18px; margin: 0 0 15px 0;">📦 Delivery Timeline</h2>
              <div class="timeline">
                <div class="timeline-item active">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Order Confirmed</h3>
                    <p>${new Date(orderData.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div class="timeline-item active">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Processing</h3>
                    <p>Order prepared and packed</p>
                  </div>
                </div>
                <div class="timeline-item current">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Out for Delivery</h3>
                    <p>On the way to you right now!</p>
                  </div>
                </div>
                <div class="timeline-item inactive">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Delivered</h3>
                    <p>Coming soon...</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="section" style="background: #e0f2fe; padding: 15px; border-radius: 6px; border-left: 4px solid #0284c7;">
              <p style="margin: 0; color: #0c4a6e;"><strong>💡 Pro Tip</strong></p>
              <p style="margin: 8px 0 0 0; color: #0c4a6e; font-size: 14px;">Please keep your phone handy. The delivery partner may contact you to confirm the delivery time.</p>
            </div>
          </div>

          <div class="footer">
            <p style="font-weight: bold; color: #c9a96e;">ASHOK KUMAR TEXTILES</p>
            <p>Kanchan Towers, Plot No-1, beside Swami Theatre<br>Guntur, Andhra Pradesh 522006</p>
            <p>📞 097044 47158</p>
          </div>
        </div>
      </body>
    </html>
  `,

  deliveredEmail: (orderData) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .status-badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 15px 0; }
          .section { margin-bottom: 25px; }
          .timeline { position: relative; padding: 20px 0; }
          .timeline-item { display: flex; margin-bottom: 20px; }
          .timeline-dot { width: 20px; height: 20px; background: #10b981; border-radius: 50%; flex-shrink: 0; margin-top: 5px; margin-right: 15px; }
          .timeline-item.active .timeline-dot { background: #10b981; }
          .timeline-content { flex: 1; }
          .timeline-content h3 { margin: 0 0 5px 0; color: #1a1a2e; font-size: 16px; }
          .timeline-content p { margin: 0; color: #666; font-size: 14px; }
          .success-box { background: #ecfdf5; padding: 20px; border-left: 4px solid #10b981; border-radius: 4px; margin: 20px 0; }
          .success-box h3 { margin: 0 0 10px 0; color: #065f46; }
          .success-box p { margin: 8px 0; color: #065f46; }
          .cta-button { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; font-weight: bold; }
          .footer { background: #1a1a2e; color: white; padding: 25px; text-align: center; font-size: 12px; }
          .footer p { margin: 8px 0; }
          .footer strong { color: #c9a96e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Order Delivered!</h1>
            <p>Thank you for shopping with us</p>
          </div>
          
          <div class="content">
            <div class="status-badge">🎉 Successfully Delivered</div>
            
            <div class="section">
              <h2 style="color: #1a1a2e; margin: 0 0 15px 0;">Order #${orderData.id}</h2>
              <p style="color: #666;">Delivered: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div class="section">
              <h2 style="color: #1a1a2e; font-size: 18px; margin: 0 0 15px 0;">📦 Delivery Timeline</h2>
              <div class="timeline">
                <div class="timeline-item active">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Order Confirmed</h3>
                    <p>${new Date(orderData.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div class="timeline-item active">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Processing</h3>
                    <p>Order prepared and packed</p>
                  </div>
                </div>
                <div class="timeline-item active">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Out for Delivery</h3>
                    <p>On the way</p>
                  </div>
                </div>
                <div class="timeline-item active">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Delivered ✓</h3>
                    <p>${new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="success-box">
              <h3>🎊 Order Complete!</h3>
              <p>Your order has been successfully delivered. We hope you love your purchase!</p>
              <p><strong>Order Total:</strong> ₹${(orderData.amount / 100).toFixed(2).toLocaleString('en-IN')}</p>
            </div>

            <div class="section" style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e;"><strong>📝 Share Your Feedback</strong></p>
              <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">We'd love to hear about your experience! Your feedback helps us improve our service.</p>
            </div>

            <div class="section" style="text-align: center;">
              <a href="https://www.instagram.com/ashok_kumar_textiles/" class="cta-button">Follow Us on Instagram</a>
            </div>

            <div class="section" style="background: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center;">
              <p style="margin: 0; color: #4b5563; font-size: 14px;"><strong>Thank You!</strong></p>
              <p style="margin: 8px 0 0 0; color: #4b5563; font-size: 14px;">We appreciate your business and look forward to serving you again.</p>
            </div>
          </div>

          <div class="footer">
            <p style="font-weight: bold; color: #c9a96e;">ASHOK KUMAR TEXTILES</p>
            <p>Premium Quality Fabrics & Textiles</p>
            <p>Kanchan Towers, Plot No-1, beside Swami Theatre<br>Guntur, Andhra Pradesh 522006</p>
            <p>📞 097044 47158<br>📸 <a href="https://www.instagram.com/ashok_kumar_textiles/" style="color: #c9a96e; text-decoration: none;">Instagram</a></p>
          </div>
        </div>
      </body>
    </html>
  `
};
