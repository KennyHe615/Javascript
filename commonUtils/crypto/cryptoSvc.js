import crypto from 'crypto';

export default class CryptoSvc {
   constructor(secretKey, iv) {
      if (secretKey) {
         // convert to Buffer format
         this.secretKey = typeof secretKey === 'string' ? Buffer.from(secretKey, 'hex') : secretKey;
      } else {
         this.secretKey = crypto.randomBytes(32);
      }

      if (iv) {
         // convert to Buffer format
         this.iv = typeof iv === 'string' ? Buffer.from(iv, 'hex') : iv;
      } else {
         this.iv = crypto.randomBytes(16);
      }
   }

   // const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);

   encrypt(data) {
      const cipher = crypto.createCipheriv('aes-256-gcm', this.secretKey, this.iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag().toString('hex');

      return {
         secretKey: this.secretKey.toString('hex'),
         iv: this.iv.toString('hex'),
         tag,
         encryptedData: encrypted,
      };
   }

   decrypt = (tag, encryptedData) => {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey, this.iv);
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
   };

   // Legacy method
   legacyEncrypt(data) {
      const cipher = crypto.createCipheriv('aes-256-ctr', this.secretKey, this.iv);

      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

      return {
         secretKey: this.secretKey.toString('hex'),
         iv: this.iv.toString('hex'),
         encryptedData: encrypted.toString('hex'),
      };
   }

   legacyDecrypt = (encryptedData) => {
      const decipher = crypto.createDecipheriv('aes-256-ctr', Buffer.from(this.secretKey, 'hex'), Buffer.from(this.iv, 'hex'));

      const decrpyted = Buffer.concat([decipher.update(Buffer.from(encryptedData, 'hex')), decipher.final()]);

      return decrpyted.toString();
   };
}

// Sample Usage
// Legacy
// const svc = new CryptoSvc("f46d86f0318e0a9eac9e1c7151368a825d9a337de2256b56630fa7d4c0aa607b", "622314cf0c12310bac0fb5b078263f58");
// const legacyEncrypted = svc.encrypt("Hello World");
// console.log("legacyEncrypted: ", legacyEncrypted);
// const legacyDecrypted = svc.decrypt("295d9974fb117a3a70bdaf");
// console.log("legacyDecrypted:", legacyDecrypted);

// Latest
// const svc = new CryptoSvc(
//    '72726c4953b857dd38a9fcdb67103547e5a2c96c3a53d4328f9337eed238eaff',
//    'be941c0200a6e6bd5fe154ced35f85b4',
// );
// const encrypted = svc.encrypt('genesysApp00!@');
// console.log('encrypted: ', encrypted);
// const decrypted = svc.decrypt(
//    'b6ac261f2c939209189c36a90d47c05c',
//    'a1ae2f67a37ddbb2d20ea75f6490457071e021b07f915de7de2263e73e2a246ff98134e4',
// );
// console.log('decrypted:', decrypted);
