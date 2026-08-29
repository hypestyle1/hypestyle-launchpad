import { NextRequest } from 'next/server';
import { wpUpdate, wpDelete } from '@/lib/admin/crud-proxy';

export const dynamic = 'force-dynamic';

export const POST = (req: NextRequest, { params }: { params: { id: string } }) => wpUpdate(req, 'saved-views', params.id);
export const DELETE = (req: NextRequest, { params }: { params: { id: string } }) => wpDelete(req, 'saved-views', params.id);
