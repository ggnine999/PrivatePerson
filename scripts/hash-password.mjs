import { pbkdf2Sync, randomBytes } from 'node:crypto';
const password=process.argv[2];
if(!password||password.length<12){console.error('Usage: npm run auth:hash -- "a-password-at-least-12-chars"');process.exit(1)}
const iterations=600000,salt=randomBytes(16),hash=pbkdf2Sync(password,salt,iterations,32,'sha256');
const b64=value=>value.toString('base64url');
console.log(`${iterations}$${b64(salt)}$${b64(hash)}`);
