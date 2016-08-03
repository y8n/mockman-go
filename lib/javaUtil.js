var java = require('java');
var path = require('path');
var spawnSync = require('child_process').spawnSync;
var globby = require('globby');
var fs = require('fs');
var del = require('del');

var ORG_JSON_PATH = path.resolve(__dirname, '../java-src/json.org.jar');

var OUTPUT_DIR = process.env.HOME + '/.mockman-java-classes';

function createJSONObject(obj) {
    var JSONObject = java.import('org.json.JSONObject');
    return new JSONObject(JSON.stringify(obj));
}

exports.import = function (dirPath) {
    if (dirPath.substr(-1, 1) !== '/') { //使路径以/结尾
        dirPath += '/';
    }
    java.classpath.push(ORG_JSON_PATH);
    java.classpath.push(OUTPUT_DIR);
    var files = compileJavaFiles(dirPath);
    var classNames = parseFilePath2ClassName(dirPath, files);
    var Class, apis = [];
    classNames.forEach(function (className, index) {
        Class = java.import(className);
        var responseFn = function () {
            return function () {
                return {};
            };
        };
        if (Class.responseSync) {
            responseFn = function(_Class){
                return function (request, response) {
                    var jsonString = _Class.responseSync(createJSONObject(request), createJSONObject(response)).toString();
                    return JSON.parse(jsonString);
                };
            };
        }
        apis.push({
            filePath: files[index],
            url: Class.url,
            method: Class.method,
            disabled: Class.disabled,
            proxy: Class.proxy,
            response: responseFn(Class)
        });
    });
    return apis;
};

function compileJavaFiles(dirPath) {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    } else {
        del.sync([OUTPUT_DIR + '/**/*'], {force: true});
    }
    var files = globby.sync([dirPath + '**/*.java', '!**/{node_modules,bower_components}/**']);
    var argv = [
        '-classpath',
        ORG_JSON_PATH,
        '-d',
        OUTPUT_DIR
    ];
    argv = argv.concat(files);
    var result = spawnSync('javac', argv);
    if (result.status) {
        console.log(result.stderr.toString());
        throw new Error('[ERROR]:error occured when compile java file error.see details in log.');
    }
    return files;
}
function parseFilePath2ClassName(dirPath, files) {
    return files.map(function (file) {
        return file.replace(dirPath, '').replace(/\.java$/, '').replace(/\//g, '.');
    });
}