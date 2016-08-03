var log4js = require('log4js');

log4js.configure({
    appenders: [
        //{ type: 'console' },
        {type: 'file', filename: process.cwd() + '/server.log'}
    ]
});

// 请求转发的logger
exports.transpond = log4js.getLogger('transpond');
// mock数据的logger
exports.mock = log4js.getLogger('mock');