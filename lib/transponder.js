var http = require('http');
var path = require('path');
var fs = require('fs');
var Promise = require('bluebird');
var logger = require('./log').transpond;

exports.transpond = function (req) {
    return new Promise(function (resolve, reject) {
        var rootPath = process.cwd();
        var configFullPath = path.resolve(rootPath, 'transpond-config.js');
        delete require.cache[configFullPath];
        try {
            var transCurrent = require(configFullPath);
        } catch (e) {
            throw new Error('Cannot find transpond-config.js!');
        }

        if (!transCurrent) {
            throw new Error('transpond-config.js setting error!');
        }

        var options = {
            headers: JSON.parse(JSON.stringify(req.headers)),
            host: transCurrent.targetServer.host,
            path: req.url,
            method: req.method,
            port: transCurrent.targetServer.port || 80
        };

        //匹配regExpPath做特殊转发
        for (var i in transCurrent.regExpPath) {
            if (req.url.match(i)) {
                var special = transCurrent.regExpPath[i];
                options.host = special.host || options.host;
                options.port = special.port || options.port;
                if (special.path) {
                    options.path = req.url.replace(new RegExp(i), special.path);
                }
                options.isStatic = !!special.isStatic;
                break;
            }
        }

        logger.info('%s to %s', req.headers.host + req.url, (options.host || options.hostname) + ':' + options.port + options.path);
        var serverReq = http.request(options, function (serverRes) {
            var data = '';
            serverRes.on('data', function (chunk) {
                data += chunk.toString();
            });
            serverRes.on('end', function () {
                resolve(responseFactory(true, serverRes.statusCode, serverRes.headers, data, null, options.isStatic));
            });
        });

        // 超时处理, 10s超时
        serverReq.on('socket', function (socket) {
            socket.setTimeout(10000);
            socket.on('timeout', function () {
                serverReq.abort();
                reject(responseFactory(false, 504, '', null, 'transpond setTimeout!'));
            });
        });

        serverReq.on('error', function (e) {
            reject(responseFactory(false, 500, '', null, 'problem with request: ' + e.message));
        });

        req.addListener('data', function (chunk) {
            serverReq.write(chunk);
        });

        req.addListener('end', function () {
            serverReq.end();
        });
    });
};
/**
 * 生成回复内容
 * @param success - 请求是否成功
 * @param statusCode - 状态码
 * @param headers - header
 * @param data - 请求返回内容
 * @param message - 返回消息
 * @param isStatic - 指定特殊转发的时候是否是静态文件
 * @returns {{success: boolean, statusCode: *, headers: *, data: *, message: *, isStatic: boolean}}
 */
function responseFactory(success, statusCode, headers, data, message, isStatic) {
    return {
        success: !!success,
        statusCode: statusCode,
        headers: headers,
        data: data,
        message: message,
        isStatic: !!isStatic
    };
}
