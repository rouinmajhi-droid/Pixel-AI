import { NextResponse } from 'next/server';
import { getStoredMuapiApiKey, isAdminAuthorized, storeMuapiApiKey } from '@/lib/muapi-key-storage';

export const runtime = 'nodejs';

function rejectCrossOrigin(request) {
  const origin = request.headers.get('origin');
  return origin && origin !== new URL(request.url).origin;
}

export async function GET(request) {
  if (rejectCrossOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const apiKey = await getStoredMuapiApiKey();
    return NextResponse.json({ configured: Boolean(apiKey) });
  } catch (error) {
    console.error('[Admin API] Unable to check Muapi key storage:', error.message);
    return NextResponse.json(
      { error: 'Unable to access secure key storage.' },
      { status: 503 }
    );
  }
}

export async function POST(request) {
  if (rejectCrossOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON request is required.' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    typeof body.apiKey !== 'string' ||
    !body.apiKey.trim() ||
    body.apiKey.length > 4096
  ) {
    return NextResponse.json(
      { error: 'Enter a valid Muapi API key (maximum 4096 characters).' },
      { status: 400 }
    );
  }

  try {
    await storeMuapiApiKey(body.apiKey.trim());
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('[Admin API] Unable to save Muapi key:', error.message);
    return NextResponse.json(
      { error: 'Unable to save the key to secure storage.' },
      { status: 503 }
    );
  }
}
