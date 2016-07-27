module.exports = {
    //目标服务器的ip和端口，域名也可，但注意不要被host了
    targetServer: {
        'host': '10.4.237.105',
        'port': '8080'
    },
    //特殊请求转发，可选配置，内部的host、port为可选参数
    regExpPath: {
        '/app/[^?]*': {
            'host': '127.0.0.1',
            'port': '8090',
            isStatic: true,
            'path': '/index.html'
        }
    }
};
