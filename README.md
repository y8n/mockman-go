# mockman-go

一个简单的mock服务器。

## Install

```
npm install -g mockman-go
```

## Usage

### Command Line

```
mockman  // 指定当前目录的所有js和json文件为api配置文件
mockman file_or_dirname [options]
```

### Node.JS Api

```
var Mockman = require('mockman-go');
var server = new Mockman({
	port: 9001,   //指定端口，默认是 Mockman.DEFAULT_PORT，即8090
	watch: true,  // 是否监听文件变化，默认为false
	path: '/your/path' // 必须是绝对路径，无默认值，必须指定
});
server.start();    // 启动服务器
server.stop();     // 关闭服务器
server.restart();  // 重启服务器
```

## Options

- `-p/--port`：指定服务器监听的端口号，默认是8090
- `-r/--root`：指定server的静态文件目录

## Api Config
指定mock地址和数据的文件内容

```
module.exports = {
	url: '/mock/path',
	method: 'post',
	response: function(request){
		return {};
	}
};
```
或者指定为是json文件的内容

```
module.exports = {
	url: '/mock/path',
	method: 'post',
	response: '../path/to/json/or/node_module'
};
```
API的配置可以指定mock数据的地址、方式以及请求回复。

- `url`：指定请求地址，字符串或字符串数组，**必须至少指定一个，不然该配置无效**
- `method`：请求方式，默认是`get`，必须是可用的请求方式之一，参考NodeJS[官方文档](https://nodejs.org/dist/latest-v4.x/docs/api/http.html#http_http_methods)
- `disabled`：是否禁用这个API，设置为`falsy`值时不会启用这个API
- `proxy`：是否使用转发代理功能
- `response`：回复内容，可以是字符串表示的地址，`require()`这个地址之后的内容即为mock请求的返回数据。也可以是方法，则方法的返回值即为请求的响应值。
	- `request`：当`response`指定为函数时，有一个参数可以使用，包含了该请求中的参数信息。
		- `params`：URL上的参数，如`"/admin/user/:name"`的URL在接收到`"/admin/user/y8n"`的请求的时候，`params`即为`{name:"y8n"}`，默认为`{}`
		- `query`：URL中以？尾页携带的参数，多为`GET`请求参数，默认为`{}`
		- `data`：`POST` 请求的参数，默认为`{}`

## Proxy
mockman-go可以在API中配置转发功能，需要在**执行命令**的目录下存在`transpond-config.js`文件并在其中配置转发规则。如下

```
module.exports = {
    //目标服务器的ip和端口，域名也可，但注意不要被host了
    targetServer: {
        'host': 'xx.xx.xx.xx',
        'port': '8080'
    },
    //特殊请求转发，可选配置，内部的host、port和path为可选参数
    regExpPath: {
        '/app/[^?]*': {
            'host': '127.0.0.1',
            'port': '8080',
            'path': '/index.html'
        }
    }
};
```

## License
MIT