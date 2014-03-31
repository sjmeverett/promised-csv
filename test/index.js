
var assert = require('assert');
var CsvReader = require('../index.js');

describe('CsvReader', function () {
  describe('.read()', function () {
    it('should emit a row event for each row and a done event at the end', function (done) {
      var reader = new CsvReader();
      var lines = [1, 2, 3];

      reader.on('row', function (data) {
        assert.equal(lines.shift(), data[0]);
      });

      reader.on('done', function (data) {
        assert.equal(0, lines.length);
        done();
      });

      reader.read('test/ok.csv');
    });

    it('should emit an error event for a malformed csv file', function (done) {
      var reader = new CsvReader();

      reader.on('error', function (err) {
        done();
      });

      reader.read('test/err.csv');
    });

    it('should return a promise which resolves to the given value', function (done) {
      var reader = new CsvReader();
      var val = 'a value';

      reader
        .read('test/ok.csv', val)
        .then(function (str) {
          assert.equal(val, str);
          done();
        });
    });

    it('should return a promise which rejects on an error', function (done) {
      var reader = new CsvReader();

      reader
        .on('error', function () {})
        .read('test/err.csv')
        .then(function () {
          throw new Error('Should have rejected.');
        },
        function () {
          done();
        });
    });

    it('should accept a map function and resolve to the map results', function (done) {
      var reader = new CsvReader();
      var lines = [2, 3, 4];

      reader
        .read('test/ok.csv', function (data) { return data[0] + 1; })
        .then(function (arr) {
          arrayEquals(lines, arr);
          done();
        })
        .done();
    });

    it('should accept a reduce function and an initial value, and resolve to the reduced results', function (done) {
      var reader = new CsvReader();

      reader
        .read('test/dict.csv', function (dict, data) { dict[data[0]] = data[1]; return dict; }, {})
        .then(function (dict) {
          assert.equal('value1', dict.key1);
          assert.equal('value2', dict.key2);
          assert.equal('value3', dict.key3);
          done();
        })
        .done();
    });

    it('should discard nulls if discardNulls is true', function (done) {
      var reader = new CsvReader(true);

      reader
        .read('test/ok.csv', function () { return null; })
        .then(function (arr) {
          assert.equal(0, arr.length);
          done();
        })
        .done();
    });
  });

  //tests from the stackoverflow question
  describe('#csvToArray()', function (done) {
    it('should return an empty array for an empty string', function () {
      var str = '';
      var a = CsvReader.csvToArray(str);
      assert.equal(0, a.length);
    });

    it('should cope with empty values', function () {
      var str = ',';
      var a = CsvReader.csvToArray(str);
      assert.equal(2, a.length);
      assert.equal('', a[0]);
      assert.equal('', a[1]);
    });

    it('should cope with single quotes', function () {
      var str = "'one','two with escaped \\' single quote', 'three, with, commas'";
      var a = CsvReader.csvToArray(str);
      assert.equal(3, a.length);
      assert.equal('one', a[0]);
      assert.equal('two with escaped \' single quote', a[1]);
      assert.equal('three, with, commas', a[2]);
    });

    it('should cope with double quotes', function () {
      var str = '"one","two with escaped \\" double quote", "three, with, commas"';
      var a = CsvReader.csvToArray(str);
      assert.equal(3, a.length);
      assert.equal('one', a[0]);
      assert.equal('two with escaped " double quote', a[1]);
      assert.equal('three, with, commas', a[2]);
    });

    it('should cope with whitespace', function () {
      var str = "   one  ,  'two'  ,  , ' four' ,, 'six ', ' seven ' ,  ";
      var a = CsvReader.csvToArray(str);
      assert.equal(8, a.length);
      assert.equal('one', a[0]);
      assert.equal('two', a[1]);
      assert.equal('', a[2]);
      assert.equal(' four', a[3]);
      assert.equal('', a[4]);
      assert.equal('six ', a[5]);
      assert.equal(' seven ', a[6]);
      assert.equal('', a[7]);
    });

    it('should return null on a malformed string', function () {
      var str = "one, that's me!, escaped \, comma";
      var a = CsvReader.csvToArray(str);
      assert.equal(null, a);
    });
  });
});


function arrayEquals(a1, a2) {
  assert.equal(a1.length, a2.length);

  for (var i = 0; i < a1.length; i++) {
    assert.equal(a1.length, a2.length);
  }
}
