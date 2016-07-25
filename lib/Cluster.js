var _ = require('underscore');
var util = require('util');
var EventEmitter = require('events');
var log = require('./Logger').getLogger();
var Promise = require('bluebird');
var Context = require('./Context');

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
  var existingMember = this.findMemberById(member.id);

  if (member.equals(existingMember)) {
    log.debug('Member already present');
    return Promise.resolve();
  }

  return Promise
    .try(function() {
      if (existingMember) {
        log.info('Member exists with different properties, unregistering existing');
        return self.unregisterMember(existingMember);
      }
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
  log.debug('Unregister member', new Context({member: member}));
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
 * @param {String} memberId
 * @returns {Member|Null}
 */
Cluster.prototype.findMemberById = function(memberId) {
  return _.findWhere(this.members, {id: memberId});
};

/**
 * @param {AbstractPlugin} plugin
 */
Cluster.prototype.registerPlugin = function(plugin) {
  this.plugins.push(plugin);
  this.emit('register-plugin', plugin);
};

module.exports = Cluster;
