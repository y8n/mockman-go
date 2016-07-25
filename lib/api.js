var fs = require('fs');
var globby = require('globby');
var methods = require('methods');
var pathUtil = require('path');
var colors = require('colors');
var util = require('util');
var jUtil = require('./javaUtil');
require('date-util');

/**
 * 获取Js定义的api
 * @param path
 * @returns {Array}
 */
function getJsApis(path) {
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
        globby.sync([path + '/**/*.js', '!**/{node_modules,bower_components}/**']).forEach(function (filePath) {
            var api = require(filePath);
            if (apiIsValid(api, filePath)) {
                apis.push(api);
            }
        });
    }
    return apis;
}
/**
 * 获取Java定义的api
 * @param path
 * @returns {Array}
 */
function getJavaApis(path) {
    var apis = [];
    var stat = fs.statSync(path);
    if (stat.isFile()) {
        throw new Error('[ERROR] You must use a directory in mockman-java command');
    } else if (stat.isDirectory()) {
        jUtil.import(path).forEach(function(javaApi){
            if (apiIsValid(javaApi, javaApi.filePath)) {
                apis.push(javaApi);
            }
        });
    }
    return apis;
}
/**
 * 检查api是否可用,比如是否指定了url,同时对response进行统一
 * @param api
 * @param filePath
 * @returns {boolean}
 */
function apiIsValid(api, filePath) {
    api = api || {};
    // 配置为 disabled 的不启用
    if (api.disabled) {
        return false;
    }
    api.method = api.method || 'get';
    // 必须使用可用的请求类型
    if (methods.indexOf(api.method) === -1) {
        console.log('No method called "%s" in file "%s"', api.method, filePath);
        return false;
    }
    // 必须指定url
    api.url = formatUrl(api.url);
    if (!api.url.length) {
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
/**
 * 格式化url,返回url数组,都是以/开头的字符串
 * @param urls
 * @returns {Array}
 */
function formatUrl(urls) {
    return [].concat(urls).filter(function (url) {
        return url.toString().trim();
    }).map(function (url) {
        return url.substr(0, 1) === '/' ? url : ('/' + url);
    });
}

function pathIsInvalid(path) {
    if (!path) {
        console.log('[ERROR] path is undefined.');
        return true;
    }
    if (!fs.existsSync(path)) {
        console.log('[ERROR] ' + path + ' is not exists.');
        return true;
    }
    if (!pathUtil.isAbsolute(path)) {
        console.log('[WARNING] ' + path + ' must be a absolute path.');
        return true;
    }
    return false;
}

module.exports = function (router, options) {
    var path = options.path;
    if (pathIsInvalid(path)) {
        return false;
    }
    var apis = [];
    if (options.java) {
        apis = getJavaApis(path);
    } else {
        apis = getJsApis(path);
    }
    var len = apis.length;
    if (!len) {
        console.warn(colors.yellow('[WARNING] no api is avliable.'));
        return false;
    }
    var count = 0;
    apis.forEach(function (api) {
        api.url.forEach(function (url) {
            count++;
            router[api.method](url, function * () {
                var request = {
                    url: url,
                    query: this.request.query || {},
                    params: this.params || {},
                    data: this.request.body || {}
                };
                printLogInfo(api.method, url, request);
                this.body = api.response(request) || null;
            });
        });
    });
    console.warn('[INFO] ' + count + ' api' + (count > 1 ? 's' : '') + ' is avliable.'.green);
    return true;
};
