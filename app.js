var koa = require('koa');
var bodyParser = require('koa-bodyparser');
var Router = require('koa-router');
var RouteParser = require('route-parser');
var koaStatic = require('koa-static');
var destroyable = require('server-destroy');
var api = require('./lib/api');
var transponder = require('./lib/transponder');
var fs = require('fs');

Server.DEFAULT_PORT = 8090;

function Server(options) {
    var self = this;
    self.options = options;
    self.app = koa();
    self.router = Router();
    self.apis = api.getAvaliableApis(options);
    var root = options.root;
    if(root){
        self.app.use(function * (next) {
            var reqPath = this.request.path;
            var isMockPath = self.apis.find(function (api) {
                return api.url.indexOf(reqPath) !== -1;
            });
            if(!isMockPath){
                isMockPath = self.apis.find(function(api){
                    return api.url.find(function(url){
                        var route = new RouteParser(url);
                        return route.match(reqPath);
                    });
                });
            }
            // 不在配置列表里或者默认的API都是可转发的,除非指定proxy为false
            if (!isMockPath || isMockPath.proxy) {
                try {
                    this.proxyResponse = yield transponder.transpond(this.req);
                    // 如果不是配置的API或者指定了特殊静态文件的转发,直接返回客户端
                    if(!isMockPath || this.proxyResponse.isStatic){
                        this.body = this.proxyResponse.data;
                    }
                } catch (e) {
                    this.proxyResponse = e;
                }
            }
            yield next;
        });
        self.app.use(koaStatic(root));
    }
    self.app.use(bodyParser())
        .use(self.router.routes())
        .use(self.router.allowedMethods());
}
Server.prototype.start = function () {
    var self = this;
    var app = self.app;
    var port = self.options.port;
    var configApi = api.config(self.router, self.apis);
    if (!configApi) {
        return;
    }
    self._server = app.listen(port);
    destroyable(self._server);
    console.log('server listening on port %d', port);
};
Server.prototype.stop = function () {
    this._server && this._server.destroy();
};
Server.prototype.restart = function () {
    this.stop();
    this.start();
};
module.exports = Server;