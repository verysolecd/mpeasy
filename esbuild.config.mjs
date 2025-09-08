import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';

// --- Configuration ---
const config = JSON.parse(await fs.readFile('build-config.json', 'utf-8'));
const targetPath = config.targetPath;
const isProd = process.env.NODE_ENV === 'production';

// --- Custom Plugin ---
const cleanAndDeployPlugin = {
  name: 'clean-and-deploy',
  setup(build) {
    // On build start, clean the target directory
    build.onStart(async () => {
      if (!targetPath) {
        console.log('No targetPath in build-config.json, skipping clean.');
        return;
      }
      console.log(`[esbuild] Cleaning directory: ${targetPath}...`);
      try {
        await fs.rm(targetPath, { recursive: true, force: true });
        console.log('[esbuild] Clean complete.');
      } catch (err) {
        console.error('[esbuild] Failed to clean target directory:', err);
      }
    });

    // On build end, copy the necessary files
    build.onEnd(async (result) => {
      if (result.errors.length > 0) {
        console.log('[esbuild] Build failed, skipping deploy.');
        return;
      }
      if (!targetPath) {
        console.log('No targetPath in build-config.json, skipping deploy.');
        return;
      }

      console.log(`[esbuild] Deploying to ${targetPath}...`);
      try {
        await fs.mkdir(targetPath, { recursive: true });
        // Copy the main JS bundle
        await fs.copyFile('dist/main.js', path.join(targetPath, 'main.js'));
        // Copy manifest and styles
        await fs.copyFile('src/manifest.json', path.join(targetPath, 'manifest.json'));
        await fs.copyFile('src/styles.css', path.join(targetPath, 'styles.css'));
        console.log('[esbuild] Deploy complete.');
      } catch (err) {
        console.error('[esbuild] Failed to deploy:', err);
      }
    });
  },
};

// --- Build ---
try {
  await esbuild.build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    external: ['obsidian'],
    format: 'cjs',
    target: 'es2020',
    platform: 'node',
    outfile: 'dist/main.js',
    sourcemap: isProd ? false : 'inline',
    treeShaking: true,
    plugins: [cleanAndDeployPlugin],
  });
  console.log('[esbuild] Build finished successfully.');
} catch (e) {
  console.error('[esbuild] Build failed:', e);
  process.exit(1);
}
