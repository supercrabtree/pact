const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const filesize = require('filesize');
const execa = require('execa');
const { ipcRenderer } = require('electron');
const { debounce } = require('./debounce');

let originalImageLocation;
let compressedPngLocation;
let originalImageSize;
const originalLabel = document.querySelector('.originalLabel');
const originalImage = document.querySelector('.originalImage');
const compressedLabel = document.querySelector('.compressedLabel');
const compressedImage = document.querySelector('.compressedImage');
const compressedImageMask = document.querySelector('.compressedImageMask');
const pngquantControlsTitle = document.querySelector('.pngquantControlsTitle ');
const imageDiff = document.querySelector('.imageDiff');
const sliderTop = document.querySelector('.sliderTop');
const sliderBottom = document.querySelector('.sliderBottom');
const labelContainer = document.querySelector('.labelContainer');
const cancelButton = document.querySelector('.cancelButton');
const saveButton = document.querySelector('.saveButton');
const pngquantForm = document.forms['pngquantForm'];

originalImage.addEventListener('load', () => {
  compressedImageMask.style.height = originalImage.clientHeight + 4 + 'px';
  imageDiff.style.height = originalImage.clientHeight + 12 + 'px';
  sliderBottom.style.width = originalImage.clientWidth + 17 + 'px';
  sliderTop.style.width = originalImage.clientWidth + 17 + 'px';
  compressedImageMask.style.width = originalImage.clientWidth / 2 + 'px';
  labelContainer.style.width = originalImage.clientWidth + 'px';
});

sliderTop.addEventListener('input', e => {
  sliderBottom.value = e.target.value;
  compressedImageMask.style.width = originalImage.clientWidth * e.target.value + 'px';
});

sliderBottom.addEventListener('input', e => {
  sliderTop.value = e.target.value;
  compressedImageMask.style.width = originalImage.clientWidth * e.target.value + 'px';
});

pngquantForm.addEventListener('change', debounce(async () => {
  compressedPngLocation = await compressPng();
  compressedImage.setAttribute('src', compressedPngLocation);
}, 200));

cancelButton.addEventListener('click', () => ipcRenderer.send('quit'));
saveButton.addEventListener('click', async () => {
  const originalExtension = path.extname(originalImageLocation);
  const originalBasename = path.basename(originalImageLocation, originalExtension);

  await fs.copyFile(originalImageLocation, originalBasename + '.original' + originalExtension);
  await fs.copyFile(compressedPngLocation, originalBasename + '.png');
  ipcRenderer.send('quit');
});

ipcRenderer.on('files', async (e, files) => {
  originalImageLocation = files[0];
  originalImage.setAttribute('src', originalImageLocation);

  compressedPngLocation = await compressPng();
  compressedImage.setAttribute('src', compressedPngLocation);

  const { size: originalImageSize } = await fs.stat(originalImageLocation);
  setOriginalImageSize(originalImageSize);

  const { size: compressedPngSize } = await fs.stat(compressedPngLocation);
  setCompressedPngSize(compressedPngSize);
});

function setOriginalImageSize(size) {
  originalImageSize = size;
  originalLabel.textContent = 'original ' + filesize(size);
}

function setCompressedPngSize(size) {
  const savings = getPercentageSavings(originalImageSize, size);
  compressedLabel.textContent = 'compressed png ' + filesize(size);
  pngquantControlsTitle.innerHTML = `pnquant – ${filesize(size)} (<span class="${savings >= 100 ? 'warning' : ''}">${savings}%</span>)`;
}

function getPercentageSavings(originalSize, compressedSize) {
  return (Math.ceil((compressedSize/originalSize) * 10000)/100)
}

function compressPng() {
  const quality = pngquantForm.pngquantQuality.valueAsNumber;
  const dither = pngquantForm.pngquantDither.valueAsNumber;
  const tmpfile = os.tmpdir() + '/pact-' + Date.now() + '.png';

  return execa(`pngquant --quality=${quality} --floyd=${dither} --speed=1 -o ${tmpfile} ${originalImageLocation}`, { shell: true })
    .then(() => {
      fs.stat(tmpfile).then(({size}) => setCompressedPngSize(size));
    })
    .then(() => tmpfile)
    .catch((e) => {
      console.log(e);
    });
}

ipcRenderer.send('ready');
