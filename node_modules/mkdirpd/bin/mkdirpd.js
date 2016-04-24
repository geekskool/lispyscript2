#!/usr/bin/env node
var path = process.argv.slice(2).map(String);
var mkdir = require("../index");

path.forEach(function(item) {
	mkdir(item, "0777");
});
