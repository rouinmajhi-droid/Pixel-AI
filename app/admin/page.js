'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function checkConfiguration() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/muapi-key', {
        headers: { 'x-admin-password': adminPassword },
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not check key configuration.');
      setConfigured(result.configured);
      setMessage(result.configured ? 'A Muapi key is saved.' : 'No Muapi key is saved yet.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveApiKey(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/muapi-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ apiKey }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the Muapi key.');
      setApiKey('');
      setConfigured(true);
      setMessage('Muapi API key saved securely.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-12 text-white">
      <section className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Pixel AI Admin</h1>
        <p className="mt-2 text-sm text-white/60">
          Manage the server-side Muapi key. The saved key is encrypted in Redis and never displayed.
        </p>

        <label className="mt-6 block text-sm font-medium" htmlFor="admin-password">
          Admin password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={adminPassword}
          onChange={(event) => setAdminPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-[#d9ff00]"
          required
        />

        <button
          type="button"
          onClick={checkConfiguration}
          disabled={busy || !adminPassword}
          className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
        >
          Check saved key
        </button>
        {configured !== null && (
          <p className="mt-3 text-sm text-white/70">
            Key status: {configured ? 'Configured' : 'Not configured'}
          </p>
        )}

        <form onSubmit={saveApiKey} className="mt-6 border-t border-white/10 pt-6">
          <label className="block text-sm font-medium" htmlFor="muapi-key">
            Muapi API key
          </label>
          <input
            id="muapi-key"
            type="password"
            autoComplete="new-password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-[#d9ff00]"
            required
          />
          <button
            type="submit"
            disabled={busy || !adminPassword || !apiKey}
            className="mt-4 rounded-lg bg-[#d9ff00] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save API key'}
          </button>
        </form>

        {message && <p role="status" className="mt-4 text-sm text-white/80">{message}</p>}
      </section>
    </main>
  );
}
