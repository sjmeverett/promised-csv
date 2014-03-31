promised-csv
============

There's a few CSV parser node modules out there, but after spending a while trying to get one to work I decided that it really doesn't need to be as complicated as everyone makes it and wrote my own.  There are also (at the time of writing) no implementations using promises as far as I can see, and promises are [*rad cool*](https://blog.jcoglan.com/2013/03/30/callbacks-are-imperative-promises-are-functional-nodes-biggest-missed-opportunity/).  I've used kriskowal's [Q](https://github.com/kriskowal/q), but it's [Promises/A+](http://promises-aplus.github.io/promises-spec/) compatible so use whatever you like.

Or don't, actually, if you prefer.  It supports an event interface too.

Installing
-----------

I've packaged it up and put it on npm, so it's dead easy to install:

    npm install --save promised-csv

It doesn't currently support non-node usage out the box, but I intend to add that in soon so it can be used client-side etc.

Once it has installed, you just need to instantiate a `CsvReader` object.

    var CsvReader = require('promised-csv');
    var reader = new CsvReader();


Using the EventEmitter interface
---------------------------------

The parser emits three events: `row`, `done` and `error`.  `row` is emitted for every line in the file (except the last blank one if there is one), and the argument will be an array containing the parsed values.

    reader.on('row', function (data) {
      //data is an array containing the field values
    });

`done` is emitted when the file has all been read; that is, after the last `row` event has been emitted.

    reader.on('done', function () {
      console.log('yay, done!');
    });

`error` is emitted when a line is malformed or if there was an error accessing the file.

    reader.on('error', function (err) {
      console.log('uh oh: ' + err);
    });

Once you've set up your event handlers, you can then call the `read` method to process a file.

    reader.read('myfile.csv');

It's really quite simple.  One thing to take care with though: I note that often people like to register event handlers after calling the function that will cause the events to be emitted (i.e. `reader.read('thefile').on('row', fn)`).  I've always thought this looks a bit weird anyway because it only doesn't lead to a race condition because JavaScript is single-threaded.  But you can't do it fluently like this anyways, because `read()` returns a promise, not `this`.

Using the Promise interface
----------------------------

The `read()` method returns a promise, and there are a few ways that you could use this.

### Using events with promises
`read(file, [resolve value])`

First of all, you might want to process your data in the `row` event.  If you pass an extra value to the `read()` method, it will be passed to the `then` function.  Otherwise, it won't get passed anything.

    reader.on('row', function (data) {
      //do some stuff
    });

    reader
      .read('myfile.csv', 'a value')
      .then(function (value) {
        //value == 'a value'
      });

You could use this functionality to accumulate some data and return it to the caller.

    var list = [];

    reader.on('row', function (data) {
      list.push(parseInt(data[0]));
    });

    //this promise will get resolved to a list of integers from the file
    return reader.read('myfile.csv', list);

Note that node will automatically die on uncaught `error` events, so if you want to use promise rejection instead of the `error` event, you'll need to register a dummy handler.

    reader.on('error', function () {});

If you don't do this, the promise won't be rejected - instead the program will just crash with a stack trace.  Sorry...!

### Map
`read(file, fn)`

Another (more elegant?) way to do this would be to use the `map`-style interface.  Here, instead of using the `row` event, you pass a function to `read` which will get called for each row, and results will be accumulated in a list which the promise will be resolved with.

    //this promise will also get resolved to a list of integers
    return reader.read('myfile.csv', function (data) {
      return parseInt(data[0]);
    });

Note that you can tell the parser not to accumulate nulls when you instantiate it, which is handy for missing out some rows.

    //true means discard nulls returned from the map function
    var reader = new CsvReader(true);

    return reader.read('myfile.csv', function (data) {
      if (data[1] === 'skip')
        return null;
      else
        return parseInt(data[0]);
    });

### Mapping promises
`readPromises(file, fn)`

If your map function returns a promise, you can use the `readPromises()` method.  This will convert the array of promises produced by the map operation into a promise for the fulfilled array.

    reader
      .read('myfile.csv', function (data) {
        return getAPromise(data);
      })
      .then(function (values) {
        //values will be an array containing the resolved values
      });

### Mapping promises in sequence
`readSequence(file, fn)`

Perhaps you need the promises returned by your map function to execute in order, or just need to stop them all being executed at the same time; for example, if your map function opened a file, then you might run out of file handles unless you use this function, because all the files will be opened at the same time.

Unlike above, `readSequence()` does not execute your map function straight away.  You'll still get a promise for the fulfilled array as above, but the map function is executed in sequence for each line in the CSV file when the promise for the previous line has been fulfilled.

### Reduce
`read(file, fn, initial)`

You can also run a reduce over the CSV data, and the promise will be resolved with the value of the reduce operation.  The function will be assumed to be a reduce function if there is a third argument, which specifies the initial value for reducing.  An example of when you might want to reduce over CSV data is to build up an object.

    reader
      .read('settings.csv', function (settings, data) {
        settings[data[0]] = data[1];
      }, {})
      .then (function (settings) {
        //settings will be an object with properties and values
        //specified in the CSV file
      });



---

That's pretty much it.  Feel free to report any issues or offer any pull requests you think might be useful.

Acknowledgements
-----------------

I lifted the CSV parsing regex straight out of [this excellent StackOverflow answer](http://stackoverflow.com/a/8497474/632636) by ridgerunner.  That certainly made the library a whole lot quicker to write!
