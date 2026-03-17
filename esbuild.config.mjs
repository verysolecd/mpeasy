import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';

// --- Configuration ---
const isProd = process.env.NODE_ENV === 'production';

// --- Build ---
try {
    console.log('[esbuild] Building to dist directory...');
    
    // Build to dist directory
    const buildConfig = {
        entryPoints: ['src/main.ts'],
        bundle: true,
        outdir: 'dist',
        format: 'cjs',
        splitting: false,
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

    // Compile
    await esbuild.build(buildConfig);
    console.log('[esbuild] Build completed successfully.');

    console.log('[esbuild] Build process finished successfully.');
    
    // Open dist folder in Windows Explorer
    const { exec } = await import('child_process');
    exec('explorer dist', (error) => {
        if (error) {
            console.warn('[esbuild] Could not open dist folder in Explorer:', error.message);
        } else {
            console.log('[esbuild] Opened dist folder in Windows Explorer');
        }
    });
} catch (e) {
    console.error('[esbuild] Build failed:', e.message);
    process.exit(1);
}