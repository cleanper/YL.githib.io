const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
const moment = require('moment');
const path = require('path');
const iconv = require('iconv-lite');
const morgan = require('morgan');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(fileUpload({ createParentPath: true }));

app.use('/public', express.static(path.join(__dirname, 'public')));

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
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', (req, res) => {
  const file = req.files.file;
  const username = req.body.username;
  const uploadDate = moment().format('YYYY-MM-DD HH:mm:ss');

  if (!file) {
    return res.status(400).send('未上传文件。');
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!['.zip', '.txt', '.jar', '.log', '.jpg', '.png', '.gif'].includes(ext)) {
    return res.status(400).send('无效的文件类型。');
  }

  const newFilename = iconv.decode(Buffer.from(file.name, 'latin1'), 'utf8');
  const uploadPath = path.join(__dirname, 'uploads', newFilename);

  file.mv(uploadPath, async (err) => {
    if (err) {
      console.error('文件上传失败：', err);
      return res.status(500).send('文件上传失败。');
    }

    files.push({
      filename: newFilename,
      originalname: file.name,
      username: username,
      uploadDate: uploadDate,
    });
    saveFiles();
    res.send(`文件上传成功，上传者：${username}，上传时间：${uploadDate}`);
  });
});

app.get('/download/:filename', async (req, res) => {
  const file = `uploads/${req.params.filename}`;
  if (await fs.pathExists(file)) {
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(req.params.filename)}`);
    res.download(file, (err) => {
      if (err) {
        console.error('文件下载失败：', err);
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