## 原生 nodejs 实现上传

#### 使用说明

```
import { parse } from 'url';
import { createServer } from 'http';
import upload from '@qingh/upload';
const port = 8080;

createServer(async (req, res) => {
	const { pathname } = parse(req.url, true);
 	if (pathname === '/api/v1/upload') {
    if (req.method.toLowerCase() === 'post') {
    	res.setHeader('content-type', 'application/json;charset=utf8');
      try {
        let data = await upload(req, res, {
          uploadDir: 'upload',
          type: ['jpg', 'png','gif'],
          maxSize: 5 * 1024 * 1024
        });
				res.write('upload success');
      } catch (error) {
        res.write('upload fail');
      }
			res.end();
    }
  }else{
		//other codes
	}
}).listen(port);

```
