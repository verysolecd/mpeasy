const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// 清理Dist目录
function cleanDist() {
    const distPath = path.join(__dirname, 'Dist');
    if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true });
    }
    fs.mkdirSync(distPath, { recursive: true });
    fs.mkdirSync(path.join(distPath, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(distPath, 'assets', 'codestyle'), { recursive: true });
  
}
// 复制文件到Dist
function copyToDist() {
    const filesToCopy = [
        { src: 'manifest.json', dest: 'Dist/manifest.json' },
        
        { src: 'README.md', dest: 'Dist/README.md' }
    ];
    filesToCopy.forEach(({ src, dest }) => {
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
          
        }
    });
    // 复制assets
    const assetsSrc = path.join(__dirname, 'assets');
    const assetsDest = path.join(__dirname, 'Dist', 'assets');
    if (fs.existsSync(assetsSrc)) {
        copyDirectory(assetsSrc, assetsDest);
        console.log(`   ==Dist Cleared and COPY OK==: ${assetsSrc} → ${assetsDest}`);
    }
}
// 递归复制目录
function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
// 执行构建
function build() {
    try {
        console.log(' == Build Started...');        
        // 清理Dist目录
        cleanDist();  
        execSync('node esbuild.config.mjs production', { stdio: 'inherit' });        
         execSync('node esbuild.config.mjs libs', { stdio: 'inherit' });        
        // 复制文件
        copyToDist();        
        console.log(' ==Build OK==');
        // 列出Dist目录内容
        const distFiles = fs.readdirSync('Dist');
        console.log('\n Dist Files:');
        distFiles.forEach(file => {
            const stats = fs.statSync(path.join('Dist', file));
            console.log(`  ${stats.isDirectory() ? '' : ''} ${file}`);
        });        
        // Deploy plugin
        deployPlugin(); // Call deploy after build
    } catch (error) {
        console.error('== build error:', error.message);
        process.exit(1);
    }
}
const buildConfig = require('./build.json'); // Load build.json
function deployPlugin() {
    const deployPath = buildConfig.deployPath;
    const distPath = path.join(__dirname, 'Dist');
    const dataJsonPath = path.join(deployPath, 'data.json');
    console.log(` ==Deploy TO: ${deployPath}`);
    // 1. 清理部署目录 (除data.json外)
    if (fs.existsSync(deployPath)) {
        const entries = fs.readdirSync(deployPath, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(deployPath, entry.name);
            if (entry.name === 'data.json') {
                continue;
            }
            if (entry.isDirectory()) {
                fs.rmSync(entryPath, { recursive: true, force: true });
                console.log(` ==Clear Dir: ${entryPath}`);
            } else {
                fs.unlinkSync(entryPath);
                console.log(` ==Clear File: ${entryPath}`);
            }
        }
    } else {
        fs.mkdirSync(deployPath, { recursive: true });
    }
    // 2. 复制Dist目录内容到部署目录
    copyDirectory(distPath, deployPath);
    console.log(` ==Copy Dist To: ${deployPath}`);
}
// 如果直接运行此脚本
if (require.main === module) {
    build();
}
module.exports = { build, cleanDist, copyToDist, deployPlugin };