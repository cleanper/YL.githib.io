const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const moment = require('moment');
const path = require('path');
const iconv = require('iconv-lite');

const app = express();
app.use(express.urlencoded({ extended: true }));

app.use('/wallpaper', express.static(path.join(__dirname, 'public', 'wallpaper')));

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 105 * 1024 * 1024 },
  filename: (req, file, cb) => {
    const originalName = iconv.decode(Buffer.from(file.originalname, 'latin1'), 'utf8');
    cb(null, originalName);
  }
});

fs.ensureDirSync('uploads/');

let files = [];

async function loadFiles() {
  try {
    files = await fs.readJson('files.json');
  } catch (err) {
    files = [];
  }
}

loadFiles();

function saveFiles() {
  fs.writeJsonSync('files.json', files);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const username = req.body.username;
  const uploadDate = moment().format('YYYY-MM-DD HH:mm:ss');

  if (!file) {
    return res.status(400).send('未上传文件。');
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!['.zip', '.txt', '.jar', '.log', '.jpg', '.png', '.gif'].includes(ext)) {
    return res.status(400).send('无效的文件类型。');
  }

  const newFilename = iconv.decode(Buffer.from(file.originalname, 'latin1'), 'utf8');
  await fs.move(`uploads/${file.filename}`, `uploads/${newFilename}`);

  files.push({
    filename: newFilename,
    originalname: file.originalname,
    username: username,
    uploadDate: uploadDate,
  });

  saveFiles();

  res.send(`文件上传成功，上传者：${username}，上传时间：${uploadDate}`);
});

app.get('/download/:filename', async (req, res) => {
  const file = `uploads/${req.params.filename}`;
  if (await fs.pathExists(file)) {
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(req.params.filename)}`);
    res.download(file, (err) => {
      if (err) {
        console.error(err);
      }
    });
  } else {
    res.status(404).send('文件未找到。');
  }
});

app.get('/files', async (req, res) => {
  res.json(files);
});

app.listen(35576, () => {
  console.log('服务器运行在35576端口');
});