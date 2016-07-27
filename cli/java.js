var cli = require('./');
var Server = require('../app');

exports.run = function () {
    var options = cli.getOptions(process.argv.slice(2));
    if (options.help) {
        return cli.printHelpInfo('mockman-java dirname');
    }
    if (options.version) {
        return cli.printVersionInfo();
    }
    options.java = true;
    var app = new Server(options);
    app.start();
};