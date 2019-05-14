const fs = require('fs').promises;
const os = require('os');
const execa = require('execa');
const filesize = require('filesize');
const { debounce } = require('./debounce');

module.exports = async function createCompressionSection(originalImageURI) {
  const template = `
    <div class="imageCompressor">
      <div class="preview">
        <div class="labelContainer">
          <pre class="compressedLabel">compressed</pre>
          <pre class="originalLabel">original</pre>
        </div>
        <input class="slider sliderTop" type="range" min="0" max="1" step="any">
        <div class="imageDiff">
          <img class="image originalImage">
          <div class="compressedImageMask">
            <img class="image compressedImage">
          </div>
        </div>
        <input class="slider sliderBottom" type="range" min="0" max="1" step="any">
      </div>
      <div class="pngquantControls">
        <pre class="pngquantControlsTitle">pnquant</pre>

        <form name="pngquantForm" class="pngquantForm">
          <pre class="pngquantQuality">Quality</pre>
          <fieldset oninput="pngquantQualityNumber.value = pngquantQuality.valueAsNumber">
            <input class="pngquantQuality" name="pngquantQuality" type="range" step="1" min="1" max="100" value="50">
            <output class="pngquantQualityNumber" name="pngquantQualityNumber" for="pngquantQuality" >50</output>
          </fieldset>
          <fieldset oninput="pngquantDitherNumber.value = pngquantDither.valueAsNumber">
            <pre>Floyd-Steinberg dither</pre>
            <input class="pngquantDither" name="pngquantDither" type="range" step="0.001" min="0" max="1" value="1">
            <output class="pngquantDitherNumber" name="pngquantDitherNumber" for="pngquantDither" >1</output>
          </fieldset>
        </form>
      </div>
    </div>
  `;
  const section = document.createElement('section');
  section.style.visibility = 'hidden';
  section.innerHTML = template.trim();

  const originalLabel = section.querySelector('.originalLabel');
  const originalImage = section.querySelector('.originalImage');
  const compressedLabel = section.querySelector('.compressedLabel');
  const compressedImage = section.querySelector('.compressedImage');
  const compressedImageMask = section.querySelector('.compressedImageMask');
  const pngquantControlsTitle = section.querySelector('.pngquantControlsTitle ');
  const sliderTop = section.querySelector('.sliderTop');
  const sliderBottom = section.querySelector('.sliderBottom');
  const pngquantForm = section.querySelector('.pngquantForm');
  const imageDiff = section.querySelector('.imageDiff');
  const labelContainer = section.querySelector('.labelContainer');

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
    const { URI, size } = await compressPng(originalImageURI, pngquantForm);
    state.compressedPngURI = URI;
    setCompressedPngSize(size, originalImageSize, compressedLabel, pngquantControlsTitle);
    compressedImage.setAttribute('src', state.compressedPngURI);
  }, 20));

  let originalImageSize;
  let state = {
    originalImageURI,
    compressedPngURI: undefined,
  };

  const { size, URI } = await compressPng(originalImageURI, pngquantForm);
  state.compressedPngURI = URI;
  compressedImage.setAttribute('src', state.compressedPngURI);
  originalImage.setAttribute('src', originalImageURI);

  originalImageSize = (await fs.stat(originalImageURI)).size;
  setOriginalImageSize(originalImageSize, originalLabel);
  setCompressedPngSize(size, originalImageSize, compressedLabel, pngquantControlsTitle);

  setTimeout(() => section.style.visibility = 'visible');

  return {
    state,
    element: section,
  };
};

function setOriginalImageSize(size, originalLabel) {
  originalLabel.textContent = 'original ' + filesize(size);
}

function setCompressedPngSize(size, originalImageSize, compressedLabel, pngquantControlsTitle) {
  const savings = getPercentageSavings(originalImageSize, size);
  compressedLabel.textContent = 'compressed png ' + filesize(size);
  pngquantControlsTitle.innerHTML = `pnquant – ${filesize(size)} (<span class="${savings >= 100 ? 'warning' : ''}">${savings}%</span>)`;
}

function getPercentageSavings(originalSize, compressedSize) {
  return (Math.ceil((compressedSize/originalSize) * 10000)/100)
}

function compressPng(originalImageURI, pngquantForm) {
  const quality = pngquantForm.pngquantQuality.valueAsNumber;
  const dither = pngquantForm.pngquantDither.valueAsNumber;
  const tmpfile = os.tmpdir() + '/pact-' + Date.now() + '.png';

  return execa(`pngquant --verbose --quality=0-${quality} --floyd=${dither} --speed=1 -o ${tmpfile} ${originalImageURI}`, { shell: true })
    .then(() => fs.stat(tmpfile))
    .then(stats => ({ URI: tmpfile, size: stats.size }))
    .catch((e) => console.log(e));
}