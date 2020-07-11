const { v1 } = require('uuid');
const path = require('path');
const { createWriteStream, mkdir, stat } = require('fs');

async function createDirectory(uploadDir) {
  return new Promise((resolve, reject) => {
    mkdir(path.resolve(process.cwd(), uploadDir), err => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

async function directoryIsExists(uploadDir) {
  return new Promise((resolve, reject) => {
    stat(path.resolve(process.cwd(), uploadDir), (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

async function upload(req, res, options) {
  let params = {
    type: ['jpg', 'png'],
    uploadDir: 'upload',
    maxSize: 5 * 1024 * 1024
  };
  options = Object.assign({}, params, options);
  try {
    await directoryIsExists(options.uploadDir);
  } catch (error) {
    try {
      await createDirectory(options.uploadDir);
    } catch (err) {
      reject({
        msg: err.message
      });
    }
  }

  let header = req.headers['content-type'];
  let boundary = '--' + header.split('; ')[1].split('=')[1];
  let splitStr = [...Buffer.from(boundary)].join(',');
  return new Promise((resolve, reject) => {
    const arr = [];
    req.on('data', data => {
      arr.push(...data);
    });
    req.on('end', () => {
      let str = arr.join(',');
      let arr1 = str.split(splitStr);
      arr1.shift(); //去掉头部的空字符串
      arr1.pop(); //去掉尾部的 --\r\n
      arr1 = arr1.map(item => (item = item.substring(1, item.length - 1))); //去掉首尾逗号
      arr1 = arr1.map(item => (item = item.substring(6, item.length - 6))); //去掉首尾\r\n  [13,10,X,X,X,13,10] 只需要X,X,X,
      let arr2 = [];
      arr1.forEach(item => {
        let [key, value] = item.split(',13,10,13,10,');
        arr2.push({ key, value });
      });
      arr2 = arr2.map(item => {
        return { key: Buffer.from(item.key.split(',')).toString(), value: item.value };
      });
      let json = {};
      arr2.forEach(item => {
        let [a, b, c] = item.key.split('; ');
        let key = b.split('=')[1];
        if (c) {
          //二进制
          let filenameStr = c.split('\r\n')[0].split('=')[1];
          let extName = path
            .extname(JSON.parse(filenameStr))
            .substring(1)
            .toLowerCase(); //parse 是因为split后是 '"1.jpg"'
          let buffer = Buffer.from(item.value.split(','));
          if (!options.type.includes(extName)) {
            reject({
              msg: '文件格式不合法'
            });
            return;
          }

          if (buffer.length > options.maxSize) {
            reject({
              msg: '文件大小不合法'
            });
            return;
          }

          let newName = v1().replace(/-/g, '');
          let writStream = createWriteStream(path.resolve(process.cwd(), `${options.uploadDir}/${newName}.${extName}`));
          writStream.write(buffer);
          writStream.end();
          writStream.on('finish', () => {
            json[key] = `${options.uploadDir}/${newName}.${extName}`;
            resolve(json);
          });
        } else {
          //普通文本
          json[key] = Buffer.from(item.value.split(',')).toString();
        }
      });
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

module.exports = upload;
