import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export interface UserPayload {
    userId: number;
    username: string;
    email: string;
    role: 'admin' | 'user';
}

export function generateToken(payload: UserPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as UserPayload;
    } catch {
        return null;
    }
}

export async function getAuthUser(): Promise<UserPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token');

    if (!token) {
        return null;
    }

    return verifyToken(token.value);
}

export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });
}

export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
}

// Verify auth from NextRequest (for API routes)
export async function verifyAuth(request: { headers: Headers }): Promise<number | null> {
    const cookiesHeader = request.headers.get('cookie');
    if (!cookiesHeader) {
        return null;
    }

    const cookies = cookiesHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
    }, {} as Record<string, string>);

    const token = cookies['auth_token'];
    if (!token) {
        return null;
    }

    const payload = verifyToken(token);
    return payload ? payload.userId : null;
}

export async function requireAuth(): Promise<UserPayload> {
    const user = await getAuthUser();
    if (!user) {
        throw new Error('Unauthorized');
    }
    return user;
}

