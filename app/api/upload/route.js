import { NextResponse } from 'next/server';

const UPLOAD_URL = 'https://api.muapi.ai/api/v1/upload_file';

export async function POST(request) {
  const apiKey = process.env.MUAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'MUAPI_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'A valid multipart/form-data upload is required.' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json(
      { error: 'The upload must include a file field.' },
      { status: 400 }
    );
  }

  let upstreamResponse;
  try {
    console.log('[Upload API] Sending Muapi upload request:', {
      headers: { 'x-api-key': '[REDACTED]' },
      apiKeyConfigured: Boolean(apiKey),
    });
    upstreamResponse = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
      body: formData,
    });
  } catch (error) {
    console.error('[Upload API] Muapi request failed:', error);
    return NextResponse.json(
      { error: 'Unable to reach the upload service.' },
      { status: 502 }
    );
  }

  const responseText = await upstreamResponse.text();
  if (!upstreamResponse.ok) {
    console.error(
      `[Upload API] Muapi upload failed with status ${upstreamResponse.status}: ${responseText}`
    );
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    console.error('[Upload API] Muapi returned an invalid JSON response:', error);
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: responseText || upstreamResponse.statusText },
        { status: upstreamResponse.status }
      );
    }
    return NextResponse.json(
      { error: 'The upload service returned an invalid response.' },
      { status: 502 }
    );
  }

  return NextResponse.json(data, { status: upstreamResponse.status });
}
