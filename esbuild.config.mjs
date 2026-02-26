import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

/**
 * 将文件或文件夹移至回收站 (Windows 专用方案)
 * @param {string} targetPath 路径
 */
async function moveToTrash(targetPath) {
    try {
        const absolutePath = path.resolve(targetPath);
        // 使用 PowerShell 的 Microsoft.VisualBasic.FileIO.FileSystem 将文件/目录移至回收站
        const command = `powershell -Command "Add-Type -AssemblyName Microsoft.VisualBasic; if (Test-Path '${absolutePath}') { if (ls '${absolutePath}' -Directory) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('${absolutePath}', 'OnlyErrorDialogs', 'SendToRecycleBin') } else { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${absolutePath}', 'OnlyErrorDialogs', 'SendToRecycleBin') } }"`;
        execSync(command);
    } catch (err) {
        // 如果文件不存在则忽略
    }
}


// --- Configuration ---
const config = JSON.parse(await fs.readFile('build-config.json', 'utf-8'));
const targetPath = config.targetPath;
const isProd = process.env.NODE_ENV === 'production';

// --- Build ---
try {
    console.log('[esbuild] Cleaning dist directory...');
    await moveToTrash('dist');
    // First build to dist directory
    const buildConfig = {
        entryPoints: ['src/main.ts'],
        bundle: true,
        outdir: 'dist',  // Output to dist directory first
        format: 'cjs', // Changed from 'esm' to 'cjs' for Obsidian plugin compatibility
        splitting: false, // Disable code splitting for CommonJS
        platform: 'node', // Keep as node to resolve built-in modules
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
    
    // Copy codestyles based on the list in build-config.json
    const codestyleSource = 'node_modules/highlight.js/styles';
    const codestyleDest = 'dist/assets/codestyle';
    await fs.mkdir(codestyleDest, { recursive: true });

    // Define the list of themes to copy directly here
    const hljsThemes = 
    [
        "atom-one-dark.css", 
        "github.css",
        "gradient-light.css",
        "gradient-dark.css",
        "monokai.css",
        "xcode.css"
        
    ];

    if (hljsThemes && Array.isArray(hljsThemes)) {
        console.log('[esbuild] Copying specified highlight.js themes...');
        for (const themeFile of hljsThemes) {
            const sourceFile = path.join(codestyleSource, themeFile);
            const destFile = path.join(codestyleDest, themeFile);
            try {
                await fs.copyFile(sourceFile, destFile);
                console.log(`  - Copied ${themeFile}`);
            } catch (copyError) {
                console.warn(`  - Warning: Could not find or copy theme '${themeFile}'. Please check the filename.`);
            }
        }
    } else {
        console.warn('[esbuild] Warning: No hljsThemes array found in build-config.json. No highlight.js themes will be copied.');
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
                        await moveToTrash(itemPath);
                    } else {
                        await moveToTrash(itemPath);
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