#!/usr/bin/env node
// scripts/event-log.mjs — Round 4 #6.
import { logEvent } from './state-store.mjs';
import { pathToFileURL } from 'node:url';

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , type, ...rest] = process.argv;
  if (!type) { console.error('usage: event-log.mjs <type> [k=v ...]'); process.exit(1); }
  const data = Object.fromEntries(rest.map((kv) => {
    const i = kv.indexOf('=');
    return i < 0 ? [kv, true] : [kv.slice(0, i), kv.slice(i + 1)];
  }));
  logEvent({ type, ...data }).then((e) => console.log(JSON.stringify(e))).catch((e) => {
    console.error(e.message); process.exit(1);
  });
}

export { logEvent };
