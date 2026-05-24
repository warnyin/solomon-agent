#!/usr/bin/env node
// scripts/lib/ulid.mjs — standalone ULID generator (CLI + ESM).

import { randomBytes } from 'node:crypto';

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

const thisFile = `file://${process.argv[1].replace(/\\/g, '/')}`;
if (import.meta.url === thisFile) {
  process.stdout.write(ulid());
}
