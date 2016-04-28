console.log('=======================  Testing lispifyscript2  ============================');
var a = 5;
if (a == 5) {
    console.log('Passed test 1');
} else {
    console.log('Failed test 1');
}
console.log('==================================');
var x = () => {
    return 5;
};
if (x() == 5) {
    console.log('Passed test 2');
} else {
    console.log('Failed test 2');
}
console.log('==================================');
function abc(x) {
    var newVar = x * 10;
    return newVar;
}
var r = abc(5);
if (r == 50) {
    console.log('Passed test 3');
} else {
    console.log('Failed test 3');
}
console.log('==================================');
function foo() {
    return () => {
        return true;
    };
}
var cond = foo();
if (cond()) {
    console.log('Passed test 4');
} else {
    console.log('Failed test 4');
}
console.log('==================================');
var arrVar = () => {
    return [
        abc(2),
        3 * 4,
        'test',
        5,
        3
    ];
};
if (arrVar()) {
    console.log('Passed test 5');
} else {
    console.log('Failed test 5');
}
console.log('==================================');
var objVar = () => {
    return {
        a: 5,
        b: 4
    };
};
if (objVar()) {
    console.log('Passed test 6');
} else {
    console.log('Failed test 6');
}
console.log('==================================');
(() => {
    return console.log('Passed test 7');
})();
console.log('==================================');
if (true) {
    (() => {
        var a = 'Passed test 8';
        return console.log(a);
    })();
} else {
}
console.log('==================================');
var z = false;
console.log('==================================');
if (z == null) {
    console.log('Failed test 10');
} else {
    console.log('Passed test 10');
}
console.log('==================================');
if (false == z) {
    console.log('Passed test 11');
} else {
    console.log('Failed test 11');
}
console.log('==================================');
if (true == z) {
    console.log('Failed test 12');
} else {
    console.log('Passed test 12');
}
console.log('==================================');
if (typeof(z) == 'boolean') {
    console.log('Passed test 13');
} else {
    console.log('Failed test 13');
}
console.log('==================================');
var x = 5;
if (x == 0) {
    console.log('Failed test 14');
} else {
    console.log('Passed test 14');
}
console.log('==================================');
if (Object.prototype.toString.call(x) == '[object Number]') {
    console.log('Passed test 15');
} else {
    console.log('Failed test 15');
}
console.log('==================================');
var y = 'hey';
if (Object.prototype.toString.call(y) == '[object String]') {
    console.log('Passed test 16');
} else {
    console.log('Failed test 16');
}
console.log('==================================');
if (Object.prototype.toString.call(y) == '[object Object]') {
    console.log('Failed test 17');
} else {
    console.log('Passed test 17');
}
console.log('=====================All Test Cases Successfully Passed=============================');