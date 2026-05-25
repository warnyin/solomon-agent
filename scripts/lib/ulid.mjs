#!/usr/bin/env node
// scripts/lib/ulid.mjs — standalone ULID generator (CLI + ESM).

import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid() {
  const t = Date.now();
  let s = '';
  let v = t;
  for (let i = 9; i >= 0; i--) {
    s = CROCKFORD[v % 32] + s;
    v = Math.floor(v / 32);
  }
  const r = randomBytes(10);
  for (const b of r) s += CROCKFORD[b % 32];
  return s;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(ulid());
}
