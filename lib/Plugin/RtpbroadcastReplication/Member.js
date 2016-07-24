var _ = require('underscore');

/**
 * @param {String} role
 * @param {String} upstream
 * @constructor
 */
var RtpbroadcastReplicationMember = function(role, upstream) {
  if (!_.contains(RtpbroadcastReplicationMember.ROLES, role)) {
    throw new Error('Invalid role `' + role + '`');
  }
  this.role = role;
  this.upstreamId = upstream;
  this.clients = [];
};

/**
 * @param {Object} data
 * @returns {RtpbroadcastReplicationMember}
 */
RtpbroadcastReplicationMember.fromData = function(data) {
  return new RtpbroadcastReplicationMember(data['role'], data['upstream']);
};

RtpbroadcastReplicationMember.ROLES = {
  MULTIEDGE: 'multiedge',
  EDGE: 'edge',
  REPEATER: 'repeater',
  ORIGIN: 'origin'
};

module.exports = RtpbroadcastReplicationMember;
