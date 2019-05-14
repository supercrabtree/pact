const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { remote } = require('electron');
const createCompressionSection = require('./compression-section');

const cancelButton = document.querySelector('.cancelButton');
const saveButton = document.querySelector('.saveButton');

let states = [];

remote.process.argv.slice(2).map(imageFile => {
  createCompressionSection(imageFile).then(
    ({ element, state }) => {
      document.querySelector('.compressionSections').appendChild(element);
      states.push(state);
    });
});

cancelButton.addEventListener('click', () => remote.app.quit());

saveButton.addEventListener('click', async () => {
  await Promise.all(states.map(async ({ originalImageURI, compressedPngURI }) => {
    const originalDirname = path.dirname(originalImageURI);
    const originalExtension = path.extname(originalImageURI);
    const originalBasename = path.basename(originalImageURI, originalExtension);

    await fs.copyFile(originalImageURI, path.join(originalDirname, originalBasename + '.original' + originalExtension));
    await fs.copyFile(compressedPngURI, path.join(originalDirname, originalBasename + '.png'));
  }));

  remote.app.quit();
});