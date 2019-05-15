#!/usr/bin/env node

const updateNotifier = require('update-notifier');
const pkg = require('./package.json');
const execa = require('execa');
const fs = require('fs');

let hadError = [];

try {
  fs.accessSync('/usr/local/opt/webp/bin/cwebp');
} catch (e) {
  hadError.push('webp');
}

try {
  fs.accessSync('/usr/local/opt/mozjpeg/bin/cjpeg');
} catch (e) {
  hadError.push('mozjpeg');
}

try {
  fs.accessSync('/usr/local/opt/pngquant/bin/pngquant');
} catch (e) {
  hadError.push('pngquant');
}

if (hadError.length) {
  console.error(`Missing dependencies please run \`brew install ${hadError.join(' ')}\``);
} else {
  updateNotifier({pkg}).notify();
  execa('yarn start', process.argv, {shell: true})
    .catch(e => console.error(e));
}
