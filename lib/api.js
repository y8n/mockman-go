var fs = require('fs');
var globby = require('globby');
var methods = require('methods');
var pathUtil = require('path');
var colors = require('colors');
var util = require('util');
require('date-util');

function getApis(path) {
    var apis = [];
    var stat = fs.statSync(path);
    if (stat.isFile()) {
        try {
            var api = require(path);
            if (apiIsValid(api, path)) {
                apis.push(api);
            }
        } catch (error) {
        }
    } else if (stat.isDirectory()) {
        globby.sync([path + '/**/*.+(js|json)','!**/{node_modules,bower_components}/**']).forEach(function (filePath) {
            var api = require(filePath);
            if (apiIsValid(api, filePath)) {
                apis.push(api);
            }
        });
    }
    return apis;
}
function apiIsValid(api, filePath) {
    api = api || {};
    api.method = api.method || 'get';
    // 必须使用可用的请求类型
    if (methods.indexOf(api.method) === -1) {
        console.log('No method called "%s" in file "%s"', api.method, filePath);
        return false;
    }
    // 必须指定url
    if (!api.url) {
        console.log('You must specify a url in file "%s"', filePath);
        return false;
    }
    api.response = getResponse(api, filePath);
    return true;
}

function getResponse(api, filePath) {
    if (api.response && util.isString(api.response)) {
        return function () {
            var jsonPath = pathUtil.resolve(pathUtil.dirname(filePath), api.response);
            return require(jsonPath);
        };
    }
    if (api.response && util.isFunction(api.response)) {
        return api.response;
    }
    return function () {
        return {};
    }
}
function printLogInfo(method, url, request) {
    var log = [
        '[' + new Date().format('yyyy-mm-dd HH:MM:ss') + ']',
        method.toUpperCase() + '',
        url,
        JSON.stringify(request)
    ].join(' - ');
    console.log(log);
}

module.exports = function (router, path) {
    if(!path){
        console.log('[ERROR] path is undefined.');
        return false;
    }
    if (!fs.existsSync(path)) {
        console.log('[ERROR] '+path+' is not exists.');
        return false;
    }
    if(!pathUtil.isAbsolute(path)){
        console.log('[WARNING] '+path+' must be a absolute path.');
        return false;
    }
    var apis = getApis(path);
    var len = apis.length;
    if (!len) {
        console.warn(colors.yellow('[WARNING] no api is avliable.'));
        return false;
    }
    console.warn('[INFO] ' + apis.length + ' api' + (apis.length > 1 ? 's' : '') + ' is avliable.'.green);
    apis.forEach(api => {
        router[api.method](api.url, function * () {
            var request = {
                query: this.request.query || {},
                params: this.params || {},
                data: this.request.body || {}
            };
            printLogInfo(api.method, api.url, request);
            this.body = api.response(request) || null;
        });
    });
    return true;
};
