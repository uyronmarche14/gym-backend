import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Generate QR code data URL for login credentials
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Password
 * @param {string} credentials.loginUrl - Login URL
 * @returns {Promise<string>} QR code data URL
 */
export const generateLoginQRCode = async ({ email, username, password, loginUrl }) => {
    try {
        // Create a JSON payload with login credentials
        const qrData = {
            type: 'login_credentials',
            email,
            username,
            password,
            loginUrl,
            timestamp: new Date().toISOString(),
            // Add a unique identifier for security
            id: crypto.randomBytes(8).toString('hex')
        };

        // Convert to JSON string
        const qrString = JSON.stringify(qrData);

        // Generate QR code as data URL (base64 encoded PNG)
        // Optimized settings for email client compatibility
        const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
            errorCorrectionLevel: 'M', // Medium error correction (better for email)
            type: 'image/png',
            quality: 1.0, // Maximum quality
            margin: 1, // Minimal margin for cleaner look
            width: 300, // Optimal size for emails (not too large)
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            rendererOpts: {
                quality: 1.0
            }
        });

        console.log('✅ Login QR code generated successfully');
        return qrCodeDataUrl;
    } catch (error) {
        console.error('❌ Error generating login QR code:', error);
        throw new Error(`Failed to generate login QR code: ${error.message}`);
    }
};

/**
 * Generate QR code for password change
 * @param {Object} data - Password change data
 * @param {string} data.email - User email
 * @param {string} data.tempPassword - Temporary password
 * @param {string} data.changePasswordUrl - Change password URL
 * @returns {Promise<string>} QR code data URL
 */
export const generatePasswordChangeQRCode = async ({ email, tempPassword, changePasswordUrl }) => {
    try {
        const qrData = {
            type: 'password_change',
            email,
            tempPassword,
            changePasswordUrl,
            timestamp: new Date().toISOString(),
            expiresIn: '24h',
            id: crypto.randomBytes(8).toString('hex')
        };

        const qrString = JSON.stringify(qrData);

        // Optimized settings for email client compatibility
        const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
            errorCorrectionLevel: 'M', // Medium error correction (better for email)
            type: 'image/png',
            quality: 1.0, // Maximum quality
            margin: 1, // Minimal margin for cleaner look
            width: 300, // Optimal size for emails (not too large)
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            rendererOpts: {
                quality: 1.0
            }
        });

        console.log('✅ Password change QR code generated successfully');
        return qrCodeDataUrl;
    } catch (error) {
        console.error('❌ Error generating password change QR code:', error);
        throw new Error(`Failed to generate password change QR code: ${error.message}`);
    }
};

/**
 * Generate simple QR code for any URL
 * @param {string} url - URL to encode
 * @returns {Promise<string>} QR code data URL
 */
export const generateUrlQRCode = async (url) => {
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(url, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            quality: 0.95,
            margin: 2,
            width: 300
        });

        return qrCodeDataUrl;
    } catch (error) {
        console.error('Error generating URL QR code:', error);
        throw new Error('Failed to generate URL QR code');
    }
};

/**
 * Generate QR code as buffer (for attachments)
 * @param {Object} data - Data to encode
 * @returns {Promise<Buffer>} QR code buffer
 */
export const generateQRCodeBuffer = async (data) => {
    try {
        const qrString = typeof data === 'string' ? data : JSON.stringify(data);

        const buffer = await QRCode.toBuffer(qrString, {
            errorCorrectionLevel: 'H', // High error correction for better reliability
            type: 'png',
            quality: 1.0, // Maximum quality
            margin: 2, // Small margin for clean look
            width: 400, // Good size for email display
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        console.log('✅ QR code buffer generated, size:', buffer.length, 'bytes');
        return buffer;
    } catch (error) {
        console.error('Error generating QR code buffer:', error);
        throw new Error('Failed to generate QR code buffer');
    }
};
