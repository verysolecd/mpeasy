import esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import trash from 'trash';

/**
 * 将文件或文件夹移至回收站
 * @param {string | string[]} paths 路径或路径数组
 */
async function moveToTrash(paths) {
    try {
        await trash(paths);
    } catch (err) {
        // 忽略不存在的文件或其他普通错误
        console.warn(`[trash] Warning: Could not move ${paths} to trash: ${err.message}`);
    }
}

/**
 * 部署到目标路径下的 Mpe_dist 目录中
 * @param {string} sourceFolder 源目录
 * @param {string} rootTargetPath 根目标路径
 */
async function deployToTarget(sourceFolder, rootTargetPath) {
    if (!rootTargetPath) {
        console.log('[esbuild] No target path specified. Skipping deployment.');
        return;
    }
    
    // Mpe_dist 作为真正路径
    const mpeDistPath = path.join(rootTargetPath, 'Mpe_dist');
    console.log(`[esbuild] Deploying to ${mpeDistPath}...`);
    
    // 先清理目标目录
    try {
        await fs.access(mpeDistPath);
        
        // 读取目录内容
        const items = await fs.readdir(mpeDistPath);
        
        // 删除每个子项，除了 data.json
        for (const item of items) {
            if (item !== 'data.json') {
                const itemPath = path.join(mpeDistPath, item);
                await moveToTrash(itemPath);
            }
        }
    } catch {
        // 目标目录不存在则跳过清理
    }
    
    // 确保目标目录存在
    await fs.mkdir(mpeDistPath, { recursive: true });
    
    // 从 sourceFolder 复制所有文件到 mpeDistPath
    await fs.cp(sourceFolder, mpeDistPath, { recursive: true });
    
    console.log('[esbuild] Deployment completed successfully.');
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
    await deployToTarget('dist', targetPath);
    
    console.log('[esbuild] Build process finished successfully.');
} catch (e) {
    console.error('[esbuild] Build failed:', e.message);
    process.exit(1);
}