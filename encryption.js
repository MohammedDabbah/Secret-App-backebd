const crypto = require('crypto');

// Replace 'your-secret-key' with your actual key (32 bytes for AES-256-CBC)
const secretKey = Buffer.from('my-secret-is-not-for-show-peace.', 'utf-8');
console.log('Key Length:', secretKey.length);

// Your encryption algorithm
const algorithm = 'aes-256-cbc';

// Encryption function
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted
    };
}

// Decryption function
function decrypt(data) {
    try {
        const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(data.iv, 'hex'));
        let decrypted = decipher.update(data.encryptedData, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');
        return decrypted;
    } catch (error) {
        console.error('Decryption Error:', error);
        return null;
    }
}

// // Example usage
// const dataToEncrypt = 'Hello, world!';
// const encryptedData = encrypt(dataToEncrypt);
// console.log('Encrypted Data:', encryptedData);

// // Later during decryption
// const decryptedData = decrypt(encryptedData);
// console.log('Decrypted Data:', decryptedData);
module.exports={
    encrypt,
    decrypt
}