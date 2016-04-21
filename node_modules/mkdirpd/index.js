"use strict";
var fs = require( "fs" );
var color = require( "colors" );
var sep = require( "path" ).sep;

var msg = {
	pathError: color.red( "✗ string given or array given." ),
	dirExist: color.red( "✗ sorry directory exist." ),
	dirMissing: color.yellow( "⚠ Missing directory or not empty." ),
	folderCreated: color.green( "✓ Folder created." )
};

// Module.
var mkdirpd = function( path, mode, fn ) {

	if ( typeof mode === "function" ) {
		fn = mode;
		mode = "0777";
	} else if ( typeof mode === "string" ) {
		if ( /^0[\d]{3}$/.test( mode ) ) {
			mode = mode;
		} else {
			mode = "0777"
		}
	}

	if ( typeof path !== "string" && !Array.isArray( path ) ) {
		if ( typeof fn !== "undefined" ) {
			fn( new Error( msg.pathError) );
		} else {
			throw new Error( msg.pathError );
		}
	}

	if ( typeof fn !== "function" ) {
		fn = function( err ) { };
	}

	if ( typeof path === "string" ) {
		path = path.split( sep );
	}

	path.push( "end" );
	var currentDir = "";
	// create folders
	path.reduce( function ( current, next ) {
		currentDir += current + sep;
		+function ( currentDir ) {
			fs.exists( currentDir, function( exists ) {
				if ( !exists ) {
					fs.mkdir( currentDir, mode, function( err ) {
						if ( next == "end" ) {
							fn( err );
						}
					} );
				}
			} );
		} ( currentDir );
		return next;
	} );
};

// Delete recucive function.
mkdirpd.__proto__.delete = function( path, fn ) {

	// verify path
	if ( typeof path !== "string" ) {
		if ( typeof fn === "function" ) {
			return fn( new Error( msg.pathError ) );
		} else {
			console.error( msg.pathError );
		}
		return;
	}

	// path exists...
	fs.exists( path, function( exit ) {
		if ( !exit ) {
			if( fn !== "undefined" ) {
				fn( new Error( msg.dirMissing ) );
			}
			return;
		}
		var  folders = path.split( sep );
		for ( var i = 1, len = folders.length; i <= len; i++ ) {
			path = folders.join( sep );
			+function ( currentDir ) {
				fs.rmdir( currentDir, function( err ) {
					if ( err ) {
						if ( typeof fn === "function" ) {
							return fn( err );
						} else {
							throw err;
						}
					}
				} );
			} ( path );
			folders.pop( );
		}
	} );
};

// sync function
mkdirpd.__proto__.sync = function( path, mode ) {

	if ( typeof mode === "undefined" ) {
		mode = "0777";
	}

	if ( typeof path !== "string" && !Array.isArray( path ) ) {
		throw new Error( msg.pathError );
	}

	if ( typeof path === "string" ) {
		path = path.split( sep );
	}

	path.push( "end" );
	var currentDir = "";

	path.reduce( function( current, next ) {
		currentDir += current + sep;
		+function ( chunk ) {
			fs.exists( chunk, function ( exists ) {
				if ( !exists ) {
					fs.mkdirSync( chunk, mode );
				}
			} );
		}( currentDir );
		return next;
	} );

};

// export module.
module.exports = mkdirpd;
