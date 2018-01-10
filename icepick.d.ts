declare module "icepick" {
  type IFrozen<T> = Readonly<T>;
  /**
   *
   * freeze(collection)
   *
   * Recursively freeze a collection and all its child collections with Object.freeze(). Values that are not plain Arrays or Objects will be ignored, including objects created with custom constructors (e.g. new MyClass()). Does not allow reference cycles.
   *
   * var coll = {
   *   a: "foo",
   *   b: [1, 2, 3],
   *   c: {
   *     d: "bar"
   *   }
   * };
   * icepick.freeze(coll);
   * coll.c.d = "baz"; // throws Error
   * var circular = {bar: {}};
   * circular.bar.foo = circular;
   * icepick.freeze(circular); // throws Error
   *
   */
  export function freeze<T>(coll: T): IFrozen<T>;

  /**
   * thaw(collection)
   *
   * Recursively un-freeze a collection by creating a partial clone. Object that are not frozen or that have custom prototypes are left as-is. This is useful when interfacing with other libraries.
   *
   * var coll = icepick.freeze({a: "foo", b: [1, 2, 3], c: {d: "bar"}, e: new Foo() });
   * var thawed = icepick.thaw(coll);
   *
   * assert(!Object.isFrozen(thawed));
   * assert(!Object.isFrozen(thawed.c));
   * assert(thawed.c !== coll.c);
   * assert(thawed.e === coll.e);
   *
   */
  export function thaw<T>(coll: IFrozen<T>): T;

  /**
   * assoc(collection, key, value)
   *
   * alias: set
   *
   * Set a value in a collection. If value is a collection, it will be recursively frozen (if not already). In the case that the collection is an Array, the key is the array index.
   *
   * var coll = {a: 1, b: 2};
   * var newColl = icepick.assoc(coll, "b", 3); // {a: 1, b: 3}
   * var arr = ["a", "b", "c"];
   * var newArr = icepick.assoc(arr, 2, "d"); // ["a", "b", "d"]
   *
   */
  export function assoc<T>(coll: T, key: string, val: any): IFrozen<T>;
  export const set: typeof assoc;
  /**
   * dissoc(collection, key)
   *
   * alias: unset
   *
   * The opposite of assoc. Remove the value with the key from the collection. If used on an array, it will create a sparse array.
   *
   * var coll = {a: 1, b: 2, c: 3};
   * var newColl = icepick.dissoc(coll, "b"); // {a: 1, c: 3}
   * var arr = ["a", "b", "c"];
   * var newArr = icepick.dissoc(arr, 2); // ["a", , "c"]
   *
   */
  export function dissoc<T>(coll: T, key: string): IFrozen<T>;
  export const unset: typeof dissoc;
  /**
   * assocIn(collection, path, value)
   *
   * alias: setIn
   *
   * Set a value inside a hierarchical collection. path is an array of keys inside the object. Returns a partial copy of the original collection. Intermediate objects will be created if they don't exist.
   *
   * var coll = {
   *   a: "foo",
   *   b: [1, 2, 3],
   *   c: {
   *     d: "bar"
   *   }
   * };
   * var newColl = icepick.assocIn(coll, ["c", "d"], "baz");
   * assert(newColl.c.d === "baz");
   * assert(newColl.b === coll.b);
   * var coll = {};
   * var newColl = icepick.assocIn(coll, ["a", "b", "c"], 1);
   * assert(newColl.a.b.c === 1);
   *
   */
  export function assocIn<T>(coll: T, path: string[], val: any): IFrozen<T>;
  export const setIn: typeof assocIn;
  /**
   * getIn(collection, path)
   *
   * Get a value inside a hierarchical collection using a path of keys. Returns undefined if the value does not exist. A convenience method -- in most cases plain JS syntax will be simpler.
   *
   * var coll = icepick.freeze([
   *   {a: 1},
   *   {b: 2}
   * ]);
   * var result = icepick.getIn(coll, [1, "b"]); // 2
   *
   */
  export function getIn<T>(coll: T, path: string[]): any;
  /**
   * updateIn(collection, path, callback)
   *
   * Update a value inside a hierarchical collection. The path is the same as in assocIn. The previous value will be passed to the callback function, and callback should return the new value. If the value does not exist, undefined will be passed. If not all of the intermediate collections exist, an error will be thrown.
   *
   * var coll = icepick.freeze([
   *   {a: 1},
   *   {b: 2}
   * ]);
   * var newColl = icepick.updateIn(coll, [1, "b"], function (val) {
   *   return val * 2;
   * }); // [ {a: 1}, {b: 4} ]
   *
   */
  export function updateIn<T>(coll: T, path: string[], callback: (val: any) => any): IFrozen<T>;

  /**
   * assign(coll1, coll2, ...)
   *
   * alias: extend
   *
   * Similar to Object.assign, this function shallowly merges several objects together. Properties of the objects that are Objects or Arrays are deeply frozen.
   *
   * var obj1 = {a: 1, b: 2, c: 3};
   * var obj2 = {c: 4, d: 5};
   * var result = icepick.assign(obj1, obj2); // {a: 1, b: 2, c: 4, d: 5}
   * assert(obj1 !== result); // true
   *
   */
  export function assign<T>(...colls: T[]): IFrozen<T>;
  export const extend: typeof assign;
  /**
   * merge(target, source, [resolver])
   *
   * Deeply merge a source object into target, similar to Lodash.merge. Child collections that are both frozen and reference equal will be assumed to be deeply equal. Arrays from the source object will completely replace those in the target object if the two differ. If nothing changed, the original reference will not change. Returns a frozen object, and works with both unfrozen and frozen objects.
   *
   * var defaults = {a: 1, c: {d: 1, e: [1, 2, 3], f: {g: 1}}};
   * var obj = {c: {d: 2, e: [2], f: null}};
   * var result1 = icepick.merge(defaults, obj); // {a: 1, c: {d: 2, e: [2]}, f: null}
   * var obj2 = {c: {d: 2}};
   * var result2 = icepick.merge(result1, obj2)
   * assert(result1 === result2); // true
   *
   * An optional resolver function can be given as the third argument to change the way values are merged. For example, if you'd prefer that Array values from source be concatenated to target (instead of the source Array just replacing the target Array):
   *
   * var o1 = icepick.freeze({a: 1, b: {c: [1, 1]}, d: 1});
   * var o2 = icepick.freeze({a: 2, b: {c: [2]}});
   * function resolver(targetVal, sourceVal, key) {
   *   if (Array.isArray(targetVal) && sourceVal) {
   *     return targetVal.concat(sourceVal);
   *   } else {
   *     return sourceVal;
   *   }
   * }
   * var result3 = icepick.merge(o1, o2, resolver);
   * assert(result === {a: 2, b: {c: [1, 1, 2]}, d: 1});
   *
   * The resolver function receives three arguments: the value from the target object, the value from the source object, and the key of the value being merged.
   *
   */
  export function merge(
    target: any,
    source: any,
    resolver?: (targetVal: any, sourceVal: any, key: string) => any
  ): any;

  // Array.prototype methods
  //  var a = [1];
  //  a = icepick.push(a, 2); // [1, 2];
  //  a = icepick.unshift(a, 0); // [0, 1, 2];
  //  a = icepick.pop(a); // [0, 1];
  //  a = icepick.shift(a); // [1];

  /**
   * Appends new elements to an array, and returns the new array.
   *
   */
  export function push<V>(a: V[], ...items: V[]): V[];
  /**
   * Returns a new array with items inserted at the end.
   *
   */
  export function pop<V>(a: V[]): V[];
  /**
   * Returns a new array with the item value removed.
   *
   */
  export function shift<V>(a: V[]): V[];
  /**
   * Returns a new array with items inserted at the start.
   *
   */
  export function unshift<V>(a: V[], ...items: V[]): V[];
  /**
   * Returns a reversed array.
   */
  export function reverse<V>(a: V[]): V[];
  /**
   * Returns a sorted array.
   */
  export function sort<V>(a: V[], compareFn?: (a: V, b: V) => number): V[];
  /**
   * Removes elements from an array and, if necessary, inserts new elements in their place.
   */
  export function splice<V>(start: number, deleteCount?: number): V[];

  /**
   * slice(arr, start, [end])
   *
   * slice is also provided as a convenience, even though it does not mutate the original array. It freezes its result, however.
   */
  export function slice<V>(a: V[], start: number, end?: number): V[];

  // Each of these mutative Array prototype methods have been converted:
  // These non-mutative functions that return new arrays are also wrapped for convenience. Their results are frozen. Note that the mapping or filtering function is passed first, for easier partial application.

  /**
   * Applies a map to an array.
   *
   * icepick.map(function (v) {return v * 2}, [1, 2, 3]); // [2, 4, 6]
   */
  export function map<V1, V2>(fn: (value: V1, index: number) => V2, a: V1[]): V2[];
  /**
   * Filters an array.
   * var removeEvens = _.partial(icepick.filter, function (v) { return v % 2; });
   *
   * removeEvens([1, 2, 3]); // [1, 3]
   */
  export function filter<V>(fn: (value: V, index: number) => boolean, a: V[]): V[];

  // Array methods like find or indexOf are not added to icepick, because you can just use them directly on the array:
  // var arr = icepick.freeze([{a: 1}, {b: 2}]);
  // arr.find(function (item) { return item.b != null; }); // {b: 2}

  /**
   * chain(coll)
   *
   * Wrap a collection in a wrapper that allows calling icepick function as chainable methods, similar to lodash.chain. This is convenient when you need to perform multiple operations on a collection at one time. The result of calling each method is passed to the next method in the chain as the first argument. To retrieve the result, call wrapped.value(). Unlike lodash.chain, you must always call .value() to get the result, the methods are not lazily evaluated, and intermediate collections are always created (but this may change in the future).
   *
   * var o = {
   *   a: [1, 2, 3],
   *   b: {c: 1},
   *   d: 4
   * };
   *
   * var result = icepick.chain(o)
   *   .assocIn(["a", 2], 4)
   *   .merge({b: {c: 2, c2: 3}})
   *   .assoc("e", 2)
   *   .dissoc("d")
   *   .value();
   *
   * expect(result).to.eql({
   *   a: [1, 2, 4],
   *   b: {c: 2, c2: 3},
   *   e: 2
   * });
   * The wrapper also contains an additional thru method for performing arbitrary updates on the current wrapped value.
   *
   * var result = icepick.chain([1, 2])
   *   .push(3)
   *   .thru(function (val) {
   *     return [0].concat(val)
   *   })
   *   .value(); // [0, 1, 2, 3]
   */
  export function chain<T extends {}>(coll: T): IThainedObject<T>;
  export function chain<T>(coll: Array<T>): IChainedArray<T>;

  export interface IChainedObject<T extends {}> {
    freeze(): IChainedObject<IFrozen<T>>;
    thaw(): IChainedObject<T>;
    assoc<K extends keyof T>(key: K, val: T[K]): IChainedObject<T>;
    dissoc<K extends keyof T>(key: K): IChainedObject<T>;
    assocIn(path: string[], val: any): IChainedObject<T>;
    getIn(path: string[]): IChainedObject<any>;
    updateIn(path: string[], callback: (val: any) => any): IChainedObject<T>;
    assign<S>(...objs: S[]): IChainedObject<T & S>;
    merge(
      source: any,
      resolver?: (targetVal: any, sourceVal: any, key: string) => any
    ): IChainedObject<T>;
    extend(
      source: any,
      resolver?: (targetVal: any, sourceVal: any, key: string) => any
    ): IChainedObject<T>;
    thru<S extends {}>(callback: (val: T) => S): IChainedObject<S>;
    thru<S>(callback: (val: T) => Array<S>): IChainedArray<S>;
    value(): any;
  }

  export interface IChainedArray<T> {
    push(...items: T[]): IChainedArray<T>;
    pop(): IChainedArray<T>;
    shift(): IChainedArray<T>;
    unshift(...items: T[]): IChainedArray<T>;
    reverse(): IChainedArray<T>;
    sort(compareFn?: (a: T, b: T) => number): IChainedArray<T>;
    splice(): IChainedArray<T>;
    slice(): IChainedArray<T>;
    map(fn: (v: any, i: number) => any): IChainedArray<T>;
    filter(fn: (v: T, i: number) => boolean): IChainedArray<T>;
  }
}
