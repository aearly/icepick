# icepick [![Build Status via Travis CI](https://travis-ci.org/aearly/icepick.svg?branch=master)](https://travis-ci.org/aearly/icepick) [![NPM version](http://img.shields.io/npm/v/icepick.svg)](https://www.npmjs.org/package/icepick) [![Coverage Status](https://coveralls.io/repos/aearly/icepick/badge.svg?branch=)](https://coveralls.io/r/aearly/icepick?branch=)

Utilities for treating frozen JavaScript objects as persistent immutable collections.

## Motivation

`Object.freeze()` is a quick and easy way to get immutable collections in plain JavaScript.  If you recursively freeze an object hierarchy, you have a nice structure you can pass around without fear of mutation.  The problem is that if you want to modify properties inside this hierarchical collection, you have to return a new copy with the properties changed.

A quick and dirty way to do this is to just `_.cloneDeep()` or `JSON.parse(JSON.stringify())` your object, set the new properties, and re-freeze, but this operation is expensive, especially if you are only changing a single property in a large structure.  It also means that all the branches that did not have an update will be new objects.

Instead, what `icepick` does is provide functions that allow you to "modify" a frozen structure by returning a partial clone using structural sharing.  Only collections in the structure that had a child change will be changed.  This is very similar to how Clojure's [persistent data structures](https://en.wikipedia.org/wiki/Persistent_data_structure) work, albeit more primitive.

