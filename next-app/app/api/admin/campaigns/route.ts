import { NextRequest } from 'next/server';
import { wpList, wpCreate } from '@/lib/admin/crud-proxy';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest) => wpList(req, 'campaigns');
export const POST = (req: NextRequest) => wpCreate(req, 'campaigns');
