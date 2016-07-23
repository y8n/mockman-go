var minimist = require('minimist');
var path = require('path');
var colors = require('colors');
var Server = require('../app');

exports.run = function () {
    var options = getOptions(process.argv.slice(2));
    if (options.help) {
        return printHelpInfo();
    }
    if (options.version) {
        return printVersionInfo();
    }
    var app = new Server(options);
    app.start();
};

function getOptions(argv) {
    var options = minimist(
        argv || [], {
            boolean: ['help', 'version', 'watch'],
            string: ['port'],
            default:{
                port: Server.DEFAULT_PORT,
                watch: false,
                path: process.cwd()
            },
            alias: {
                h: 'help',
                v: 'version',
                p: 'port',
                w: 'watch'
            }
        }
    );
    if (options._[0]) {
        options.path = path.resolve(process.cwd(), options._[0]);
    } else {
        options.path = process.cwd();
    }
    return options;
}

function printVersionInfo() {
    var pkg = require('../package');
    console.log('%s v%s', pkg.name, pkg.version);
}

function printHelpInfo() {
    var str = [
        '',
        colors.cyan('# mockman-go'),
        '',
        colors.cyan('## Options'),
        '',
        '   -v,--version         show version info',
        '   -h,--help            show help info',
        '   -p,--port            specify the port',
        '   -w,--watch           watch the directory',
        '',
        colors.cyan('## Usage'),
        '',
        colors.yellow('   mockman file_or_dirname [option]'),
        ''
    ].join('\n');
    console.log(str);
}