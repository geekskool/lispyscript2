var parser = require('./parser'),
    generate = require('escodegen').generate
    fs = require('fs')

var fjson = require('format-json')

var filename = process.argv[2]

var program = fs.readFileSync(filename),
    macros = fs.readFileSync("../src/macros.ls2"),
    ast = parser(macros.toString()+program.toString()),
    js = generate(ast)

filename = filename.slice(0,/\.ls2$/.exec(filename).index)

fs.writeFileSync(filename+'.tree', fjson.plain(ast))
fs.writeFileSync(filename+'.js', js)

eval(js)
