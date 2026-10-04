// Parseo del import de miembros de Mejores Amigos. Puro (sin fetch): se testea
// solo. Acepta:
//
//  1. CSV `username,name` (nombre opcional), con o sin encabezado, separado por
//     coma o punto y coma, con o sin @, con mayúsculas, con links de perfil.
//     También una columna sola de usuarios (un usuario por línea).
//  2. El JSON del export oficial de Instagram (Centro de cuentas → Descargar tu
//     información → Seguidores y seguidos → close_friends.json). Instagram
//     cambió el formato varias veces: se toma `value`, `title` o el `href`.
//
// La normalización final la repite el mu-plugin; acá se hace para poder
// mostrar el preview y los inválidos antes de mandar.

import { normalizeHandle, isValidHandle } from './config';

export interface ImportRow { handle: string; name: string }
export interface ImportParse { rows: ImportRow[]; invalid: string[]; format: 'csv' | 'instagram_json' | 'empty' }

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') { if (line[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out.map((s) => s.trim());
}

const HEADER_USER = ['username', 'usuario', 'user', 'handle', 'instagram', 'ig', 'usuario ig', 'cuenta'];
const HEADER_NAME = ['name', 'nombre', 'full name', 'nombre completo'];

function dedupe(rows: ImportRow[]): ImportRow[] {
  const map = new Map<string, ImportRow>();
  for (const r of rows) {
    const prev = map.get(r.handle);
    if (!prev || (!prev.name && r.name)) map.set(r.handle, r);
  }
  return [...map.values()];
}

function pushRow(rawHandle: string, rawName: string, rows: ImportRow[], invalid: string[]) {
  const h = normalizeHandle(rawHandle);
  if (!h) return;
  if (!isValidHandle(h)) { invalid.push(rawHandle.slice(0, 60)); return; }
  rows.push({ handle: h, name: String(rawName || '').trim().slice(0, 120) });
}

function parseInstagramJson(data: unknown): ImportParse | null {
  const lists: any[] = [];
  const collect = (v: any) => {
    if (!v) return;
    if (Array.isArray(v)) { lists.push(...v); return; }
    if (typeof v === 'object') for (const k of Object.keys(v)) if (/close_friends|relationships/i.test(k)) collect(v[k]);
  };
  collect(data);
  if (!lists.length) return null;
  const rows: ImportRow[] = [];
  const invalid: string[] = [];
  for (const item of lists) {
    const sld = Array.isArray(item?.string_list_data) ? item.string_list_data[0] : null;
    const raw = sld?.value || item?.title || sld?.href || item?.value || '';
    pushRow(String(raw), '', rows, invalid);
  }
  return { rows: dedupe(rows), invalid, format: 'instagram_json' };
}

export function parseMembersImport(text: string): ImportParse {
  const src = String(text ?? '').replace(/^﻿/, '').trim();
  if (!src) return { rows: [], invalid: [], format: 'empty' };

  if (src.startsWith('{') || src.startsWith('[')) {
    try {
      const parsed = parseInstagramJson(JSON.parse(src));
      if (parsed) return parsed;
    } catch { /* no era JSON: sigue como CSV */ }
  }

  const lines = src.split(/\r?\n/).filter((l) => l.trim() !== '');
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const first = parseCsvLine(lines[0], sep).map((s) => s.toLowerCase());
  let iUser = 0;
  let iName = 1;
  let start = 0;
  const hu = first.findIndex((h) => HEADER_USER.includes(h));
  if (hu >= 0) {
    iUser = hu;
    const hn = first.findIndex((h) => HEADER_NAME.includes(h));
    iName = hn >= 0 ? hn : -1;
    start = 1;
  }

  const rows: ImportRow[] = [];
  const invalid: string[] = [];
  for (const line of lines.slice(start)) {
    const cols = parseCsvLine(line, sep);
    pushRow(cols[iUser] ?? '', iName >= 0 ? cols[iName] ?? '' : '', rows, invalid);
  }
  return { rows: dedupe(rows), invalid, format: 'csv' };
}

/** CSV de export: `username,name,source,status,created_at,last_access_at,access_count`. */
export function membersToCsv(members: { handle: string; name: string; source: string; status: string; createdAt: string | null; lastAccessAt: string | null; accessCount: number }[]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = 'username,name,source,status,created_at,last_access_at,access_count';
  return [head, ...members.map((m) => [m.handle, m.name, m.source, m.status, m.createdAt ?? '', m.lastAccessAt ?? '', m.accessCount].map(esc).join(','))].join('\n');
}
