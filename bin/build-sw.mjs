#!/usr/bin/env node

import pkg from '@next/env';
const { loadEnvConfig } = pkg;

const isProd = process.env.NODE_ENV === 'production';

loadEnvConfig('./', !isProd);

console.log('Is Prod: ', isProd);

// Make sure to define NODE_ENV variable.
const define = {};

// load all env variables for esbuild
for (const k in process.env) {
  define[`process.env.${k}`] = JSON.stringify(process.env[k]);
}

import path from 'path';
import esbuild from 'esbuild';

const run = async () => {
  const build = isProd ? esbuild.build : esbuild.context;
  const ctx = await build({
    entryPoints: [path.resolve('lib/sw.ts')],
    format: 'esm',
    bundle: true, // enable tree shaking
    outfile: './public/sw.js',
    platform: 'browser',
    define,
    legalComments: 'none',
    drop: isProd ? ['console'] : [],
    minify: isProd ? true : false,
  });
  if (!isProd) {
    await ctx.watch();
    console.log('SW: Watching (dev mode)...');
  }
  else {
    console.log('SW: Build complete.');
  }

};

run();