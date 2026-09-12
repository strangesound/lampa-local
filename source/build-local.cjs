const fs = require('node:fs/promises');
const path = require('node:path');
const { rollup } = require('rollup');
const { babel } = require('@rollup/plugin-babel');
const commonjs = require('@rollup/plugin-commonjs');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const worker = require('rollup-plugin-web-worker-loader');
const sass = require('sass');
(async () => {
    process.chdir(__dirname);
    const out = path.resolve(__dirname, '../dist');
    await fs.mkdir(out, { recursive: true });
    await fs.cp('public', out, { recursive: true });
    await fs.cp('src/lang', path.join(out, 'lang'), { recursive: true });
    const bundle = await rollup({
        input: 'src/app.js',
        plugins: [babel({ babelHelpers: 'bundled', presets: ['@babel/preset-env'] }), commonjs(), nodeResolve(), worker()],
        onwarn(w) { if (!['CIRCULAR_DEPENDENCY','THIS_IS_UNDEFINED'].includes(w.code)) console.warn(w.message); }
    });
    const { output } = await bundle.generate({ format: 'iife' });
    for (const item of output) {
        if (item.type !== 'chunk') throw new Error('Unexpected build asset');
        await fs.writeFile(path.join(out, 'app.js'), item.code.replaceAll('{__APP_BUILD__}', new Date().toISOString()).replaceAll('{__APP_HASH__}', 'local').replaceAll('return kIsNodeJS', 'return false'));
    }
    await bundle.close();
    await fs.mkdir(path.join(out, 'css'), { recursive: true });
    for (const name of await fs.readdir('src/sass')) {
        if (!name.endsWith('.scss') || name.startsWith('_')) continue;
        const result = sass.compile(path.join('src/sass', name), { style: 'compressed', logger: {warn() {}, debug() {}} });
        await fs.writeFile(path.join(out, 'css', name.replace(/scss$/, 'css')), result.css);
    }
    await fs.mkdir(path.join(out, 'plugins'), { recursive: true });
    await fs.writeFile(path.join(out, 'plugins/modification.js'), '// Local plugins can be added here.\n');
    await fs.copyFile('LICENSE', path.join(out, 'LICENSE'));
    console.log('Built local Lampa:', out);
})().catch(error => { console.error(error); process.exitCode = 1; });
