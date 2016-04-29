/*
 * Copyright (c) 2015 Mansi Shah, Santosh Rajan
*/

var ast = {
        type: "Program",
        body: []
    }

module.exports = function(src) {

    var spaceRegEx = /^[ \t\r\n\b\f]+/,
        newLineRegEx = /\r?\n/g,
        nullRegEx = /^null\b/i,
        booleanRegEx = /^(true|false)\b/i,
        numberRegEx = /^[\-+]?(\d+(\.\d*)?|\.\d+)([e][+\-]?\d+)?/i,
        stringRegEx = /^('|").*?[^\\]\1/,
        identifierRegEx = /^[a-z\~]+[a-z0-9_\[\]\.\*]*/i,
        macroIdentifierRegEx = /^[a-z\~]+[a-z0-9_\[\]\.\*]*\??/i,
        macroQuesIdentRegex = /.*\?$/,
        restParamRegEx = /^\.\.\.[a-z]+[a-z0-9_\[\]\.\*]*/i,
        rightParanthesesRegEx = /^\(/,
        leftParanthesesRegEx = /^\)/,
        rightSquareBracketRegEx = /^\[/,
        leftSquareBracketRegEx = /^\]/,
        rightCurlyBraceRegEx = /^\{/,
        leftCurlyBraceRegEx = /^\}/,
        operatorRegEx = /^(\*|\+|\-|\/|\%|\=)/,
        unaryOperatorRegEx = /^(\!)/,
        functionKeywordRegEx = /^(\()(\s)*function/,
        macroKeywordRegEx = /^(\()(\s)*macro\b/,
        varKeywordRegEx = /^(\()?(\s)*var/,
        ifKeywordRegEx = /^\((\s)*if/,
        fatArrowRegEx = /^\(\=\>/,
        commentRegEx  = /^\;.*\n?/,
        colonRegEx  = /^\:/,
        commaRegEx  = /^\,/,
        line = 1,
        macros = {}

    function consumer(regex, process) {
        return () => {
            var matches = regex.exec(src)
            if (!matches) return null
            src = src.slice(matches[0].length)
            spaceParser()
            if (process)  return process(matches[0])
            return matches[0]
        }
    }

    // fix - included destructuring assignment
    function parserFactory(...parsers) {
    	return () => {
    		for(var parser of parsers) {
                spaceParser()
                var result = parser()
                if (result) return result
    		}
    		return null;
    	}
    }

    var spaceParser = consumer(spaceRegEx, (val) => {
            var match = val.match(newLineRegEx)
            var l = (match)? match.length : 0
            line+=l
            return true
        }),
        commentParser = consumer(commentRegEx, () => {
            line++
            return true
        }),
        nullParser = consumer(nullRegEx, () => {
            return {type: "Literal", value: null}
        }),
        booleanParser = consumer(booleanRegEx, (val) => {
            if (val === 'true')
                return {type: "Literal", value: true}
            else
                return {type: "Literal", value: false}
        }),
        numberParser = consumer(numberRegEx, (val) => {
            return {type: "Literal", value: Number(val)}
        }),
        stringParser = consumer(stringRegEx, (val) => {
            return {type: "Literal", value: val.slice(1,val.length-1)}
        }),
        literalParser = parserFactory(nullParser, booleanParser, numberParser, stringParser),
        identifierParser = consumer(identifierRegEx, (val) => {
            return {type: "Identifier", name: val}
        }),
         macroIdentifierParser = consumer(macroIdentifierRegEx, (val) => {
            return {type: "Identifier", name: val}
        }),
        restParamParser = consumer(restParamRegEx, (val) => {
            var temp = src
            src = val.slice(3)  //Stripping the '...'
            var argument = statementParser()
            src = temp
            return {type: "RestElement", argument: argument}
        }),
        operatorParser = consumer(operatorRegEx, (val) => {
        	return (/\=/.test(val)) ? "==" : val   // fix - replacing '=' with '=='
        }),
        elementParser = parserFactory(literalParser, identifierParser, restParamParser),
        rightParanthesesParser = consumer(rightParanthesesRegEx, (val) => {
            return true
        }),
        leftParanthesesParser = consumer(leftParanthesesRegEx, (val) => {
            return true
        }),
        rightSquareBracketParser = consumer(rightSquareBracketRegEx, (val) => {
            return true
        }),
        leftSquareBracketParser = consumer(leftSquareBracketRegEx, (val) => {
            return true
        }),
        rightCurlyBraceParser = consumer(rightCurlyBraceRegEx, (val) => {
            return true
        }),
        leftCurlyBraceParser = consumer(leftCurlyBraceRegEx, (val) => {
            return true
        }),
        unaryOperatorParser = consumer(unaryOperatorRegEx),
        varKeywordParser = consumer(varKeywordRegEx),
        functionKeywordParser = consumer(functionKeywordRegEx),
        ifKeywordParser = consumer(ifKeywordRegEx),
        macroKeywordParser = consumer(macroKeywordRegEx),
        fatArrowParser = consumer(fatArrowRegEx),
        colonParser = consumer(colonRegEx),
        commaParser = consumer(commaRegEx)

    function argumentsParser() {
        var expr = bodyParser(argStatementParser)
        leftParanthesesParser()
        return expr
    }

    function propertiesParser() {
        var properties = []
        while(!leftCurlyBraceParser()){
            properties.push(combinator({type: "Property"}, ["key", identifierParser], ["", colonParser], ["computed", false], ["value", statementParser], ["kind", "init"], ["method", false], ["shorthand", false]))
            commaParser()
        }
        return properties
    }

    function expressionParser() {
        if (!rightParanthesesParser()) return null
        return callExpressionParser() || unaryExpressionParser() || binaryExpressionParser() || statementParser()
    }

    function expressionStatementParser() {
        spaceParser()
        if (leftParanthesesParser())  return null
        return combinator({type: "ExpressionStatement"}, ["expression", expressionParser])
    }

    function macroCallParser() {
        var macro, val, temp = src
        if (!rightParanthesesParser()) return null
        var macroId = macroIdentifierParser()        
        if (macroId) {
            if (macro = macros[macroId.name]) {
                var macroArgs = getArguments() || []
                var macroBody = macro.body
                for(var param in macro.params){
                    var regex = new RegExp('~'+param.replace(/\./g,'\\.'), 'gi')
                    if (!Array.isArray(macro.params[param]))
                        val = macroArgs.shift()
                    else
                        val = macroArgs.join(" ")
                    macroBody = macroBody.replace(regex,val)
                }
                var macroExpr, temp = src
                src = macroBody
				
				// fix to remove ExpressionStatement Wrapper 
                if(macroQuesIdentRegex.test(macroId.name))
                	macroExpr = bodyParser(argStatementParser)
                else
                	macroExpr = bodyParser()

                // fix to extract object from reduntant array
                if(Array.isArray(macroExpr))
                	macroExpr = macroExpr.shift();
                src = temp
                return macroExpr
            }
        }
        src = temp
        return null
    }

    function callExpressionParser() {
        return combinator({type: "CallExpression"}, ["callee", statementParser], ["arguments", argumentsParser])
    }
    function unaryExpressionParser() {
        return combinator({type: "UnaryExpression"}, ["operator", unaryOperatorParser], ["argument", argStatementParser], ["prefix", true], ["", leftParanthesesParser])
    }
    function binaryExpressionParser() {
        return combinator({type: "BinaryExpression"}, ["operator", operatorParser], ["left", argStatementParser], ["right", argStatementParser], ["", leftParanthesesParser])
    }
    function arrayExpressionParser() {
        if (!rightSquareBracketParser())   return null
        return combinator({type: "ArrayExpression"}, ["elements", argumentsParser], ["", leftSquareBracketParser])
    }
    function objectExpressionParser() {
        if (!rightCurlyBraceParser())   return null
        return combinator({type: "ObjectExpression"}, ["properties", propertiesParser])
    }

    function extractExpression() {
        var found = false, parantheses = 1, i = 0
        while(!found){
            if (src[i] == '(')
                parantheses++
            if (src[i] == ')')
                parantheses--
            if (parantheses == 0)
                found = true
            i++
        }
        return src.slice(0,i)
    }

    function getArguments(){
        var args = [], matches
        while(!leftParanthesesParser()){
            if (matches = /^[a-z0-9]*\b/.exec(src) || stringRegEx.exec(src)) {
                args.push(matches[0])
            } else if (rightParanthesesParser()) {
                matches = [extractExpression()]
                args.push('('+matches[0])
            }

            if (matches) src = src.slice(matches[0].length)
            else    
            	throw new SyntaxError(`Unknown character at line: ${line}`)
            spaceParser()
        }
        return args
    }

    function macroDeclarationParser() {
        if (!macroKeywordParser())    return null
        var id, macroId, param       	
        var snippet = extractExpression()
        var rest = src.slice(snippet.length)
        src = snippet
        spaceParser()

        if (id = macroIdentifierParser())
           macroId = id.name
        else
           throw new SyntaxError("Expecting a macro identifier")

        spaceParser()

        if (!rightParanthesesParser())
            throw new SyntaxError(`Expecting '(' after ${macroId}`)

        var macro = {}
        macro.params = {}
        while(!leftParanthesesParser()){
            if (param = identifierParser()) {
                param = param.name
                macro.params[param.toString()] = null
            } else if (param = restParamParser()) {
                param = '...'+param.argument.name
                macro.params[param.toString()] = []
            }
        }

        macro.body = src.slice(0,src.length-1)

        src = rest
        spaceParser()

        macros[macroId.toString()] = macro
        return true
    }

    function combinator(expr){
        for(var i=1; i<arguments.length; i++){
            var attr = arguments[i][0]
            var parser = arguments[i][1]
            var args = arguments[i][2]
            if (typeof parser == "function") {
                if (Array.isArray(args)) {
                    var result = parser(args[0],args[1])
                } else
                    var result = parser()
                if (result == null) return null
            } else {
                result = parser
            }

            if (attr) {
                expr[attr] = result
            }
        }
        return expr
    }

    function functionDeclarationParser() {
        if (!functionKeywordParser())    return null
        var snippet = extractExpression()
        var rest = src.slice(snippet.length)
        src = snippet
        var expr = combinator({type: "FunctionDeclaration"}, ["id", identifierParser], ["",rightParanthesesParser], ["params",argumentsParser], ["defaults", []], ["body", functionBlockStatementParser], ["generator", false], ["expression", false])
        src = rest
        return expr
    }

    function variableDeclarationParser() {
        if (!varKeywordParser()) return null
        var expr = {type: "VariableDeclaration", declarations: [], kind: "var"}
        while(!leftParanthesesParser()){
            var innerExpr = combinator({type: "VariableDeclarator"}, ["id", identifierParser])
            innerExpr.init = argStatementParser()
            expr.declarations.push(innerExpr)
        }
        return expr
    }

    function blockStatementParser() {
        return combinator({type: "BlockStatement"}, ["body", bodyParser])
    }

    function functionBlockStatementParser() {
        return combinator({type: "BlockStatement"}, ["body", functionBodyParser])
    }

    function arrowFunctionParser() {
        if (!fatArrowParser())   return null
        // console.info("arrowFunctionParser "+src)
        var snippet = extractExpression()
        var rest = src.slice(snippet.length)
        src = snippet
        var expr = combinator({type: "ArrowFunctionExpression"}, ["id", null], ["", rightParanthesesParser], ["params", argumentsParser], ["defaults", []], ["body", functionBlockStatementParser], ["generator", false], ["expression", false])
        src = rest
        return expr
    }

    function ifStatementParser() {
        if (!ifKeywordParser())   return null
        var snippet = extractExpression()
        var rest = src.slice(snippet.length)
        src = snippet
        var expr = combinator({type: "IfStatement"}, ["test", argStatementParser], ["", rightParanthesesParser], ["consequent", blockStatementParser], ["", rightParanthesesParser], ["alternate", blockStatementParser])
        src = rest
        return expr
    }

    function functionBodyParser() {
        var stmts = bodyParser()
        if (stmts[stmts.length-1].type === "ExpressionStatement") {
            stmts[stmts.length-1] = {type: "ReturnStatement", argument: stmts[stmts.length-1].expression}
        } else {
            stmts[stmts.length-1] = {type: "ReturnStatement", argument: stmts[stmts.length-1]}
        }

        return stmts
    }

    var statementParser = parserFactory(commentParser, arrayExpressionParser, objectExpressionParser, ifStatementParser, arrowFunctionParser, macroDeclarationParser, functionDeclarationParser, variableDeclarationParser, elementParser, macroCallParser ,expressionStatementParser),

        argStatementParser = parserFactory(commentParser, arrayExpressionParser, objectExpressionParser, ifStatementParser, arrowFunctionParser, macroDeclarationParser, functionDeclarationParser, variableDeclarationParser, elementParser, macroCallParser, expressionParser)

    function arrToObj(arr){
        return arr.reduce( (flat, current) => {
                if (Array.isArray(current)) {
                    return flat.concat(arrToObj(current))
                }
                return flat.concat(current);
        }, [])
    }

    function bodyParser(parse = statementParser) {
        var body = []
        spaceParser()
        var stmt
        while(stmt = parse()){
            if (!stmt)
                throw new SyntaxError(`Cannot parse statement at line: ${line}`)
            if (stmt != true) {
                if (Array.isArray(stmt)) {
                    arrToObj(stmt).forEach( (s) => { body.push(s)})
                } else
                    body.push(stmt)
            }
            spaceParser()
        }
        return body
    }
 
    ast.body = bodyParser()
    return ast
}