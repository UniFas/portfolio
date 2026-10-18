import { build } from 'esbuild';
await build({ entryPoints:['src/main.js'], bundle:true, minify:true, format:'iife', target:'es2019', outfile:'out/js/workshop.js', logLevel:'info' });
