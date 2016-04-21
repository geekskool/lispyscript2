/*
 * Copyright (c) 2015 Mansi Shah, Santosh Rajan
*/

var ast = {
        type: "Program",
        body: []
    }

module.exports = function (src) {

    var spaceRegEx = /^[ \t\r\n\b\f]+/,
        newLineRegEx = /\r?\n/g,
        nullRegEx = /^null\b/i,
        booleanRegEx = /^(true|false)\b/i,
        numberRegEx = /^[\-+]?(\d+(\.\d*)?|\.\d+)([e][+\-]?\d+)?/i,
        stringRegEx = /^('|").*?[^\\]\1/,
        identifierRegEx = /^[a-z\~]+[a-z0-9_\[\]\.\*]*/i,
        macroIdentifierRegEx = /^[a-z\~]+[a-z0-9_\[\]\.\*]*\??/i,
        restParamRegEx = /^\.\.\.[a-z]+[a-z0-9_\[\]\.\*]*/i,
        rightParanthesesRegEx = /^\(/,
        leftParanthesesRegEx = /^\)/,
        rightSquareBracketRegEx = /^\[/,
        leftSquareBracketRegEx = /^\]/,
        rightCurlyBraceRegEx = /^\{/,
        leftCurlyBraceRegEx = /^\}/,
        operatorRegEx = /^(\*|\+|\-|\/|\%|\=\=)/,
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
        return function () {
            var matches = regex.exec(src)
            if (!matches) return null
            // console.info("Matched "+regex)
            src = src.slice(matches[0].length)
            spaceParser()
            if (process)    return process(matches[0])
            return matches[0]
        }
    }

    function parserFactory() {
        var parsers = arguments
        return function () {
            for(index in parsers){
                var parser = parsers[index]
                spaceParser()
                var result = parser()
                if (result) {
                    // console.info("Consumed as "+result.type)
                    return result
                }
            }
            return null
        }
    }

    var spaceParser = consumer(spaceRegEx, function (val) {
            var match = val.match(newLineRegEx)
            var l = (match)? match.length : 0
            line+=l
            return true
        }),
        commentParser = consumer(commentRegEx, function () {
            line++
            return true
        }),
        nullParser = consumer(nullRegEx, function () {
            return {type: "Literal", value: null}
        }),
        booleanParser = consumer(booleanRegEx, function (val) {
            if (val === 'true')
                return {type: "Literal", value: true}
            else
                return {type: "Literal", value: false}
        }),
        numberParser = consumer(numberRegEx, function (val) {
            return {type: "Literal", value: Number(val)}
        }),
        stringParser = consumer(stringRegEx, function (val) {
            return {type: "Literal", value: val.slice(1,val.length-1)}
        }),
        literalParser = parserFactory(nullParser, booleanParser, numberParser, stringParser),
        identifierParser = consumer(identifierRegEx, function (val) {
            return {type: "Identifier", name: val}
        }),
         macroIdentifierParser = consumer(macroIdentifierRegEx, function (val) {
            return {type: "Identifier", name: val}
        }),
        restParamParser = consumer(restParamRegEx, function (val) {
            var temp = src
            src = val.slice(3)  //Stripping the '...'
            argument = statementParser()
            src = temp
            return {type: "RestElement", argument: argument}
        }),
        elementParser = parserFactory(literalParser, identifierParser, restParamParser),
        rightParanthesesParser = consumer(rightParanthesesRegEx, function (val) {
            return true
        }),
        leftParanthesesParser = consumer(leftParanthesesRegEx, function (val) {
            return true
        }),
        rightSquareBracketParser = consumer(rightSquareBracketRegEx, function (val) {
            return true
        }),
        leftSquareBracketParser = consumer(leftSquareBracketRegEx, function (val) {
            return true
        }),
        rightCurlyBraceParser = consumer(rightCurlyBraceRegEx, function (val) {
            return true
        }),
        leftCurlyBraceParser = consumer(leftCurlyBraceRegEx, function (val) {
            return true
        }),
        operatorParser = consumer(operatorRegEx),
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
        // console.info("ExpressionParser "+src)
        return callExpressionParser() || unaryExpressionParser() || binaryExpressionParser() || statementParser()
    }

    function expressionStatementParser() {
        spaceParser()
        if (leftParanthesesParser())  return null
        // console.info("ExpressionStatementParser "+src)
        return combinator({type: "ExpressionStatement"}, ["expression", expressionParser])
    }

    function macroCallParser() {
        var temp = src
        if (!rightParanthesesParser()) return null
        var macroId = macroIdentifierParser()        
        if (macroId) {
         //console.info("MacroCallParser "+src)
            if (macro = macros[macroId.name]) {
                var macroArgs = getArguments() || []
                var macroBody = macro.body
                for(param in macro.params){
                    var regex = new RegExp('~'+param.replace(/\./g,'\\.'), 'gi')
                    if (!Array.isArray(macro.params[param]))
                        val = macroArgs.shift()
                    else
                        val = macroArgs.join(" ")
                    macroBody = macroBody.replace(regex,val)
                }
                var temp = src
                src = macroBody
                var macroExpr = bodyParser()
                src = temp
                return macroExpr
            }
        }
        src = temp
        return null
    }

    function callExpressionParser() {
        // console.info("callExpressionParser "+src)
        return combinator({type: "CallExpression"}, ["callee", statementParser], ["arguments", argumentsParser])
    }
    function unaryExpressionParser() {
        // console.info("unaryExpressionParser "+src)
        return combinator({type: "UnaryExpression"}, ["operator", unaryOperatorParser], ["argument", argStatementParser], ["prefix", true], ["", leftParanthesesParser])
    }
    function binaryExpressionParser() {
        // console.info("binaryExpressionParser "+src)
        return combinator({type: "BinaryExpression"}, ["operator", operatorParser], ["left", argStatementParser], ["right", argStatementParser], ["", leftParanthesesParser])
    }
    function arrayExpressionParser() {
        // console.info("arrayExpressionParser "+src)
        if (!rightSquareBracketParser())   return null
        return combinator({type: "ArrayExpression"}, ["elements", argumentsParser], ["", leftSquareBracketParser])
    }
    function objectExpressionParser() {
        // console.info("objectExpressionParser "+src)
        if (!rightCurlyBraceParser())   return null
        return combinator({type: "ObjectExpression"}, ["properties", propertiesParser])
    }

    function extractExpression() {
        var found = false, parantheses = 1, i = 0
        // console.info("Inside extractExpression ")
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
        var args = []
        // console.info("Inside getArguments ")
        while(!leftParanthesesParser()){
            if (matches = /^[a-z0-9]*\b/.exec(src) || stringRegEx.exec(src)) {
                args.push(matches[0])
            } else if (rightParanthesesParser()) {
                matches = [extractExpression()]
                args.push('('+matches[0])
            }

            if (matches) src = src.slice(matches[0].length)
            else    throw new SyntaxError("Unknown character at line: "+line)
            spaceParser()
        }
        return args
    }

    function macroDeclarationParser() {
        if (!macroKeywordParser())    return null
        // console.info("macroDeclarationParser "+src)
        var snippet = extractExpression()
        var rest = src.slice(snippet.length)
        src = snippet
        spaceParser()

        if (id = macroIdentifierParser())
           macroId = id.name
        else
           throw new SyntaxError("Expecting a macro identifier")

        spaceParser()

        //params
        if (!rightParanthesesParser())
            throw new SyntaxError("Expecting '(' after " + macroId)

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

        //body
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
        // console.info("functionDeclarationParser "+src)
        var snippet = extractExpression()
        var rest = src.slice(snippet.length)
        src = snippet
        var expr = combinator({type: "FunctionDeclaration"}, ["id", identifierParser], ["",rightParanthesesParser], ["params",argumentsParser], ["defaults", []], ["body", functionBlockStatementParser], ["generator", false], ["expression", false])
        src = rest
        return expr
    }

    function variableDeclarationParser() {
        if (!varKeywordParser()) return null
        // console.info("variableDeclarationParser "+src)
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
        // console.info("ifStatementParser "+src)
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

    var statementParser = parserFactory(commentParser, arrayExpressionParser, objectExpressionParser, ifStatementParser, arrowFunctionParser, macroDeclarationParser, functionDeclarationParser, variableDeclarationParser, elementParser, macroCallParser, expressionStatementParser),

        argStatementParser = parserFactory(commentParser, arrayExpressionParser, objectExpressionParser, ifStatementParser, arrowFunctionParser, macroDeclarationParser, functionDeclarationParser, variableDeclarationParser, elementParser, macroCallParser, expressionParser)

    function arrToObj(arr){
        return arr.reduce(function (flat, current) {
                if (Array.isArray(current)) {
                    return flat.concat(arrToObj(current))
                }
                return flat.concat(current);
        }, [])
    }

    function bodyParser(parse) {
        if (!arguments[0])   parse = statementParser
        var body = []
        spaceParser()
        while(stmt = parse()){
            // console.info("Output: ",stmt)
            if (!stmt)
                throw new SyntaxError("Cannot parse statement at line: " + line)
            if (stmt !== true) {
                if (Array.isArray(stmt)) {
                    arrToObj(stmt).forEach(function (s) {
                        body.push(s)
                    })
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