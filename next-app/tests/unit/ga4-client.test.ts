import { describe, it, expect } from 'vitest';
import { createVerify, generateKeyPairSync } from 'crypto';
import { readServiceAccount, normalizeKey, ga4PropertyId, buildAssertion } from '@/lib/ga4/client';
import { isGa4AuthError } from '@/lib/ga4/connection';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

describe('credenciales desde el entorno', () => {
  it('GA4_SERVICE_ACCOUNT_JSON completo', () => {
    const sa = readServiceAccount({ GA4_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'sa@proj.iam.gserviceaccount.com', private_key: pem }) });
    expect(sa?.clientEmail).toBe('sa@proj.iam.gserviceaccount.com');
    expect(sa?.privateKey).toBe(pem);
  });
  it('variables sueltas con la clave escapada como la guarda Vercel', () => {
    const escaped = pem.replace(/\n/g, '\\n');
    const sa = readServiceAccount({ GA4_CLIENT_EMAIL: 'sa@proj.iam.gserviceaccount.com', GA4_PRIVATE_KEY: escaped });
    expect(sa?.privateKey).toBe(pem);
  });
  it('JSON roto cae a las variables sueltas; sin nada → null', () => {
    expect(readServiceAccount({ GA4_SERVICE_ACCOUNT_JSON: '{no es json', GA4_CLIENT_EMAIL: 'a@b', GA4_PRIVATE_KEY: 'k' })).toEqual({ clientEmail: 'a@b', privateKey: 'k' });
    expect(readServiceAccount({})).toBeNull();
  });
  it('normalizeKey saca comillas envolventes', () => {
    expect(normalizeKey('"abc\\ndef"')).toBe('abc\ndef');
  });
  it('propertyId acepta el número pelado o con prefijo', () => {
    expect(ga4PropertyId({ GA4_PROPERTY_ID: '123456' })).toBe('123456');
    expect(ga4PropertyId({ GA4_PROPERTY_ID: 'properties/123456' })).toBe('123456');
    expect(ga4PropertyId({})).toBe('');
  });
});

describe('JWT para el canje de token', () => {
  const now = 1_757_700_000;
  const jwt = buildAssertion({ clientEmail: 'sa@proj.iam.gserviceaccount.com', privateKey: pem }, now);
  const [h, c, s] = jwt.split('.');
  const dec = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString());

  it('header RS256 y claims de Google con scope read-only', () => {
    expect(dec(h)).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(dec(c)).toEqual({
      iss: 'sa@proj.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600,
    });
  });
  it('la firma verifica con la clave pública', () => {
    const v = createVerify('RSA-SHA256');
    v.update(`${h}.${c}`);
    expect(v.verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true);
  });
  it('base64url sin padding ni caracteres de base64 clásico', () => {
    expect(jwt).not.toMatch(/[+/=]/);
  });
});

describe('clasificación de errores de Google', () => {
  it('permiso / credencial = auth', () => {
    for (const m of ['User does not have sufficient permissions for this property.', 'PERMISSION_DENIED', 'ga4 auth: invalid_grant', 'ga4 403'])
      expect(isGa4AuthError(m)).toBe(true);
  });
  it('rate limit / 500 / red = temporal', () => {
    for (const m of ['ga4 429', 'ga4 503', 'fetch failed']) expect(isGa4AuthError(m)).toBe(false);
  });
});
