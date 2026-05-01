const sharp = require('sharp');
const fs = require('fs');

async function convert() {
  const input = '/home/ashwin/.gemini/antigravity/brain/6de44abd-03cf-440e-b519-b4bc65195936/journey_app_demo_video_1777607880110.webp';
  const output = '/home/ashwin/.gemini/antigravity/brain/6de44abd-03cf-440e-b519-b4bc65195936/artifacts/journey_demo.gif';
  
  try {
    await sharp(input, { animated: true, limitInputPixels: false })
      .resize({ width: 800 }) // scale it down a bit to make the GIF smaller and process faster
      .gif()
      .toFile(output);
    console.log("Success! Saved as GIF.");
  } catch(e) {
    console.error("Conversion failed:", e);
  }
}

convert();
