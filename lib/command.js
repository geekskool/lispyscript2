var parser   = require('./parser'),
    generate = require('escodegen').generate,
    fs 		 = require('fs');

var fjson = require('format-json')

// mkdirpd - Simple create and delete folders
var mkdir = require("mkdirpd");

var testFile = process.argv[2]

var program = fs.readFileSync(testFile),
    macros = fs.readFileSync("../src/macros.ls2"),
    ast = parser(macros.toString()+program.toString()),
    js = generate(ast)

filename = testFile.slice(0,/\.ls2$/.exec(testFile).index);

// Creating new folder and populating it with the generated files
mkdir(`${process.cwd()}/${filename}`, (err) => {

	if(err) {
		throw err;
	}

	console.log(`New folder called '${filename}' created`)
	process.chdir(`${process.cwd()}/${filename}/`)

	fs.writeFileSync(filename+'.ls2', program)
	fs.writeFileSync(filename+'.tree', fjson.plain(ast))
	fs.writeFileSync(filename+'.js', js)
});

// eval(js)
