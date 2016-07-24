var _ = require('underscore');
var util = require('util');
var EventEmitter = require('events');
var log = require('./Logger').getLogger();
var Promise = require('bluebird');

var Member = require('./Member');

function Cluster() {
  this.members = [];
  this.plugins = [];
}

util.inherits(Cluster, EventEmitter);

/**
 * @param {Member} member
 * @returns {Promise}
 */
Cluster.prototype.registerMember = function(member) {
  var self = this;
  if (this._hasMember(member)) {
    log.debug('Member already present');
    return Promise.resolve();
  }

  return Promise
    .try(function() {
      return Promise.map(_.where(self.members, {id: member.id}), function(existingMember) {
        log.info('Member exists with different properties, unregistering existing');
        return self.unregisterMember(existingMember);
      });
    })
    .then(function() {
      return member.openConnection().then(function(connection) {
        self.addMember(member);
        self.emit('register-member', member);

        connection.on('close', function() {
          self.unregisterMember(member);
        });
      });
    });
};

Cluster.prototype.unregisterMember = function(member) {
  this.removeMember(member);
  this.emit('unregister-member', member);
  return Promise.resolve();
};

/**
 * @param {Member} member
 */
Cluster.prototype.addMember = function(member) {
  this.members.push(member);
};

/**
 * @param {Member} member
 */
Cluster.prototype.removeMember = function(member) {
  this.members = _.without(this.members, member);
};

/**
 * @param {Member} member
 * @returns {Boolean}
 * @private
 */
Cluster.prototype._hasMember = function(member) {
  return !!_.find(this.members, function(existingMember) {
    return existingMember.equals(member);
  });
};


/**
 * @param {AbstractPlugin} plugin
 */
Cluster.prototype.registerPlugin = function(plugin) {
  this.plugins.push(plugin);
  this.emit('register-plugin', plugin);
};

module.exports = Cluster;