`icepick` uses structural sharing at the object or array level. Unlike Clojure, `icepick` does not use [tries](https://en.wikipedia.org/wiki/Trie) to store objects or arrays, so updates will be less efficient.  This is to maintain JavaScript interoperability at all times. Also, for smaller collections, the overhead of creating and managing a trie structure is slower than simply cloning the entire collection.  However, using very large collections (e.g.collections with more than 1000 elements) with `icepick` could lead to performance problems.

Structural sharing is useful wherever you can avoid expensive computation if you can quickly detect if the source data has changed.  For example, `shouldComponentUpdate` in a React component.  If you are using a frozen hierarchical object to build a system of React components, you can be confident that a component doesn't need to update if its current `props` strictly equal the `nextProps`.

## API

* `freeze`
* `thaw`
* `assoc`
* `set`
* `dissoc`
* `unset`
* `assocIn`
* `setIn`
* `getIn`
* `updateIn`
* `push`
* `unshift`
* `pop`
* `shift`
* `reverse`
* `sort`
* `splice`
* `slice`
* `map`
* `filter`
* `assign`
* `extend`
* `merge`
* `chain`


### Usage

`icepick` is provided as a CommonJS module with no dependencies.  It is designed for use in Node, or with module loaders like Browserify or Webpack.  To use as a global or with require.js, you will have to shim it, or wrap it with `browserify icepick.js --standalone icepick`.

```bash
$ npm install icepick --save
```

```javascript
"use strict"; // so attempted modifications of frozen objects will throw errors

var i = require("icepick");
```

The API is heavily influenced from Clojure/mori.  In the contexts of these docs "collection" means a plain, frozen `Object` or `Array`.  Only JSON-style collections are supported.  Functions, Dates, RegExps, DOM elements, and others are left as-is, and could mutate if they exist in your hierarchy.

If you set `process.env.NODE_ENV` to `"production"` in your build, using `envify` or its equivalent, freezing objects will be skipped.  This can improve performance for your production build.

### freeze(collection)

Recursively freeze a collection and all its child collections with `Object.freeze()`. Values that are not plain Arrays or Objects will be ignored, including objects created with custom constructors (e.g. `new MyClass()`).  Does not allow reference cycles.

```javascript
var coll = {
  a: "foo",
  b: [1, 2, 3],
  c: {
    d: "bar"
  }
};

i.freeze(coll);

coll.c.d = "baz"; // throws Error

var circular = {bar: {}};
circular.bar.foo = circular;

i.freeze(circular); // throws Error
```

### thaw(collection)

Recursively un-freeze a collection by creating a partial clone. Object that are not frozen or that have custom prototypes are left as-is.  This is useful when interfacing with other libraries.

```javascript
var coll = i.freeze({a: "foo", b: [1, 2, 3], c: {d: "bar"}, e: new Foo() });
var thawed = i.thaw(coll);

assert(!Object.isFrozen(thawed));
assert(!Object.isFrozen(thawed.c));
assert(thawed.c !== coll.c);
assert(thawed.e === coll.e);
```


### assoc(collection, key, value)

*alias: `set`*

Set a value in a collection.  If `value` is a collection, it will be recursively frozen (if not already).  In the case that the collection is an Array, the key is the array index.

```javascript
var coll = {a: 1, b: 2};

var newColl = i.assoc(coll, "b", 3); // {a: 1, b: 3}


var arr = ["a", "b", "c"];

var newArr = i.assoc(arr, 2, "d"); // ["a", "b", "d"]
```


### dissoc(collection, key)

*alias: `unset`*

The opposite of `assoc`.  Remove the value with the `key` from the collection.  If used on an array, it will create a sparse array.

```javascript
var coll = {a: 1, b: 2, c: 3};

var newColl = i.dissoc(coll, "b"); // {a: 1, c: 3}

var arr = ["a", "b", "c"];

var newArr = i.dissoc(arr, 2); // ["a", , "c"]
```


### assocIn(collection, path, value)

*alias: `setIn`*

Set a value inside a hierarchical collection.  `path` is an array of keys inside the object.  Returns a partial copy of the original collection. Intermediate objects will be created if they don't exist.

```javascript
var coll = {
  a: "foo",
  b: [1, 2, 3],
  c: {
    d: "bar"
  }
};

var newColl = i.assocIn(coll, ["c", "d"], "baz");

assert(newColl.c.d === "baz");
assert(newColl.b === coll.b);

var coll = {};
var newColl = i.assocIn(coll, ["a", "b", "c"], 1);
assert(newColl.a.b.c === 1);
```

### getIn(collection, path)

Get a value inside a hierarchical collection using a path of keys.  Returns `undefined` if the value does not exist.  A convenience method -- in most cases plain JS syntax will be simpler.

```javascript
var coll = i.freeze([
  {a: 1},
  {b: 2}
]);

var result = i.getIn(coll, [1, "b"]); // 2
```

### updateIn(collection, path, callback)

Update a value inside a hierarchical collection.  The `path` is the same as in `assocIn`.  The previous value will be passed to the `callback` function, and `callback` should return the new value.  If the value does not exist, `undefined` will be passed.  If not all of the intermediate collections exist, an error will be thrown.

```javascript
var coll = i.freeze([
  {a: 1},
  {b: 2}
]);

var newColl = i.updateIn(coll, [1, "b"], function (val) {
  return val * 2;
}); // [ {a: 1}, {b: 4} ]
```

### assign(coll1, coll2, ...)

*alias: extend*

Similar to `Object.assign`, this function shallowly merges several objects together, always returning a new, immutable object.  Properties of the objects that are Objects or Arrays are deeply frozen.

```javascript
var obj1 = {a: 1, b: 2, c: 3};
var obj2 = {c: 4, d: 5};

var result = i.assign(obj1, obj2); // {a: 1, b: 2, c: 4, d: 5}
assert(obj1 !== result); // true
```

### merge(target, source, [associator])

Deeply merge a `source` object into `target`, similar to Lodash.merge.  Child collections that are both frozen and reference equal will be assumed to be deeply equal.  Arrays from the `source` object will completely replace those in the `target` object if the two differ.  If nothing changed, the original reference will not change.  Returns a frozen object, and works with both unfrozen and frozen objects.

```javascript
var defaults = {a: 1, c: {d: 1, e: [1, 2, 3], f: {g: 1}}};
var obj = {c: {d: 2, e: [2], f: null}};

var result1 = i.merge(defaults, obj); // {a: 1, c: {d: 2, e: [2]}, f: null}

var obj2 = {c: {d: 2}};
var result2 = i.merge(result1, obj2);

assert(result1 === result2); // true

```

An optional `resolver` function can be given as the third argument to change the way values are merged. For example, if you'd prefer that Array values from source be concatenated to target (instead of the source Array just replacing the target Array):

```javascript
var o1 = i.freeze({a: 1, b: {c: [1, 1]}, d: 1});
var o2 = i.freeze({a: 2, b: {c: [2]}});

function resolver(targetVal, sourceVal, key) {
  if (Array.isArray(targetVal) && sourceVal) {
    return targetVal.concat(sourceVal);
  } else {
    return sourceVal;
  }
}

var result3 = i.merge(o1, o2, resolver);
assert(result === {a: 2, b: {c: [1, 1, 2]}, d: 1});
```

The `resolver` function receives three arguments: the value from the target object, the value from the source object, and the key of the value being merged.

### Array.prototype methods

* push
* pop
* shift
* unshift
* reverse
* sort
* splice

Each of these mutative Array prototype methods have been converted:

```javascript
var a = [1];
a = i.push(a, 2); // [1, 2];
a = i.unshift(a, 0); // [0, 1, 2];
a = i.pop(a); // [0, 1];
a = i.shift(a); // [1];
```

* slice(arr, start, [end])

`slice` is also provided as a convenience, even though it does not mutate the original array.  It freezes its result, however.

* map(fn, array)
* filter(fn, array)

These non-mutative functions that return new arrays are also wrapped for convenience.  Their results are frozen.  Note that the mapping or filtering function is passed first, for easier partial application.

```javascript
i.map(function (v) {return v * 2}, [1, 2, 3]); // [2, 4, 6]

var removeEvens = _.partial(i.filter, function (v) { return v % 2; });

removeEvens([1, 2, 3]); // [1, 3]
```

Array methods like `find` or `indexOf` are not added to `icepick`, because you can just use them directly on the array:

```js
var arr = i.freeze([{a: 1}, {b: 2}]);

arr.find(function (item) { return item.b != null; }); // {b: 2}
```

### chain(coll)

Wrap a collection in a wrapper that allows calling icepick function as chainable methods, similar to [`lodash.chain`](https://lodash.com/docs#chain).  This is convenient when you need to perform multiple operations on a collection at one time.  The result of calling each method is passed to the next method in the chain as the first argument.  To retrieve the result, call `wrapped.value()`. Unlike `lodash.chain`, you must always call `.value()` to get the result, the methods are not lazily evaluated, and intermediate collections are always created (but this may change in the future).

```javascript
var o = {
  a: [1, 2, 3],
  b: {c: 1},
  d: 4
};

var result = i.chain(o)
  .assocIn(["a", 2], 4)
  .merge({b: {c: 2, c2: 3}})
  .assoc("e", 2)
  .dissoc("d")
  .value();

expect(result).to.eql({
  a: [1, 2, 4],
  b: {c: 2, c2: 3},
  e: 2
});
```

The wrapper also contains an additional `thru` method for performing arbitrary updates on the current wrapped value.

```js
var result = i.chain([1, 2])
  .push(3)
  .thru(function (val) {
    return [0].concat(val)
  })
  .value(); // [0, 1, 2, 3]
```

## FAQ

### Why not just use Immutable.js or mori?

Those two libraries introduce their own types.  If you need to share a frozen data structure with other libraries or other 3rd-party code, you force those downstream from you to use Immutable.js or mori (and in the case of mori, the exact version you use).  Also, since you can build your data structures using plain JS, creating the initial representation is faster.  The overhead of`Object.freeze()` is negligible.

### How does this differ from `React.addons.update` or `seamless-immutable`.

All three of these libraries are very similar in their goals -- provide incremental updates of plain JS objects.  They mainly differ in their APIs.

[`React.addons.update`](https://facebook.github.io/react/docs/update.html) provides a single function to which you pass an object of commands.  While this can be convenient to do many updates in a single batch, the syntax of the command object is very cumbersome, especially when dealing with computed property names.  It also does not freeze the objects it operates on, leaving them open to modifications elsewhere in your code.

[`seamless-immutable`](https://github.com/rtfeldman/seamless-immutable) is the most similar to `icepick`.  Its main difference is that it adds methods to the prototypes of objects, and overrides array built-ins like `map` and `filter` to return frozen objects.  It also adds a couple utility functions, like `asMutable` and `merge`. `icepick` does not modify the the methods or properties of collections in order to function, it merely provides a set of functions to operate on them, similar to Lodash, Underscore, or Ramda.  This means that when passing frozen objects to third-party libraries, they will be able to `map` over them and obtain mutable arrays.  `seamless-immutable` handles `Date`s, which `icepick` leaves as-is currently (as well as any other objects with custom constructors).  `icepick` will detect circular references within an object and throw an Error, `seamless-immutable` will run into infinite recursion in such a case.

I also would like to benchmark all of these libraries to see in what cases each is faster.

### Isn't this horribly slow?

It is faster than deeply cloning an object.  Since it does not touch portions of a data structure that did not change, it can help you optimize expensive calculations elsewhere (such as rendering a component in the DOM).  It is also faster than mori<sup>\[benchmarks needed\]</sup>.

### Won't this leak memory?

Garbage collection in modern JS engines can clean up the intermediate Objects and Arrays that are no longer needed.  I need to profile memory across a wider range of browsers, but V8 can definitely handle it.  Working with a collection that is about 200kb as JSON, the GC phase is only 8ms after a few hundred updates.  Memory usage does fluctuate a few MBs though, but it always resets to the baseline.

### Why use "`i`" as the variable name in your examples?  Doesn't everyone use that for loops?

I thought that too, but then I realized I hadn't written a for loop in JS in years. (Thanks ES5/underscore/lodash!)  Assign it to something else if it bothers you.

## License

MIT
