import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';

// --- Configuration ---
const config = JSON.parse(await fs.readFile('build-config.json', 'utf-8'));
const targetPath = config.targetPath;
const isProd = process.env.NODE_ENV === 'production';

// --- Build ---
try {
    // First build to dist directory
    const buildConfig = {
        entryPoints: ['src/main.ts'],
        bundle: true,
        outdir: 'dist',  // Output to dist directory first
        format: 'cjs',
        platform: 'node',
        sourcemap: isProd ? false : 'inline',
        minify: isProd,
        define: {
            'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
        },
        loader: {
            '.ts': 'ts',
            '.tsx': 'tsx',
        },
        resolveExtensions: ['.ts', '.tsx', '.js', '.jsx'],
        external: ['obsidian', 'electron', './xhr-sync-worker.js']
    };

    // Compile first - if this fails, the process will exit without cleaning/deploying
    await esbuild.build(buildConfig);
    console.log('[esbuild] Build completed successfully.');

    // Copy additional assets to dist directory
    // Copy manifest.json
    await fs.copyFile('src/manifest.json', 'dist/manifest.json');
    
    // Copy UIstyle.css as styles.css to comply with Obsidian plugin requirements
    await fs.copyFile('src/core/components/UIstyle.css', 'dist/styles.css');
    
    // Copy assets folder
    const assetsDest = 'dist/assets';
    await fs.mkdir(assetsDest, { recursive: true });
    await fs.cp('assets', assetsDest, { recursive: true });
    
    // Copy codestyles
    const codestyleSource = 'node_modules/highlight.js/styles';
    const codestyleDest = 'dist/assets/codestyle';
    await fs.mkdir(codestyleDest, { recursive: true });
    
    const files = await fs.readdir(codestyleSource);
    for (const file of files) {
        if (file.endsWith('.css') && !file.endsWith('.min.css')) {
            const sourceFile = path.join(codestyleSource, file);
            const destFile = path.join(codestyleDest, file);
            await fs.copyFile(sourceFile, destFile);
        }
    }

    // Only proceed with deployment if build was successful
    if (targetPath) {
        console.log(`[esbuild] Deploying to ${targetPath}...`);
        
        // First clean the target directory
        try {
            await fs.access(targetPath);
            
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
        } catch {
            // Target directory does not exist, will create it
        }
        
        // Ensure target directory exists
        await fs.mkdir(targetPath, { recursive: true });
        
        // Copy all files from dist to target
        await fs.cp('dist', targetPath, { recursive: true });
        
        console.log('[esbuild] Deployment completed successfully.');
    } else {
        console.log('[esbuild] No target path specified. Skipping deployment.');
    }
    
    console.log('[esbuild] Build process finished successfully.');
} catch (e) {
    console.error('[esbuild] Build failed:', e.message);
    process.exit(1);
}