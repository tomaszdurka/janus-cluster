var _ = require('underscore');
var util = require('util');
var EventEmitter = require('events');

var Server = require('./JanusServer');
var RtpbroadcastReplication = require('./Handler/RtpbroadcastReplication');

function Cluster() {
  this.servers = [];
  this.plugins = [];
  this.plugins.push(new RtpbroadcastReplication(this));
}

util.inherits(Cluster, EventEmitter);

Cluster.prototype.register = function(server) {
  var self = this;
  if (self._hasServer(server)) {
    throw new Error('Server already present');
  }

  return server.openConnection().then(function(connection) {
    self.add(server);
    self.emit('register', server);

    connection.on('close', function() {
      self.remove(server);
      self.emit('unregister', server);
    });
  });
};

Cluster.prototype.add = function(server) {
  this.servers.push(server);
};

Cluster.prototype.remove = function(server) {
  this.servers = _.without(this.servers, server);
};

Cluster.prototype._hasServer = function(server) {
  return _.contains(this.servers, server);
};

module.exports = Cluster;
