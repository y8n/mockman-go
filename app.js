var koa = require('koa');
var bodyParser = require('koa-bodyparser');
var Router = require('koa-router');
var destroyable = require('server-destroy');
var watch = require('node-watch');
var fs = require('fs');
var api = require('./lib/api');

Server.DEFAULT_PORT = 8090;

function Server(options) {
    var port = options.port;
    port = parseInt(port, 10);
    if (isNaN(port)) {
        options.port = options.p = Server.DEFAULT_PORT;
    }
    this.options = options;
    this.app = koa();
    this.router = Router();
    this.app.use(bodyParser())
        .use(this.router.routes())
        .use(this.router.allowedMethods());
}
var watched = false;
Server.prototype.start = function () {
    var self = this;
    var app = self.app;
    var port = self.options.port;
    var configApi = api(self.router, self.options.path);
    if(!configApi){
        return;
    }
    self._server = app.listen(port);
    destroyable(self._server);
    console.log('server listening on port %d', port);
    if (self.options.watch && !watched) {
        watched = true;
        watchDir(self.options.path, function () {
            self.restart();
        });
    }
};
Server.prototype.stop = function () {
    this._server && this._server.destroy();
};
Server.prototype.restart = function () {
    this.stop();
    this.start();
};
function watchFilter(pattern, fn) {
    return function (filename) {
        if (pattern.test(filename)) {
            fn(filename);
        }
    }
}
function watchDir(path, cb) {
    watch(path, watchFilter(/\.(js|json)$/, function (filename) {
        cb(filename);
    }));
}
module.exports = Server;