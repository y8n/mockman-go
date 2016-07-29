var fs = require('fs');
var globby = require('globby');
var methods = require('methods');
var pathUtil = require('path');
var util = require('util');
var jUtil = require('./javaUtil');
var logger = require('./log').mock;
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
            if (formatApi(api, path)) {
                apis.push(api);
            }
        } catch (error) {
            logger.error(error.message);
        }
    } else if (stat.isDirectory()) {
        globby.sync([path + '/**/*.js', '!**/{node_modules,bower_components}/**']).forEach(function (filePath) {
            var api = require(filePath);
            if (formatApi(api, filePath)) {
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
        jUtil.import(path).forEach(function (javaApi) {
            if (formatApi(javaApi, javaApi.filePath)) {
                apis.push(javaApi);
            }
        });
    }
    return apis;
}
/**
 * 检查api是否可用,比如是否指定了url,同时对response和proxy进行统一
 * @param api
 * @param filePath
 * @returns {boolean}
 */
function formatApi(api, filePath) {
    api = api || {};
    // 配置为 disabled 的不启用
    if (api.disabled) {
        return false;
    }
    api.method = api.method || 'get';
    // 必须使用可用的请求类型
    if (methods.indexOf(api.method) === -1) {
        logger.warn('No method called "%s" in file "%s"', String(api.method).toUpperCase(), filePath);
        return false;
    }
    // 必须指定url
    api.url = formatUrl(api.url);
    if (!api.url.length) {
        logger.warn('You must specify a url in file "%s"', filePath);
        return false;
    }
    api.response = getResponse(api, filePath);
    api.proxy = typeof api.proxy === 'undefined' ? true : api.proxy;
    return true;
}
/**
 * 获取相应方法
 * @param api
 * @param filePath
 * @returns {*}
 */
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
    return function (req, res) {
        return typeof res === 'undefined' ? {} : res;
    }
}
/**
 * 格式化url,返回url数组,都是以/开头的字符串
 * @param urls
 * @returns {Array}
 */
function formatUrl(urls) {
    if(!urls){
        return [];
    }
    return [].concat(urls).filter(function (url) {
        return url.toString().trim();
    }).map(function (url) {
        return url.substr(0, 1) === '/' ? url : ('/' + url);
    });
}
/**
 * 检查path是否可用
 * @param path - 指定的存放API的目录
 * @returns {boolean}
 */
function pathIsInvalid(path) {
    if (!path) {
        logger.error('[ERROR] path is undefined.');
        return true;
    }
    if (!fs.existsSync(path)) {
        logger.error('[ERROR] ' + path + ' is not exists.');
        return true;
    }
    if (!pathUtil.isAbsolute(path)) {
        logger.error('[WARNING] ' + path + ' must be a absolute path.');
        return true;
    }
    return false;
}
/**
 * 获取所有可用的API
 * @param options
 * @returns {Array}
 */
exports.getAvaliableApis = function (options) {
    var path = options.path;
    if (pathIsInvalid(path)) {
        throw new Error('[ERROR]: path is invalid!');
    }
    if (options.java) {
        return getJavaApis(path);
    }
    return getJsApis(path);
};

/**
 * 对API进行路由配置
 * @param router
 * @param apis
 * @returns {boolean} 是否成功
 */
exports.config = function (router, apis) {
    var len = apis.length;
    if (!len) {
        console.log('no api is avliable.');
        return false;
    }
    var count = 0;
    apis.forEach(function (api) {
        api.url.forEach(function (url) {
            count++;
            router[api.method](url, function * () {
                var request = {
                    query: this.request.query || {},
                    params: this.params || {},
                    data: this.request.body || {}
                };
                var pathname = this.request.path;
                logger.debug(api.method.toUpperCase() + '-' + pathname + '-' + JSON.stringify(request));
                request.url = url;
                if (this.proxyResponse) { // 是否有proxy的情况
                    this.response.header = this.proxyResponse.headers;
                    this.response.status = this.proxyResponse.statusCode;
                    var response;
                    try {
                        response = JSON.parse(this.proxyResponse.data);
                    } catch (e) {
                        response = this.proxyResponse.data;
                    }
                    this.body = api.response(request, response);
                } else {
                    this.body = api.response(request);
                }
            });
        });
    });
    console.info('[INFO] ' + count + ' api' + (count > 1 ? 's' : '') + ' is avliable.');
    return true;
};
