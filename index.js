// Generated by CoffeeScript 1.10.0
(function() {
  var async, cluster, config, d, domain, getLogger, logger;

  async = require('async');

  config = require('./manager-config.json');

  getLogger = function(name, level) {
    var log4js, logger, path;
    log4js = require('log4js');
    path = require('path');
    log4js.configure({
      appenders: [
        {
          type: 'console'
        }, {
          type: 'file',
          filename: 'logs' + path.sep + config.logger.filename,
          category: name
        }
      ]
    });
    logger = log4js.getLogger(name);
    logger.setLevel(level);
    return logger;
  };

  logger = getLogger('service-manager', config.logger.level);

  cluster = require('cluster');

  if (cluster.isMaster) {
    cluster.fork();
    cluster.on('exit', function(worker, code, signal) {
      return setTimeout((function() {
        return cluster.fork();
      }), 1000);
    });
  } else {
    domain = require('domain');
    d = domain.create();
    d.on('error', function(err) {
      logger = getLogger('service-manager', config.logger.level);
      logger.fatal(err);
      return cluster.worker.disconnect();
    });
    d.run(function() {
      var done, setOnDeath, startServer, startServices, startTime;
      startTime = Date.now();
      setOnDeath = function(callback) {
        var on_death;
        on_death = require('death');
        on_death(function(signal, err) {
          logger.info('Exited on ' + new Date(Date.now()));
          return process.exit();
        });
        return callback();
      };
      startServer = function(callback) {
        var server;
        if (config['run server']) {
          server = require('./market-server');
          return server.start(callback);
        } else {
          return callback();
        }
      };
      startServices = function(callback) {
        logger.info('Starting services...');
        return async.series([startServer], callback);
      };
      done = function(err) {
        var getElapsedTime;
        if (err == null) {
          getElapsedTime = function() {
            return (Date.now() - startTime) / 1000;
          };
          return logger.info('Service startup done! (' + getElapsedTime() + ' sec.)');
        } else {
          logger.error(err);
          return cluster.worker.disconnect();
        }
      };
      return async.series([setOnDeath, startServices], done);
    });
  }

}).call(this);
