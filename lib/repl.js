// REPL for lispyscript2

var parser   = require('./parser'),
    generate = require('escodegen').generate,
    repl     = require('repl'),
    chalk	 = require('chalk');

// Default Evaluator
var ast, js, errMessage, userInfo = chalk.green;
var defaultEvaluator = function(cmd, context, filename, callback) {

	try {
		ast = parser(String(cmd))
		js  = generate(ast)
		output = eval(js)
		callback(null, output)	
	}
 	catch(err) {
 		callback(null, `Encountered an error: ${err.message}`)
 	}
}

// Returns and starts a REPLServer instance with the passed options
var replServer = repl.start({
	prompt: 		 chalk.blue('lispy2> '),
	input:  		 process.stdin,
	output: 		 process.stdout,
	ignoreUndefined: true,
	eval:   		 defaultEvaluator,
});

replServer.context.parser   = parser;
replServer.context.generate = generate;

// The command is invoked by typing .about. Displays info about lispyscript2
replServer.defineCommand('about', {
	help: 'about lispyscript2',
	action: function() {
		console.log(userInfo('\n\tA javascript With Lispy Syntax And Macros!\n'));
		this.displayPrompt();
	}
});

// The command is invoked by typing .commands. Displays all the available commands
replServer.defineCommand('commands', {
	help: 'Available Commands',
	action: function() {
		console.log(userInfo('\n\tDefault  - Parses a lispyscript expression, generates a javascript Abstract Syntax tree and finally evaluates it\n'));
		this.displayPrompt();
	}
});

// On exit -  Ctrl + d / .exit
replServer.on('exit', () => {
	console.log(userInfo('Bye!\n'));
	process.exit();
});