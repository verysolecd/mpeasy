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
        try {
          await fs.access(targetPath);
        } catch {
          console.log('[esbuild] Target directory does not exist, skipping clean.');
          return;
        }
        
        // Read directory contents
        const items = await fs.readdir(targetPath);
        
        // Remove each item except data.json
        for (const item of items) {
          if (item !== 'data.json') {
            const itemPath = path.join(targetPath, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
              await fs.rm(itemPath, { recursive: true, force: true });
            } else {
              await fs.rm(itemPath, { force: true });
            }
          }
        }
        
        console.log('[esbuild] Clean complete');
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
        
        // Copy project assets
        const assetsSource = 'assets';
        const assetsDest = path.join(targetPath, 'assets');
        console.log(`[esbuild] Copying project assets from ${assetsSource} to ${assetsDest}...`);
        await fs.mkdir(assetsDest, { recursive: true });
        await fs.cp(assetsSource, assetsDest, { recursive: true });

        // Copy codestyles
        const codestyleSource = 'node_modules/highlight.js/styles';
        const codestyleDest = path.join(targetPath, 'assets/codestyle');
        console.log(`[esbuild] Copying codestyles from ${codestyleSource} to ${codestyleDest}...`);
        await fs.mkdir(codestyleDest, { recursive: true });
        
        const files = await fs.readdir(codestyleSource);
        for (const file of files) {
            if (file.endsWith('.css') && !file.endsWith('.min.css')) {
                const sourceFile = path.join(codestyleSource, file);
                const destFile = path.join(codestyleDest, file);
                await fs.copyFile(sourceFile, destFile);
            }
        }

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
        external: ['obsidian', 'stream', 'util'],
    format: 'cjs',
    target: 'es2020',
    platform: 'browser',
    outfile: 'dist/main.js',
    sourcemap: isProd ? false : 'inline',
    treeShaking: true,
    plugins: [cleanAndDeployPlugin],
    // React/JSX support
    loader: {'.ts': 'ts', '.tsx': 'tsx'},
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  });
  console.log('[esbuild] Build finished successfully.');
} catch (e) {
  console.error('[esbuild] Build failed:', e);
  process.exit(1);
}