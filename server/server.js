const express = require('express');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());


const publicDir = path.join(__dirname, 'public');
const tempDir = path.join(__dirname, 'temp');
[publicDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});
app.use('/public', express.static(publicDir));


function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    
    const file = fs.createWriteStream(destination);
    https.get(url, { headers: { 'User-Agent': 'Chrome/120.0.0.0' } }, response => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download file: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Finished Downloading`);
        resolve(destination);
      });
    }).on('error', err => {
      fs.unlink(destination, () => {}); 
      console.error(`Error Downloading`);
      reject(err);
    });

    file.on('error', err => {
      fs.unlink(destination, () => {});
      console.error(`Could not write to File`);
      reject(err);
    });
  });
}


app.post('/process-video', async (req, res) => {
  const timestamp = Date.now();
  const tempFiles = [];

  try {
    const { video1, video2 } = req.body;
    if (!video1 || !video2) {
      return res.status(400).json({ status: 'error', message: 'Both video URLs are required' });
    }

    //Creates the file paths
    const video1Path = path.join(tempDir, `video1-${timestamp}.mp4`);
    const video2Path = path.join(tempDir, `video2-${timestamp}.mp4`);
    const tempList = path.join(tempDir, `list-${timestamp}.txt`);
    const outputFile = path.join(publicDir, `output-${timestamp}.mp4`);

    // List of temp Files
    tempFiles.push(video1Path, video2Path, tempList);

    // Downloads both videos
    console.log('Downloading!');
    await Promise.all([
      downloadFile(video1, video1Path),
      downloadFile(video2, video2Path)
    ]);

    // list file
    const fileList = `file '${video1Path}'\nfile '${video2Path}'`;
    fs.writeFileSync(tempList, fileList);

   // ffmeg conversion logic
    ffmpeg()
      .input(tempList)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-vf', 'scale=trunc(iw*0.5/2)*2:-2',
        '-c:v', 'libx264',
        '-crf', '10',
        '-preset', 'slow',
        '-pix_fmt', 'yuv420p'
      ])
      .on('start', cmd => console.log('FFmpeg command:', cmd))
      .on('progress', p => console.log('Processing progress:', p))
      .on('error', (err) => {

        tempFiles.forEach(filePath => {
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, () => {});
          }
        });

        return res.status(500).json({
          status: 'error',
          message: 'Video processing failed',
          error: err.message
        });
      })
      .on('end', () => {
        console.log('Video was successfully processed');
        tempFiles.forEach(filePath => {
          if (fs.existsSync(filePath)) {
            fs.unlink(filePath, () => {});
          }
        });

        const processedVideoUrl = `${req.protocol}://${req.get('host')}/public/${path.basename(outputFile)}`;
        console.log('Generated URL:', processedVideoUrl);
        return res.status(200).json({ status: 'success', processed_video_url: processedVideoUrl });
      })
      .save(outputFile);
  } catch (error) {
    console.error('An error occured', error);
    tempFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
    });

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.get('/health', (req, res) =>
  res.status(200).json({ status: 'ok', message: 'Server is running' })
);
const PORT = process.env.PORT || 5040;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
