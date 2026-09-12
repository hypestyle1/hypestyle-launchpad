import { describe, it, expect, vi, beforeEach } from 'vitest';

// fetchGraphQL se mockea para simular las tres respuestas posibles de WPGraphQL:
// slug inexistente (error específico), WP caído (cualquier otro error) y producto OK.
const fetchGraphQL = vi.fn();
vi.mock('@/lib/graphql-client', () => ({ fetchGraphQL: (...args: unknown[]) => fetchGraphQL(...args) }));

import { fetchProductDetail, isProductNotFoundError } from '@/lib/product-detail';

describe('isProductNotFoundError', () => {
  it('reconoce el error de WPGraphQL para un slug que no existe', () => {
    expect(isProductNotFoundError(new Error('No product ID was found corresponding to the slug: regular-3-pack'))).toBe(true);
  });

  it('cualquier otro error es WP caído, no un 404', () => {
    expect(isProductNotFoundError(new Error('Network response was not ok'))).toBe(false);
    expect(isProductNotFoundError(new Error('Unexpected token < in JSON at position 0'))).toBe(false);
    expect(isProductNotFoundError(new Error('The operation was aborted'))).toBe(false);
    expect(isProductNotFoundError(undefined)).toBe(false);
  });
});

describe('fetchProductDetail', () => {
  beforeEach(() => fetchGraphQL.mockReset());

  it('devuelve undefined (404 real) cuando el slug no existe', async () => {
    fetchGraphQL.mockRejectedValueOnce(new Error('No product ID was found corresponding to the slug: nada'));
    await expect(fetchProductDetail('nada', { server: true })).resolves.toBeUndefined();
  });

  it('devuelve undefined cuando WPGraphQL responde product: null', async () => {
    fetchGraphQL.mockResolvedValueOnce({ product: null });
    await expect(fetchProductDetail('nada')).resolves.toBeUndefined();
  });

  it('propaga el error cuando WordPress está caído (no lo convierte en 404)', async () => {
    fetchGraphQL.mockRejectedValueOnce(new Error('Network response was not ok'));
    await expect(fetchProductDetail('hoodie-grey-hstars', { server: true })).rejects.toThrow('Network response was not ok');
  });
});
