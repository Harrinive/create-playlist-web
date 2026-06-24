import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function deriveKey(secret: string): Buffer {
    return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(plaintext: string, secret: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(secret), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decrypt(payload: string, secret: string): string {
    const buf = Buffer.from(payload, 'base64url');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buf.subarray(IV_LENGTH + 16);
    const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function randomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('base64url');
}
