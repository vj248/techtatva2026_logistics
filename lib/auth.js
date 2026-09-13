import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'TechTatvaLogistics2026');
const ALG = 'HS256';

export async function hashPassword(password) {
  return await bcrypt.hash(password, 12); // Cost Factor 12
}

export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

export async function signJWT(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days
    .sign(SECRET_KEY);
}

export async function verifyJWT(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (error) {
    return null;
  }
}
