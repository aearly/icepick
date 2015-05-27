# icepick [![Build Status via Travis CI](https://travis-ci.org/aearly/icepick.svg?branch=master)](https://travis-ci.org/aearly/icepick) [![NPM version](http://img.shields.io/npm/v/icepick.svg)](https://www.npmjs.org/package/icepick)
[![Coverage Status](https://coveralls.io/repos/caolan/async/badge.svg?branch=)](https://coveralls.io/r/caolan/async?branch=)

Utilities for working with frozen objects

## Motivation

`Object.freeze()` is a quick and easy way to get immutable collections in plain Javascript.  If you recursively freeze an object hierarchy, you have a nice structure you can pass around without fear of mutation.  The problem is that if you want to modify properties inside this hierarchical collection, you have to return a new copy with the properties changed.

A quick and dirty way to do this is to just `_.cloneDeep()` or `JSON.parse(JSON.stringify())` your object, set the new properties, and re-freeze, but this operation is expensive, especially if you are only changing a single property in a large structure.  It also means that all the branches that did not have an update will be new objects.

Instead, what `icepick` does is provide functions that allow you to "modify" a frozen structure by returning a partial clone.  Only collections in the structure that had a child change will be changed.  This is very similar to how Clojure's persistent data structures work, albeit more primitive.

This is useful wherever you can avoid expensive computation if you can quickly detect if the source data has changed.  For example, `shouldComponentUpdate` in a React component.  If you are using a frozen hierarchical object to build a system of React components, you can be confident that a component doesn't need to update if its current `props` strictly equal the `nextProps`.

## API

### Usage

```bash
$ npm install icepick --save
```

```javascript
"use strict"; // so attempted modifications of frozen objects will throw errors

var i = require("icepick");
```

The API is heavily influenced from Clojure/mori.  In the contexts of these docs "collection" means a plain, frozen `Object` or `Array`.  Only JSON-style collections are supported.  Functions, Dates, RegExps, DOM elements, and others are left as is, and could mutate if they exist in your hierarchy.

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
```


### assoc(collection, key, value)

Set a value in a collection.  If `value` is a collection, it will be recursively frozen (if not already).  In the case that the collection is an Array, the key is the array index.

```javascript
var coll = {a: 1, b: 2};

var newColl = i.assoc(coll, "b", 3); // {a: 1, b: 3}


var arr = ["a", "b", "c"];

var newArr = i.assoc(arr, 2, "d"); // ["a", "b", "d"]
```


### dissoc(collection, key)

The opposite of `assoc`.  Remove the value with the `key` from the collection.  If used on an array, it will create a sparse array.

```javascript
var coll = {a: 1, b: 2, c: 3};

var newColl = i.dissoc(coll, "b"); // {a: 1, c: 3}

var arr = ["a", "b", "c"];

var newArr = i.dissoc(arr, 2); // ["a", , "c"]
```


### assocIn(collection, path, value)

Set a value inside a hierarchical collection.  `path` is an array of keys inside the object.  Returns a partial copy of the original collection. If not all of the collections exist, an error will be thrown.

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
```

### getIn(collection, path)

Get a value inside a hierarchical collection using a path of keys.  A convenience method -- in most cases plain JS syntax will be simpler.

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

removeEvents([1, 2, 3]); // [1, 3]
```

## FAQ

### Why not just use Immutable.js or mori?

Those two libraries introduce their own types.  If you need to share a frozen data structure with other libraries or other 3rd-party code, you force those downstream from you to use Immutable.js or mori (and in the case of mori, the exact version you use).  Also, since you can build your data structures using plain JS, creating the initial representation is faster.  The overhead of`Object.freeze()` is negligible.

### Isn't this horribly slow?

It is faster than deeply cloning an object.  Since it does not touch portions of a data structure that did not change, it can help you optimize expensive calculations elsewhere (such as rendering a component in the DOM).  It is also faster than mori<sup>\[benchmarks needed\]</sup>.

### Won't this leak memory?

Garbage collection in modern JS engines can clean up the intermediate Objects and Arrays that are no longer needed.  I need to profile memory across a wider range of browsers, but V8 can definitely handle it.  Working with a collection that is about 200kb as JSON, the GC phase is only 8ms after a few hundred updates.  Memory usage does fluctuate a few MBs though, but it always resets to the baseline.

### Why use "`i`" as the variable name in your examples?  Doesn't everyone use that for loops?

I thought that too, but then I realized I hadn't written a for loop in JS in years. (Thanks ES5/underscore/lodash!)  Assign it to something else if it bothers you.

## License

MIT
