
var fs = require('fs');
var Q = require('q');
var EventEmitter = require('events').EventEmitter;
var util = require('util');


function CsvParser(discardNulls) {
  if (typeof discardNulls === 'undefined')
    discardNulls = false;

  this.discardNulls = discardNulls;
}

util.inherits(CsvParser, EventEmitter);

CsvParser.prototype.read = function (path, fn, value) {
  var deferred = Q.defer();
  var _this = this;

  fs.readFile(path, 'utf-8', function (err, data) {
    if (err) {
      _this.emit('error', err);
      return deferred.reject(err);
    }

    var lines = data.split('\n');
    var result = [];

    if (lines[lines.length - 1] === '')
      lines.pop();

    for (var i = 0; i < lines.length; i++) {
      var a = CsvParser.csvToArray(lines[i]);

      if (a === null) {
        var err = new Error('Line ' + i + ' is not valid.');
        _this.emit('error', err);
        deferred.reject(err);
        break;
      }
      else {
        _this.emit('row', a);

        if (typeof fn === 'function') {
          if (typeof value === 'undefined') {
            var r = fn(a, i);

            if (!_this.discardNulls || (r != null && typeof r !== 'undefined'))
              result.push(r);
          }
          else {
            value = fn(value, a, i);
          }
        }

        deferred.notify(i / lines.length);
      }
    }

    _this.emit('done');

    if (typeof fn === 'function') {
      if (typeof value === 'undefined')
        deferred.resolve(result);
      else
        deferred.resolve(value);
    }
    else {
      deferred.resolve(fn);
    }
  });

  return deferred.promise;
};


CsvParser.prototype.readPromises = function (path, fn) {
  return this.read(path, fn).then(Q.all);
};


CsvParser.prototype.readSequence = function (path, fn) {
  var wrapped = function (value, i) {
    return function () {
      return fn(value, i);
    };
  };

  return this.read(path, wrapped).then(function (p) { return p.reduce(Q.when, Q()); });
}


//An absolutely awesome bit of code from http://stackoverflow.com/a/8497474/632636
CsvParser.csvToArray = function (text) {
  var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
  var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;

  // Return NULL if input string is not well formed CSV string.
  if (!re_valid.test(text)) {
    return null;
  }
  var a = [];                     // Initialize array to receive values.
  text.replace(re_value, // "Walk" the string using replace with callback.
    function(m0, m1, m2, m3) {
      // Remove backslash from \' in single quoted values.
      if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
      // Remove backslash from \" in double quoted values.
      else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
      else if (m3 !== undefined) a.push(m3);
      return ''; // Return empty string.
    });
  // Handle special case of empty last value.
  if (/,\s*$/.test(text)) a.push('');
  return a;
};


module.exports = CsvParser;
