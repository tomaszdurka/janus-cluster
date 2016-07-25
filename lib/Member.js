var Context = require('./Context');
var log = require('./Logger').getLogger();
var Janus = require('janus-gateway-js');
var _ = require('underscore');

function Member(id, webSocketAddress, data) {
  this.id = id;
  this.webSocketAddress = webSocketAddress;
  this.data = data;
  this.client = new Janus.Client(this.webSocketAddress);
  this.connection = null;
}

Member.prototype.openConnection = function() {
  if (null !== this.connection) {
    return Promise.reject(new Error('Connection already opened'));
  }
  var member = this;

  return this.client.createConnection()
    .then(function(connection) {
      var logContext = new Context(member.toJSON());
      log.info('New member is registered', logContext);
      member.connection = connection;
      connection.on('close', function() {
        log.info('Member\' connection closed', logContext);
        member.connection = null;
      });
      return connection;
    });
};

Member.prototype.getConnection = function() {
  if (null === this.connection) {
    throw new Error('Connection does not exist');
  }
  return this.connection;
};

/**
 * @param {Member|*} member
 * @returns {Boolean}
 */
Member.prototype.equals = function(member) {
  if (!(member instanceof Member)) {
    return false;
  }
  return _.isEqual(this.toJSON(), member.toJSON());
};

Member.prototype.toJSON = function() {
  return {
    id: this.id,
    webSocketAddress: this.webSocketAddress,
    data: this.data
  };
};

module.exports = Member;
