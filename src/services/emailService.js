import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { generateQRCodeBuffer } from './qrCodeService.js';

dotenv.config();

// Create transporter for sending emails
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send login credentials email with QR code
const sendLoginCredentials = async ({ email, firstName, lastName, username, password, loginUrl }) => {
  try {
    const transporter = createTransporter();

    // Generate QR code with login credentials as buffer for attachment
    console.log('🔄 Generating login QR code for:', email);
    const qrCodeBuffer = await generateQRCodeBuffer({
      type: 'login_credentials',
      email,
      username,
      password,
      loginUrl,
      timestamp: new Date().toISOString()
    });

    console.log('✅ QR code generated successfully, size:', qrCodeBuffer.length, 'bytes');

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Your Login Credentials - Welcome!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Login Credentials</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e9ecef;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .credentials-box {
              background-color: #f8f9fa;
              border: 2px solid #e9ecef;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .credential-item {
              margin: 10px 0;
              font-size: 16px;
            }
            .label {
              font-weight: bold;
              color: #495057;
              display: inline-block;
              width: 120px;
            }
            .value {
              font-family: 'Courier New', monospace;
              background-color: #e9ecef;
              padding: 5px 10px;
              border-radius: 4px;
              color: #495057;
            }
            .qr-code-section {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 10px;
              padding: 25px;
              margin: 25px 0;
              text-align: center;
              color: white;
            }
            .qr-code-container {
              background-color: white;
              padding: 20px;
              border-radius: 8px;
              display: inline-block;
              margin: 15px 0;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .qr-code-image {
              width: 300px;
              height: 300px;
              max-width: 300px;
              display: block;
              margin: 0 auto;
              border: none;
              -ms-interpolation-mode: bicubic;
            }
            .qr-instructions {
              background-color: rgba(255,255,255,0.1);
              border-radius: 5px;
              padding: 15px;
              margin-top: 15px;
              font-size: 14px;
            }
            .login-button {
              display: inline-block;
              background-color: #007bff;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .login-button:hover {
              background-color: #0056b3;
            }
            .security-note {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e9ecef;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🔐 Login System</div>
              <h2>Welcome!</h2>
            </div>
            
            <p>Hello ${firstName} ${lastName},</p>
            
            <p>Your account has been created successfully! Below are your login credentials:</p>
            
            <div class="credentials-box">
              <div class="credential-item">
                <span class="label">Email:</span>
                <span class="value">${email}</span>
              </div>
              <div class="credential-item">
                <span class="label">Username:</span>
                <span class="value">${username}</span>
              </div>
              <div class="credential-item">
                <span class="label">Password:</span>
                <span class="value">${password}</span>
              </div>
            </div>

            <div class="qr-code-section">
              <h3 style="margin-top: 0;">📱 Quick Login with QR Code</h3>
              <p style="margin: 10px 0;">Scan this QR code with your mobile device to instantly access your credentials!</p>
              
              <div class="qr-code-container">
                <img src="cid:loginqr" 
                     alt="Login QR Code" 
                     class="qr-code-image"
                     width="300" 
                     height="300"
                     style="max-width: 300px; width: 300px; height: 300px; display: block; margin: 0 auto; border: none;" />
              </div>
              
              <div class="qr-instructions">
                <strong>How to use:</strong><br>
                1. Open a QR code scanner app on your phone<br>
                2. Scan the QR code above<br>
                3. Your credentials will be displayed instantly<br>
                4. Use them to log in to the application
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="login-button">Login Now</a>
            </div>
            
            <div class="security-note">
              <strong>🔒 Security Notice:</strong> Please keep your credentials secure and consider changing your password after your first login. Do not share this QR code with anyone.
            </div>
            
            <h3>What you can do:</h3>
            <ul>
              <li>Access your personal dashboard</li>
              <li>Manage your profile and settings</li>
              <li>Explore all available features</li>
              <li>Connect with other users</li>
            </ul>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Login System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome ${firstName} ${lastName}!

Your login credentials:
Email: ${email}
Username: ${username}
Password: ${password}

Login URL: ${loginUrl}

A QR code has been included in the HTML version of this email for quick access to your credentials.

Please keep your credentials secure.`,
      attachments: [{
        filename: 'qr-code.png',
        content: qrCodeBuffer,
        cid: 'loginqr' // same cid value as in the img src
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Login credentials email with QR code sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending login credentials email:', error);
    throw error;
  }
};

// Send OAuth success notification email
const sendOAuthSuccessEmail = async ({ email, firstName, lastName, provider, loginUrl }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Welcome! Your ${provider} login is ready`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>OAuth Success</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e9ecef;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .success-box {
              background-color: #d4edda;
              border: 2px solid #c3e6cb;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .login-button {
              display: inline-block;
              background-color: #28a745;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .login-button:hover {
              background-color: #218838;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e9ecef;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎉 Welcome!</div>
              <h2>Account Setup Complete</h2>
            </div>
            
            <p>Hello ${firstName} ${lastName},</p>
            
            <div class="success-box">
              <h3>✅ Success!</h3>
              <p>Your account has been successfully linked with ${provider}.</p>
              <p>You can now login using your ${provider} account.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="login-button">Login with ${provider}</a>
            </div>
            
            <h3>Next Steps:</h3>
            <ul>
              <li>Click the login button above to access your account</li>
              <li>Complete your profile setup</li>
              <li>Explore all available features</li>
              <li>Start using the application</li>
            </ul>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Login System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome ${firstName} ${lastName}!

Your account has been successfully linked with ${provider}.
You can now login using your ${provider} account.

Login URL: ${loginUrl}

Thank you for joining us!`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OAuth success email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending OAuth success email:', error);
    throw error;
  }
};

// Send temporary password email for OAuth users with QR code
const sendTempPasswordEmail = async ({ email, firstName, lastName, tempPassword, passwordChangeToken, changePasswordUrl }) => {
  try {
    const transporter = createTransporter();

    // Generate QR code with password change credentials as buffer for attachment
    console.log('🔄 Generating password change QR code for:', email);
    const qrCodeBuffer = await generateQRCodeBuffer({
      type: 'password_change',
      email,
      tempPassword,
      token: passwordChangeToken,
      changePasswordUrl,
      timestamp: new Date().toISOString(),
      expiresIn: '24h'
    });

    console.log('✅ Password change QR code generated successfully, size:', qrCodeBuffer.length, 'bytes');

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `🔐 Temporary Password - Action Required`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Temporary Password</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e9ecef;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .temp-password-box {
              background-color: #fff3cd;
              border: 2px solid #ffeaa7;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .password-value {
              font-family: 'Courier New', monospace;
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 4px;
              color: #495057;
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
              border: 1px solid #dee2e6;
            }
            .change-password-button {
              display: inline-block;
              background-color: #dc3545;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
              font-size: 16px;
            }
            .change-password-button:hover {
              background-color: #c82333;
            }
            .security-warning {
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
              color: #721c24;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e9ecef;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
            .expiry-notice {
              background-color: #d1ecf1;
              border: 1px solid #bee5eb;
              border-radius: 5px;
              padding: 15px;
              margin: 20px 0;
              color: #0c5460;
            }
            .qr-code-section {
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              border-radius: 10px;
              padding: 25px;
              margin: 25px 0;
              text-align: center;
              color: white;
            }
            .qr-code-container {
              background-color: white;
              padding: 20px;
              border-radius: 8px;
              display: inline-block;
              margin: 15px 0;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .qr-code-image {
              width: 300px;
              height: 300px;
              max-width: 300px;
              display: block;
              margin: 0 auto;
              border: none;
              -ms-interpolation-mode: bicubic;
            }
            .qr-instructions {
              background-color: rgba(255,255,255,0.1);
              border-radius: 5px;
              padding: 15px;
              margin-top: 15px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🔐 Security Notice</div>
              <h2>Temporary Password Required</h2>
            </div>
            
            <p>Hello ${firstName} ${lastName},</p>
            
            <p>You have successfully logged in with Google OAuth. For security purposes, you need to set up a new password for your account.</p>
            
            <div class="temp-password-box">
              <h3>⚠️ Your Temporary Password</h3>
              <div class="password-value">${tempPassword}</div>
              <p><strong>Use this password to log in and change it immediately.</strong></p>
            </div>
            
            <div class="expiry-notice">
              <strong>⏰ Important:</strong> This temporary password will expire in 24 hours for security reasons.
            </div>

            <div class="qr-code-section">
              <h3 style="margin-top: 0;">📱 Quick Access with QR Code</h3>
              <p style="margin: 10px 0;">Scan this QR code with your mobile device to instantly access your password change credentials!</p>
              
              <div class="qr-code-container">
                <img src="cid:passwordqr" 
                     alt="Password Change QR Code" 
                     class="qr-code-image"
                     width="300" 
                     height="300"
                     style="max-width: 300px; width: 300px; height: 300px; display: block; margin: 0 auto; border: none;" />
              </div>
              
              <div class="qr-instructions">
                <strong>How to use:</strong><br>
                1. Open a QR code scanner app on your phone<br>
                2. Scan the QR code above<br>
                3. Your temporary password will be displayed<br>
                4. Use it to change your password immediately
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${changePasswordUrl}" class="change-password-button">Change Password Now</a>
            </div>
            
            <div class="security-warning">
              <strong>🛡️ Security Requirements:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>You must change this temporary password before accessing the application</li>
                <li>Choose a strong password with at least 8 characters</li>
                <li>Include uppercase, lowercase, numbers, and special characters</li>
                <li>Do not share this temporary password with anyone</li>
              </ul>
            </div>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Click the "Change Password Now" button above</li>
              <li>Log in using your email and the temporary password</li>
              <li>Set a new, secure password</li>
              <li>Start using the application securely</li>
            </ol>
            
            <p>If you did not request this login or have any security concerns, please contact our support team immediately.</p>
            
            <div class="footer">
              <p>This is an automated security message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Login System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hello ${firstName} ${lastName},

You have successfully logged in with Google OAuth. For security purposes, you need to set up a new password for your account.

Your Temporary Password: ${tempPassword}

IMPORTANT: This temporary password will expire in 24 hours.

Please visit: ${changePasswordUrl}

Steps:
1. Log in using your email and the temporary password above
2. Set a new, secure password
3. Start using the application securely

Security Requirements:
- You must change this temporary password before accessing the application
- Choose a strong password with at least 8 characters
- Include uppercase, lowercase, numbers, and special characters
- Do not share this temporary password with anyone

If you did not request this login, please contact support immediately.`,
      attachments: [{
        filename: 'password-qr-code.png',
        content: qrCodeBuffer,
        cid: 'passwordqr' // same cid value as in the img src
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Temporary password email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending temporary password email:', error);
    throw error;
  }
};

// Test email configuration
const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async ({ email, firstName, lastName, resetToken, resetUrl }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #ff6b6b;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #ff6b6b;
              margin: 0;
              font-size: 28px;
            }
            .content {
              margin: 30px 0;
            }
            .greeting {
              font-size: 16px;
              margin-bottom: 20px;
              color: #555;
            }
            .message {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              color: #856404;
            }
            .reset-button {
              display: inline-block;
              background: #ff6b6b;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              margin: 20px 0;
              transition: background 0.3s;
            }
            .reset-button:hover {
              background: #ff5252;
            }
            .reset-link {
              word-break: break-all;
              background: #f8f9fa;
              padding: 15px;
              border-radius: 4px;
              font-size: 12px;
              color: #666;
              margin: 20px 0;
              font-family: monospace;
            }
            .expiry-notice {
              background: #f8d7da;
              border-left: 4px solid #dc3545;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              color: #721c24;
              font-size: 14px;
            }
            .security-tips {
              background: #d1ecf1;
              border-left: 4px solid #17a2b8;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              color: #0c5460;
              font-size: 14px;
            }
            .security-tips ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .security-tips li {
              margin: 5px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #999;
            }
            .divider {
              height: 1px;
              background: #eee;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>

            <div class="content">
              <p class="greeting">Hi ${firstName || 'User'},</p>

              <p>We received a request to reset your password. Click the button below to create a new password:</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">Reset Password</a>
              </div>

              <p style="text-align: center; color: #999; font-size: 14px;">Or copy this link:</p>
              <div class="reset-link">${resetUrl}</div>

              <div class="expiry-notice">
                <strong>⏰ Important:</strong> This reset link expires in <strong>1 hour</strong>. If you don't reset your password within this time, you'll need to request a new reset link.
              </div>

              <div class="message">
                <strong>Didn't request a password reset?</strong><br>
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </div>

              <div class="security-tips">
                <strong>🛡️ Security Tips:</strong>
                <ul>
                  <li>Never share your password with anyone</li>
                  <li>Use a strong password with numbers, letters, and symbols</li>
                  <li>Don't use the same password across multiple sites</li>
                  <li>Change your password regularly for better security</li>
                </ul>
              </div>

              <div class="divider"></div>

              <p style="font-size: 14px; color: #666;">
                If you have any questions or need help, please contact our support team.
              </p>
            </div>

            <div class="footer">
              <p>© ${new Date().getFullYear()} All rights reserved. This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};

export {
  sendLoginCredentials,
  sendOAuthSuccessEmail,
  sendTempPasswordEmail,
  sendPasswordResetEmail,
  testEmailConfiguration
};