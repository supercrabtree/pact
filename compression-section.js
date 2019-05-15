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
      <div>
        <div class="pngquantControls">
          <pre class="pngquantControlsTitle">pnquant</pre>
          <form name="pngquantForm" class="pngquantForm">
            <pre class="pngquantQuality">Quality</pre>
            <fieldset oninput="pngquantQualityNumber.value = pngquantQuality.valueAsNumber">
              <input class="pngquantQuality" name="pngquantQuality" type="range" step="1" min="1" max="100" value="50">
              <output class="pngquantQualityNumber" name="pngquantQualityNumber" for="pngquantQuality">50</output>
            </fieldset>
          </form>
        </div>
        <div class="webpControls">
          <pre class="webpControlsTitle">webp</pre>
          <form name="webpForm" class="webpForm">
            <pre class="webpQuality">Quality</pre>
            <fieldset oninput="webpQualityNumber.value = webpQuality.valueAsNumber">
              <input class="webpQuality" name="webpQuality" type="range" step="1" min="1" max="100" value="50">
              <output class="webpQualityNumber" name="webpQualityNumber" for="webpQuality">50</output>
            </fieldset>
            <pre class="webpPreset">Preset</pre>
            <fieldset class="webpPreset">
              <div>
                <input name="webpPreset" type="radio" value="default" checked>
                <label class="webpPresetLabel" for="webpPresetDefault">default</label>
              </div>
              <div>
                <input name="webpPreset" type="radio" value="photo">
                <label class="webpPresetLabel">photo</label>
              </div>
              <div>
                <input name="webpPreset" type="radio" value="picture">
                <label class="webpPresetLabel">picture</label>
              </div>
              <div>
                <input name="webpPreset" type="radio" value="drawing">
                <label class="webpPresetLabel">drawing</label>
              </div>
              <div>
                <input name="webpPreset" type="radio" value="icon">
                <label class="webpPresetLabel">icon</label>
              </div>
              <div>
                <input name="webpPreset" type="radio" value="text">
                <label class="webpPresetLabel">text</label>
              </div>
            </fieldset>
          </form>
        </div>
        <div class="mozjpegControls">
          <pre class="mozjpegControlsTitle">mozjpeg</pre>
          <form name="mozjpegForm" class="mozjpegForm">
            <pre class="mozjpegQuality">Quality</pre>
            <fieldset oninput="mozjpegQualityNumber.value = mozjpegQuality.valueAsNumber">
              <input class="mozjpegQuality" name="mozjpegQuality" type="range" step="1" min="1" max="100" value="50">
              <output class="mozjpegQualityNumber" name="mozjpegQualityNumber" for="mozjpegQuality">50</output>
            </fieldset>
          </form>
        </div>
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
  const pngquantControlsTitle = section.querySelector('.pngquantControlsTitle');
  const webpControlsTitle = section.querySelector('.webpControlsTitle');
  const mozjpegControlsTitle = section.querySelector('.mozjpegControlsTitle');
  const sliderTop = section.querySelector('.sliderTop');
  const sliderBottom = section.querySelector('.sliderBottom');
  const pngquantForm = section.querySelector('.pngquantForm');
  const webpForm = section.querySelector('.webpForm');
  const mozjpegForm = section.querySelector('.mozjpegForm');
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
    const { pngURI, pngSize } = await compressPng(originalImageURI, pngquantForm);
    state.compressedPngURI = pngURI;
    setCompressedPngSize(pngSize, originalImageSize, compressedLabel, pngquantControlsTitle);
    compressedImage.setAttribute('src', state.compressedPngURI);
  }, 100));

  webpForm.addEventListener('change', debounce(async () => {
    const { webpURI, webpSize } = await compressWebp(originalImageURI, webpForm);
    state.compressedWebpURI = webpURI;
    setCompressedWebpSize(webpSize, originalImageSize, compressedLabel, webpControlsTitle);
    compressedImage.setAttribute('src', state.compressedWebpURI);
  }, 100));

  mozjpegForm.addEventListener('change', debounce(async () => {
    const { mozjpegURI, mozjpegSize } = await compressMozjpeg(originalImageURI, mozjpegForm);
    state.compressedJpegURI = mozjpegURI;
    setCompressedMozjpegSize(mozjpegSize, originalImageSize, compressedLabel, mozjpegControlsTitle);
    compressedImage.setAttribute('src', state.compressedJpegURI);
  }, 100));

  let originalImageSize;
  let state = {
    originalImageURI,
    compressedPngURI: undefined,
    compressedWebpURI: undefined,
    compressedJpegURI: undefined,
  };

  originalImageSize = (await fs.stat(originalImageURI)).size;
  setOriginalImageSize(originalImageSize, originalLabel);

  const { mozjpegURI, mozjpegSize } = await compressMozjpeg(originalImageURI, mozjpegForm);
  state.compressedJpegURI = mozjpegURI;
  setCompressedMozjpegSize(mozjpegSize, originalImageSize, compressedLabel, mozjpegControlsTitle);
  compressedImage.setAttribute('src', state.compressedJpegURI);

  const { webpURI, webpSize } = await compressWebp(originalImageURI, webpForm);
  state.compressedWebpURI = webpURI;
  setCompressedWebpSize(webpSize, originalImageSize, compressedLabel, webpControlsTitle);
  compressedImage.setAttribute('src', state.compressedWebpURI);

  const { pngURI, pngSize } = await compressPng(originalImageURI, pngquantForm);
  state.compressedPngURI = pngURI;
  setCompressedPngSize(pngSize, originalImageSize, compressedLabel, pngquantControlsTitle);
  compressedImage.setAttribute('src', state.compressedPngURI);

  originalImage.setAttribute('src', originalImageURI);

  setTimeout(() => section.style.visibility = 'visible');

  return {
    state,
    element: section,
  };
};

