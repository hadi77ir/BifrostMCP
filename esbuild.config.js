// Bundles the extension (including dependencies) with esbuild while keeping the VS Code API external.
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');
const distDir = path.join(__dirname, 'dist');

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: ['node18'],
  outfile: path.join(distDir, 'extension.js'),
  sourcemap: true,
  logLevel: 'info',
  external: ['vscode'], // Provided by VS Code at runtime
  tsconfig: path.join(__dirname, 'tsconfig.json'),
};

function clean() {
  fs.rmSync(distDir, { recursive: true, force: true });
}

async function build() {
  clean();
  await esbuild.build(buildOptions);
  console.log('Bundle complete.');
}

if (isWatch) {
  clean();
  esbuild.build({
    ...buildOptions,
    watch: {
      onRebuild(error) {
        if (error) {
          console.error('Rebuild failed:', error);
        } else {
          console.log('Rebuild succeeded.');
        }
      },
    },
  }).then(() => console.log('Watching for changes...')).catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  build().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
