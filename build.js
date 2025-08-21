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
    console.log(' Dist目录已清理');
}

// 复制文件到Dist
function copyToDist() {
    const filesToCopy = [
        { src: 'manifest.json', dest: 'Dist/manifest.json' },
        { src: 'styles.css', dest: 'Dist/styles.css' },
        { src: 'README.md', dest: 'Dist/README.md' }
    ];

    filesToCopy.forEach(({ src, dest }) => {
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(` 已复制: ${src} → ${dest}`);
        }
    });

    // 复制assets
    const assetsSrc = path.join(__dirname, 'assets');
    const assetsDest = path.join(__dirname, 'Dist', 'assets');
    
    if (fs.existsSync(assetsSrc)) {
        copyDirectory(assetsSrc, assetsDest);
        console.log(' assets目录已复制');
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
        console.log(' 开始构建...');        
        // 清理Dist目录
        cleanDist();        
        // 执行构建
        console.log(' 构建插件...');
        execSync('node esbuild.config.mjs production', { stdio: 'inherit' });        
        console.log(' 构建库文件...');
        execSync('node esbuild.config.mjs libs', { stdio: 'inherit' });        
        // 复制文件
        copyToDist();        
        console.log(' 构建完成！');
        console.log(' 输出目录: Dist/');        
        // 列出Dist目录内容
        const distFiles = fs.readdirSync('Dist');
        console.log('\n Dist目录内容:');
        distFiles.forEach(file => {
            const stats = fs.statSync(path.join('Dist', file));
            console.log(`  ${stats.isDirectory() ? '' : ''} ${file}`);
        });        
        // Deploy plugin
        deployPlugin(); // Call deploy after build
    } catch (error) {
        console.error('❌ 构建失败:', error.message);
        process.exit(1);
    }
}

const buildConfig = require('./build.json'); // Load build.json

function deployPlugin() {
    const deployPath = buildConfig.deployPath;
    const distPath = path.join(__dirname, 'Dist');
    const dataJsonPath = path.join(deployPath, 'data.json');

    console.log(` 开始部署到: ${deployPath}`);

    // 1. 清理部署目录 (除data.json外)
    if (fs.existsSync(deployPath)) {
        const entries = fs.readdirSync(deployPath, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = path.join(deployPath, entry.name);
            if (entry.name === 'data.json') {
                console.log(` 跳过清理: ${entryPath}`);
                continue;
            }
            if (entry.isDirectory()) {
                fs.rmSync(entryPath, { recursive: true, force: true });
                console.log(` 已清理目录: ${entryPath}`);
            } else {
                fs.unlinkSync(entryPath);
                console.log(` 已清理文件: ${entryPath}`);
            }
        }
    } else {
        fs.mkdirSync(deployPath, { recursive: true });
        console.log(` 创建部署目录: ${deployPath}`);
    }

    // 2. 复制Dist目录内容到部署目录
    copyDirectory(distPath, deployPath);
    console.log(` Dist目录内容已复制到: ${deployPath}`);
}

// 如果直接运行此脚本
if (require.main === module) {
    build();
}
module.exports = { build, cleanDist, copyToDist, deployPlugin };