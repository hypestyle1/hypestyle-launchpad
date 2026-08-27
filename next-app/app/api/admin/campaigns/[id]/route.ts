import { NextRequest } from 'next/server';
import { wpGet, wpUpdate, wpDelete } from '@/lib/admin/crud-proxy';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest, { params }: { params: { id: string } }) => wpGet(req, 'campaigns', params.id);
export const POST = (req: NextRequest, { params }: { params: { id: string } }) => wpUpdate(req, 'campaigns', params.id);
export const DELETE = (req: NextRequest, { params }: { params: { id: string } }) => wpDelete(req, 'campaigns', params.id);
