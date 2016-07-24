var _ = require('underscore');
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var Context = require('./Context');
var log = require('./Logger').getLogger();

var Member = require('./Member');

/**
 * @param {Number} port
 * @param {Cluster} cluster
 * @constructor
 */
function HttpServer(port, cluster) {
  this.port = port;
  this.cluster = cluster;

  var app = express();
  var router = express.Router();
  this.server = http.createServer(app);

  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());
  app.use(router);
  app.disable('x-powered-by');
  app.disable('etag');

  router.post('/register', this.register.bind(this));
  router.get('/status', this.status.bind(this));

  this.installPluginHandlers(router);
}

/**
 * @param {Router} router
 */
HttpServer.prototype.installPluginHandlers = function(router) {
  this.cluster.plugins.forEach(function(plugin) {
    plugin.installHttpHandlers(router);
  });
  this.cluster.on('register-plugin', function(plugin) {
    plugin.installHttpHandlers(router);
  });
};

HttpServer.prototype.register = function(req, res, next) {
  var params = _.extend({}, req.params, req.body);
  var logContext = new Context({httpRequest: params});
  log.debug('HTTP: Registering member', logContext);

  var id = params['id'];
  var webSocketAddress = params['webSocketAddress'];
  var data = params['data'];
  var member = new Member(id, webSocketAddress, data);

  this.cluster.registerMember(member)
    .then(function(response) {
      res.send({success: 'Member registered'});
      return next();
    })
    .catch(function(error) {
      console.log(error);
      log.error('HTTP: Could not register member', logContext.extend({exception: error}));
      res.send({error: 'Could not register member: ' + error.message});
      return next();
    });
};

HttpServer.prototype.status = function(req, res, next) {
  var members = [];
  this.cluster.members.forEach(function(member) {
    members.push(member.toJSON());
  });
  res.send({membersCount: members.length});
  return next();
};

HttpServer.prototype.start = function() {
  var self = this;
  return new Promise(function(resolve) {
      self.server.listen(self.port, function() {
        log.info('HTTP: Server started at port ' + self.port);
        resolve();
      });
    }
  );
};

module.exports = HttpServer;
