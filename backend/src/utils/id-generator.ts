import { customAlphabet } from 'nanoid';

// Use URL-safe alphabet (no special chars that need escaping)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 21);

export function generateId(): string {
    return nanoid();
}
