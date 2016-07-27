var minimist = require('minimist');
var path = require('path');
var colors = require('colors');
var Server = require('../app');

exports.run = function () {
    var options = exports.getOptions(process.argv.slice(2));
    if (options.help) {
        return exports.printHelpInfo('mockman file_or_dirname');
    }
    if (options.version) {
        return exports.printVersionInfo();
    }
    var app = new Server(options);
    app.start();
};

exports.getOptions = function getOptions(argv) {
    var options = minimist(
        argv || [], {
            boolean: ['help', 'version'],
            string: ['port', 'root'],
            default: {
                port: Server.DEFAULT_PORT,
                path: process.cwd()
            },
            alias: {
                h: 'help',
                v: 'version',
                p: 'port',
                r: 'root'
            }
        }
    );
    if (options._[0]) {
        options.path = path.resolve(process.cwd(), options._[0]);
    } else {
        options.path = process.cwd();
    }
    var port = options.port;
    port = parseInt(port, 10);
    if (isNaN(port)) {
        options.port = options.p = Server.DEFAULT_PORT;
    }
    var root = options.root;
    if (root) {
        options.root = options.r = path.resolve(process.cwd(), root);
    }
    return options;
};

exports.printVersionInfo = function printVersionInfo() {
    var pkg = require('../package');
    console.log('%s v%s', pkg.name, pkg.version);
};

exports.printHelpInfo = function printHelpInfo(usage) {
    usage = usage || 'mockman file_or_dirname';
    var str = [
        '',
        colors.cyan('# mockman-go'),
        '',
        colors.cyan('## Options'),
        '',
        '   -v,--version         show version info',
        '   -h,--help            show help info',
        '   -p,--port            specify the port',
        '   -r,--root            specify the server root directory',
        '',
        colors.cyan('## Usage'),
        '',
        colors.yellow('   ' + usage + ' [option]'),
        ''
    ].join('\n');
    console.log(str);
}