var util = require('util');
var EventEmitter = require('events');
var Promise = require('bluebird');
var Mountpoint = require('./Mountpoint');
var MountpointList = require('./MountpointList');


function RtpbroadcastReplicationPair(downstream, upstream) {
  RtpbroadcastReplicationPair.super_.call(this);
  this.downstream = downstream;
  this.upstream = upstream;

  this.downstreamSession = null;
  this.upstreamSession = null;
  this.mountpoints = new MountpointList;
}

util.inherits(RtpbroadcastReplicationPair, EventEmitter);

RtpbroadcastReplicationPair.prototype.register = function() {
  return Promise.all([
      this.openDownstreamSession(),
      this.openUpstreamSession()
    ])
    .then(this.listenForMountpointInfo.bind(this));
};

RtpbroadcastReplicationPair.prototype.unregister = function() {
  return Promise.all([
    this.closeDownstreamSession(),
    this.closeUpstreamSession()
  ]);
};


RtpbroadcastReplicationPair.prototype.listenForMountpointInfo = function() {
  var self = this;
  return this.upstreamSession.attachPlugin('rtpbroadcast')
    .then(function(plugin) {
      plugin.on('message', function(message) {
        if (message['body']['request'] === 'mountpoint-info') {
          self.updateMountpoints(message['body']['data']);
        }
      });
      // add transaction
      return plugin.send('upgrade connection');
    });
};

RtpbroadcastReplicationPair.prototype.openDownstreamSession = function() {
  if (this.downstreamSession) {
    throw new Error('Downstream session already present');
  }
  return this.downstream.getConnection().createSession()
    .then(function(session) {
      return this.downstreamSession = session;
    }.bind(this));
};

RtpbroadcastReplicationPair.prototype.closeDownstreamSession = function() {
  return this.downstreamSession.destroy().finally(function() {
    this.downstreamSession = null;
  }.bind(this));
};


RtpbroadcastReplicationPair.prototype.openUpstreamSession = function() {
  if (this.upstreamSession) {
    throw new Error('Upstream session already present');
  }
  return this.upstream.getConnection().createSession()
    .then(function(session) {
      return this.upstreamSession = session;
    }.bind(this));
};

RtpbroadcastReplicationPair.prototype.closeUpstreamSession = function() {
  return this.upstreamSession.destroy().finally(function() {
    this.upstreamSession = null;
  }.bind(this));
};


RtpbroadcastReplicationPair.prototype.updateMountpoints = function(mountpointsData) {
  var realMountpoints = mountpointsData.map(function(mountpointInfo) {
    return this.createMountpointFromInfo(mountpointInfo);
  }.bind(this));

  var newMountpoints = this.difference(realMountpoints, this.mountpoints);
  newMountpoints.forEach(function(mountpoint) {
    this.mountpoints.add(mountpoint);
    mountpoint.replicate();
  }.bind(this));

  var obsoleteMountpoints = this.difference(this.mountpoints, realMountpoints);
  obsoleteMountpoints.forEach(function(mountpoint) {
    this.mountpoints.remove(mountpoint);
    mountpoint.stopReplication();
  }.bind(this));
  this.emit('mountpoint-change');
};

RtpbroadcastReplicationPair.prototype.createMountpointFromInfo = function(infoData) {
  return new Mountpoint(this, infoData['id'], infoData['streams']);
};

RtpbroadcastReplicationPair.prototype.difference = function(mountpoints1, mountpoints2) {
  return _.reject(mountpoints1, function(mountpoint1) {
    return _.find(mountpoints2,
      function(mountpoint2) {
        return mountpoint1.id === mountpoint2.id;
      });
  });
};

module.exports = RtpbroadcastReplicationPair;
