/* ═══════════════════════════════════════════════════════════════════════════
   RECORDER — Video recording with quality presets
   ═══════════════════════════════════════════════════════════════════════════ */

let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
const originalSize = { width: 390, height: 844 };

function startRecording() {
  const quality = document.getElementById('setup-quality').value;
  const preset = QUALITY_PRESETS[quality];

  const originalFOV = camera.fov;
  const originalAspect = camera.aspect;

  if (quality !== 'preview') {
    renderer.setSize(preset.width, preset.height);

    if (quality === 'tiktok') {
      const targetAspect = preset.width / preset.height;
      const currentAspect = originalSize.width / originalSize.height;
      camera.fov = originalFOV * Math.sqrt(currentAspect / targetAspect);
      camera.aspect = targetAspect;
    } else {
      camera.aspect = preset.width / preset.height;
    }

    camera.updateProjectionMatrix();
    renderTarget.setSize(preset.width, preset.height);
    if (postMaterial?.uniforms.uResolution) {
      postMaterial.uniforms.uResolution.value.set(preset.width, preset.height);
    }
  }

  const canvas = renderer.domElement;
  const stream = canvas.captureStream(60);

  let mimeType = 'video/webm;codecs=vp9';
  if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
  else if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

  mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: preset.bitrate });
  recordedChunks = [];

  mediaRecorder._originalFOV = originalFOV;
  mediaRecorder._originalAspect = originalAspect;
  mediaRecorder._quality = quality;

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const isMP4 = mimeType.includes('mp4');
    const blob = new Blob(recordedChunks, { type: isMP4 ? 'video/mp4' : 'video/webm' });
    const url = URL.createObjectURL(blob);
    const ext = isMP4 ? 'mp4' : 'webm';
    const a = document.createElement('a');
    a.href = url;
    a.download = `pura-forest-day${dayNumber}-${preset.width}x${preset.height}-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (mediaRecorder._quality !== 'preview') {
      renderer.setSize(originalSize.width, originalSize.height);
      camera.aspect = mediaRecorder._originalAspect;
      camera.fov = mediaRecorder._originalFOV;
      camera.updateProjectionMatrix();
      renderTarget.setSize(originalSize.width, originalSize.height);
      if (postMaterial?.uniforms.uResolution) {
        postMaterial.uniforms.uResolution.value.set(originalSize.width, originalSize.height);
      }
    }

    document.getElementById('recording-indicator').classList.remove('recording--active');
    isRecording = false;
  };

  mediaRecorder.start();
  isRecording = true;
  document.getElementById('recording-indicator').classList.add('recording--active');
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
}