function setOriginalImageSize(size, originalLabel) {
  originalLabel.textContent = 'original ' + filesize(size);
}

function getPercentageSavings(originalSize, compressedSize) {
  return (Math.ceil((compressedSize/originalSize) * 10000)/100)
}

function setCompressedPngSize(size, originalImageSize, compressedLabel, pngquantControlsTitle) {
  const savings = getPercentageSavings(originalImageSize, size);
  compressedLabel.textContent = 'compressed png ' + filesize(size);
  pngquantControlsTitle.innerHTML = `pnquant – ${filesize(size)} (<span class="${savings >= 100 ? 'warning' : ''}">${savings}%</span>)`;
}

function compressPng(originalImageURI, pngquantForm) {
  const quality = pngquantForm.pngquantQuality.valueAsNumber;
  const tmpfile = os.tmpdir() + '/pact-' + Date.now() + '.png';

  return execa(`pngquant --verbose --quality=0-${quality} --speed=1 -o ${tmpfile} ${originalImageURI}`, { shell: true })
    .then(() => fs.stat(tmpfile))
    .then(stats => ({ pngURI: tmpfile, pngSize: stats.size }))
    .catch((e) => console.log(e));
}

function setCompressedWebpSize(size, originalImageSize, compressedLabel, webpControlsTitle) {
  const savings = getPercentageSavings(originalImageSize, size);
  compressedLabel.textContent = 'compressed webp ' + filesize(size);
  webpControlsTitle.innerHTML = `webp – ${filesize(size)} (<span class="${savings >= 100 ? 'warning' : ''}">${savings}%</span>)`;
}

function compressWebp(originalImageURI, webpForm) {
  const quality = webpForm.webpQuality.valueAsNumber;
  const preset = webpForm.webpPreset.value;
  const tmpfile = os.tmpdir() + '/pact-' + Date.now() + '.webp';

  return execa(`cwebp -preset ${preset} -q ${quality} -mt -m 6 -o ${tmpfile} ${originalImageURI}`, { shell: true })
    .then(() => fs.stat(tmpfile))
    .then(stats => ({ webpURI: tmpfile, webpSize: stats.size }))
    .catch((e) => console.log(e));
}

function setCompressedMozjpegSize(size, originalImageSize, compressedLabel, mozjpegControlsTitle) {
  const savings = getPercentageSavings(originalImageSize, size);
  compressedLabel.textContent = 'compressed mozjpeg ' + filesize(size);
  mozjpegControlsTitle.innerHTML = `mozjpeg – ${filesize(size)} (<span class="${savings >= 100 ? 'warning' : ''}">${savings}%</span>)`;
}

function compressMozjpeg(originalImageURI, mozjpegForm) {
  const quality = mozjpegForm.mozjpegQuality.valueAsNumber;
  const tmpfile = os.tmpdir() + '/pact-' + Date.now() + '.jpeg';

  return execa(`/usr/local/opt/mozjpeg/bin/cjpeg -progressive -quality ${quality} -outfile ${tmpfile} ${originalImageURI}`, { shell: true })
    .then(() => fs.stat(tmpfile))
    .then(stats => ({ mozjpegURI: tmpfile, mozjpegSize: stats.size }))
    .catch((e) => console.log(e));
}
