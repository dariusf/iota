
// var Reporter = require('jasmine-terminal-reporter');
// var reporter = new Reporter({
//   isVerbose: true,
//   includeStackTrace: true,
//   stackFilter: function(s) {
//     return s;
//   }
// });

var JasmineConsoleReporter = require('jasmine-console-reporter');
var reporter = new JasmineConsoleReporter({
    colors: true,
    cleanStack: 1, // filter jasmine-core frames
    verbosity: 4,
    listStyle: 'indent',
    activity: false // animation
});

jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(reporter);
