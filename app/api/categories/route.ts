import { NextResponse } from 'next/server';
import { getMappedCategories } from '@/lib/db/home';

export async function GET() {
  try {
    const categories = await getMappedCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('[categories GET]', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
