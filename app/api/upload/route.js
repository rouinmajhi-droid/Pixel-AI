import { NextResponse } from 'next/server';

const UPLOAD_URL = 'https://api.muapi.ai/api/v1/upload file';
const MUAPI_API_KEY = 'b81b230e8849959bc1e9eeb8d50a14f851e6563c4f00ae8714b0f53b1b9e2a22';
export const runtime = 'nodejs';

export async function POST(request) {
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

  const uploadForm = new FormData();
  uploadForm.append('file', file, file.name);

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'x-api-key': MUAPI_API_KEY },
      body: uploadForm,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Upload API] Muapi request failed:', message);
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }

  const responseText = await upstreamResponse.text();
  if (!upstreamResponse.ok) {
    console.error(
      `[Upload API] Muapi upload failed with status ${upstreamResponse.status}: ${responseText}`
    );
    return NextResponse.json(
      { error: responseText || upstreamResponse.statusText },
      { status: upstreamResponse.status }
    );
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    console.error('[Upload API] Muapi returned an invalid JSON response:', error);
    return NextResponse.json(
      { error: 'The upload service returned an invalid response.' },
      { status: 502 }
    );
  }

  return NextResponse.json(data, { status: upstreamResponse.status });
}
