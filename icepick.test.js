/* jshint elision:true */
var
  expect = require("expect.js"),
  i = require("../icepick");

describe("icepick", function () {
  "use strict";

  describe("freeze", function () {
    it("should work", function () {
      var a = i.freeze({asdf: "foo", zxcv: {asdf: "bar"}});

      expect(a.asdf).to.equal("foo");
      expect(Object.isFrozen(a)).to.equal(true);

      expect(function () {
        a.asdf = "bar";
      }).to.throwError();

      expect(function () {
        a.zxcv.asdf = "qux";
      }).to.throwError();

      expect(function () {
        a.qwer = "bar";
      }).to.throwError();
    });

    it("should not work with cyclical objects", function () {
      var a = {};
      a.a = a;

      expect(i.freeze).withArgs(a).to.throwError();

      a = {b: {}};
      a.b.a = a;
      expect(i.freeze).withArgs(a).to.throwError();
    });

  });

  describe("thaw", function () {
    function Foo () {}

    it("should thaw objects", function () {
      var o = i.freeze({
        a: {},
        b: 1,
        c: new Foo(),
        d: [{e: 1}]
      });

      var thawed = i.thaw(o);

      expect(thawed).to.eql(o);
      expect(Object.isFrozen(thawed)).to.be(false);
      expect(Object.isFrozen(thawed.a)).to.be(false);
      expect(o.a).to.not.equal(thawed.a);
      expect(o.d).to.not.equal(thawed.d);
      expect(o.d[0]).to.not.equal(thawed.d[0]);
      expect(o.c).to.equal(thawed.c);
    });
  });

  describe("assoc", function () {
    it("should work with objects", function () {
      var o = i.freeze({a: 1, b: 2, c: 3}),
        result = i.assoc(o, "b", 4);

      expect(result).to.eql({a: 1, b: 4, c: 3});

      result = i.assoc(o, "d", 4);
      expect(result).to.eql({a: 1, b: 2, c: 3, d: 4});
    });

    it("should freeze objects you assoc", function () {
      var o = i.freeze({a: 1, b: 2, c: 3}),
        result = i.assoc(o, "b", {d: 5});

      expect(result).to.eql({a: 1, b: {d: 5}, c: 3});

      expect(Object.isFrozen(result.b)).to.be.ok();
    });

    it("should work with arrays", function () {
      var a = i.freeze([1, 2, 3]),
        result = i.assoc(a, 1, 4);

      expect(result).to.eql([1, 4, 3]);

      result = i.assoc(a, "1", 4);
      expect(result).to.eql([1, 4, 3]);

      result = i.assoc(a, 3, 4);
      expect(result).to.eql([1, 2, 3, 4]);
    });

    it("should freeze arrays you assoc", function () {
      var o = i.freeze({a: 1, b: 2, c: 3}),
        result = i.assoc(o, "b", [1, 2]);

      expect(result).to.eql({a: 1, b: [1, 2], c: 3});

      expect(Object.isFrozen(result.b)).to.be.ok();
    });

    it("should return a frozen copy", function () {
      var o = i.freeze({a: 1, b: 2, c: 3}),
        result = i.assoc(o, "b", 4);

      expect(result).to.not.equal(o);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("should not modify child objects", function () {
      var o = i.freeze({a: 1, b: 2, c: {a: 4}}),
        result = i.assoc(o, "b", 4);

      expect(result.c).to.equal(o.c);
    });

    it("should keep references the same if nothing changes", function () {
      var o = i.freeze({a: 1});
      var result = i.assoc(o, "a", 1);
      expect(result).to.equal(o);
    });

    it("should be aliased as set", function () {
      expect(i.set).to.equal(i.assoc);
    });
  });

  describe("dissoc", function () {
    it("should work with objecs", function () {
      var o = i.freeze({a: 1, b: 2, c: 3}),
        result = i.dissoc(o, "b");

      expect(result).to.eql({a:1, c:3});
    });

    it("should work with arrays (poorly)", function () {
      var a = i.freeze([1, 2, 3]),
        result = i.dissoc(a, 1);

      expect(result).to.eql([1, , 3]);
    });

    it("should be aliased as unset", function () {
      expect(i.unset).to.equal(i.dissoc);
    });
  });

  describe("assocIn", function () {
    it("should work recursively", function () {
      var o = i.freeze({a: 1, b: 2, c: {a: 4}}),
        result = i.assocIn(o, ["c", "a"], 5);

      expect(result).to.eql({a: 1, b: 2, c: {a: 5}});
    });

    it("should work recursively (deeper)", function () {
      var o = i.freeze({
          a: 1,
          b: {a: 2},
          c: [
            {
              a: 3,
              b: 4
            },
            {a: 4}
          ]
        }),
        result = i.assocIn(o, ["c", 0, "a"], 8);

      expect(result.c[0].a).to.equal(8);
      expect(result).to.not.equal(o);
      expect(result.b).to.equal(o.b);
      expect(result.c).to.not.equal(o.c);
      expect(result.c[0]).to.not.equal(o.c[0]);
      expect(result.c[0].b).to.equal(o.c[0].b);
      expect(result.c[1]).to.equal(o.c[1]);
    });

    it("should create collections if they don't exist", function () {
      var result = i.assocIn({}, ["a", "b", "c"], 1);
      expect(result).to.eql({a: {b: {c: 1}}});
    });

    it("should be aliased as setIn", function () {
      expect(i.setIn).to.equal(i.assocIn);
    });

    it("should keep references the same if nothing changes", function () {
      var o = i.freeze({a: {b: 1}});
      var result = i.assocIn(o, ["a", "b"], 1);
      expect(result).to.equal(o);
    });
  });

  describe("getIn", function () {
    it("should work", function () {
      var o = i.freeze({
          a: 0,
          b: {a: 2},
          c: [
            {a: 3, b: 4},
            {a: 4}
          ]
        });
      expect(i.getIn(o, ["c", 0, "b"])).to.equal(4);
      expect(i.getIn(o, ["a"])).to.equal(0);
    });

    it("should work without a path", function () {
      var o = i.freeze({a: {b: 1}});
      expect(i.getIn(o)).to.equal(o);
    });

    it("should return undefined for a non-existant path", function () {
      var o = i.freeze({
        a: 1,
        b: {a: 2},
        c: [
          {a: 3, b: 4},
          {a: 4}
        ]
      });

      expect(i.getIn(o, ["q"])).to.equal(undefined);
      expect(i.getIn(o, ["a", "s", "d"])).to.equal(undefined);
    });

    it("should return undefined for a non-existant path (null)", function () {
      var o = i.freeze({
        a: null
      });

      expect(i.getIn(o, ["a", "b"])).to.equal(undefined);
    });
  });

  describe("updateIn", function () {
    it("should work", function () {
      var o = i.freeze({a: 1, b: 2, c: {a: 4}}),
        result = i.updateIn(o, ["c", "a"], function (num) {
          return num * 2;
        });

      expect(result).to.eql({a: 1, b: 2, c: {a: 8}});

    });

    it("should create collections if they don't exist", function () {
      var result = i.updateIn({}, ["a", 1, "c"], function (val) {
        expect(val).to.be(undefined);
        return 1;
      });
      expect(result).to.eql({a: {"1": {c: 1}}});
    });

    it("should keep references the same if nothing changes", function () {
      var o = i.freeze({a: 1});
      var result = i.updateIn(o, ["a", "b"], function (v) { return v; });
      expect(result).to.equal(o);
    });
  });

  describe("Array methods", function () {
    it("push", function () {
      var a = i.freeze([1, 2]),
        result = i.push(a, 3);

      expect(result).to.eql([1, 2, 3]);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("push (with object)", function () {
      var a = i.freeze([1, 2]),
        result = i.push(a, {b: 1});

      expect(result).to.eql([1, 2, {b: 1}]);
      expect(Object.isFrozen(result)).to.be.ok();
      expect(Object.isFrozen(result[2])).to.be.ok();
    });

    it("unshift", function () {
      var a = i.freeze([1, 2]),
        result = i.unshift(a, 3);

      expect(result).to.eql([3, 1, 2]);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("unshift (with object)", function () {
      var a = i.freeze([1, 2]),
        result = i.unshift(a, [0]);

      expect(result).to.eql([[0], 1, 2]);
      expect(Object.isFrozen(result)).to.be.ok();
      expect(Object.isFrozen(result[0])).to.be.ok();
    });

    it("pop", function () {
      var a = i.freeze([1, 2]),
        result = i.pop(a);

      expect(result).to.eql([1]);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("shift", function () {
      var a = i.freeze([1, 2]),
        result = i.shift(a);

      expect(result).to.eql([2]);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("reverse", function () {
      var a = i.freeze([1, 2, 3]),
        result = i.reverse(a);

      expect(result).to.eql([3, 2, 1]);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("sort", function () {
      var a = i.freeze([4, 1, 2, 3]),
        result = i.sort(a);

      expect(result).to.eql([1, 2, 3, 4]);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("splice", function () {
      var a = i.freeze([1, 2, 3]),
        result = i.splice(a, 1, 1, 4);

      expect(result).to.eql([1, 4, 3]);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("splice (with object)", function () {
      var a = i.freeze([1, 2, 3]),
        result = i.splice(a, 1, 1, {b:1}, {b: 2});

      expect(result).to.eql([1, {b: 1}, {b: 2}, 3]);
      expect(Object.isFrozen(result)).to.be.ok();
      expect(Object.isFrozen(result[1])).to.be.ok();
      expect(Object.isFrozen(result[2])).to.be.ok();
    });

    it("slice", function () {
      var a = i.freeze([1, 2, 3]),
        result = i.slice(a, 1, 2);

      expect(result).to.eql([2]);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("map", function () {
      var a = i.freeze([1, 2, 3]);
      var result = i.map(function (v) { return v * 2; }, a);

      expect(result).to.eql([2, 4, 6]);
      expect(Object.isFrozen(result)).to.be.ok();
    });

    it("filter", function () {
      var a = i.freeze([1, 2, 3]);
      var result = i.filter(function (v) { return v % 2; }, a);

      expect(result).to.eql([1, 3]);
      expect(Object.isFrozen(result)).to.be.ok();
    });
  });


  describe("assign", function () {

    it("should work", function () {
      var o = i.freeze({a: 1, b: 2, c: 3}),
      result = i.assign(o, {"b": 3, "c": 4});
      expect(result).to.eql({a: 1, b: 3, c: 4});
      expect(result).to.not.equal(o);
      result = i.assign(o, {"d": 4});
      expect(result).to.eql({a: 1, b: 2, c: 3, d: 4});
    });

    it("should work with multiple args", function () {
      var o = i.freeze({a: 1, b: 2, c: 3}),
      result = i.assign(o, {"b": 3, "c": 4}, {"d": 4});
      expect(result).to.eql({a: 1, b: 3, c: 4, d: 4});
    });

    it("should keep references the same if nothing changes", function () {
      var o = i.freeze({a: 1});
      var result = i.assign(o, {a: 1});
      expect(result).to.equal(o);
    });
  });

  describe("merge", function () {

    it("should merge nested objects", function () {
      var o1 = i.freeze({a: 1, b: {c: 1, d: 1}});
      var o2 = i.freeze({a: 1, b: {c: 2}, e: 2});

      var result = i.merge(o1, o2);
      expect(result).to.eql({a: 1, b: {c: 2, d: 1}, e: 2});
    });

    it("should replace arrays", function () {
      var o1 = i.freeze({a: 1, b: {c: [1, 1]}, d: 1});
      var o2 = i.freeze({a: 2, b: {c: [2]}});

      var result = i.merge(o1, o2);
      expect(result).to.eql({a: 2, b: {c: [2]}, d: 1});
    });

    it("should overwrite with nulls", function () {
      var o1 = i.freeze({a: 1, b: {c: [1, 1]}});
      var o2 = i.freeze({a: 2, b: {c: null}});

      var result = i.merge(o1, o2);
      expect(result).to.eql({a: 2, b: {c: null}});
    });

    it("should overwrite primitives with objects", function () {
      var o1 = i.freeze({a: 1, b: 1});
      var o2 = i.freeze({a: 2, b: {c: 2}});

      var result = i.merge(o1, o2);
      expect(result).to.eql({a: 2, b: {c: 2}});
    });

    it("should overwrite objects with primitives", function () {
      var o1 = i.freeze({a: 1, b: {c: 2}});
      var o2 = i.freeze({a: 1, b: 2});

      var result = i.merge(o1, o2);
      expect(result).to.eql({a: 1, b: 2});
    });

    it("should keep references the same if nothing changes", function () {
      var o1 = i.freeze({a: 1, b: {c: 1, d: 1, e: [1]}});
      var o2 = i.freeze({a: 1, b: {c: 1, d: 1, e: o1.b.e}});
      var result = i.merge(o1, o2);
      expect(result).to.equal(o1);
      expect(result.b).to.equal(o1.b);
    });

    it("should handle undefined parameters", function () {
      expect(i.merge({}, undefined)).to.eql({});
      expect(i.merge(undefined, {})).to.eql(undefined);
    });

    describe("custom associator", function () {
      it("should use the custom associator", function () {
        var o1 = i.freeze({a: 1, b: {c: [1, 1]}, d: 1});
        var o2 = i.freeze({a: 2, b: {c: [2]}});

        function resolver(targetVal, sourceVal) {
          if (Array.isArray(targetVal) && sourceVal) {
            return targetVal.concat(sourceVal);
          } else {
            return sourceVal;
          }
        }

        var result = i.merge(o1, o2, resolver);
        expect(result).to.eql({a: 2, b: {c: [1, 1, 2]}, d: 1});
      });
    });

  });

});

describe("chain", function () {

  it("should wrap and unwrap a value", function () {
    var a = [1, 2, 3];
    var result = i.chain(a).value();
    expect(result).to.eql(a);
  });

  it("should work with a simple operation", function () {
    var a = [1, 2, 3];
    var result = i.chain(a)
      .assoc(1, 4)
      .value();
    expect(result).to.eql([1, 4, 3]);
    expect(result).to.not.equal(a);
    expect(Object.isFrozen(result)).to.be.ok();
  });

  it("should work with multiple operations", function () {
    var a = [1, 2, 3];
    var result = i.chain(a)
      .assoc(1, 4)
      .reverse()
      .pop()
      .push(5)
      .value();
    expect(result).to.eql([3, 4, 5]);
    expect(result).to.not.equal(a);
    expect(Object.isFrozen(result)).to.be.ok();
  });

  it("should work with multiple operations (more complicated)", function () {
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
    expect(result).to.not.equal(o);
    expect(Object.isFrozen(result)).to.be.ok();
  });

  it("should have a thru method", function () {
    var o = [1, 2];
    var result = i.chain(o)
      .push(3)
      .thru(function (val) {
        return [0].concat(val);
      })
      .value();
    expect(Object.isFrozen(result)).to.be.ok();
    expect(result).to.eql([0, 1, 2, 3]);
  });

});


describe("production mode", function () {
  var oldEnv;
  before(function () {
    oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
  });

  after(function () {
    process.env.NODE_ENV = oldEnv;
  });

  it("should not freeze objects", function () {
    var result = i.freeze({});
    expect(Object.isFrozen(result)).to.be(false);
  });

  it("should not freeze objects that are assoc'd", function () {
    var result = i.assoc({}, "a", {});
    expect(Object.isFrozen(result)).to.be(false);
    expect(Object.isFrozen(result.a)).to.be(false);
  });

  it("merge should keep references the same if nothing changes", function () {
    var o1 = i.freeze({a: 1, b: {c: 1, d: 1, e: [1]}});
    var o2 = i.freeze({a: 1, b: {c: 1, d: 1, e: o1.b.e}});
    var result = i.merge(o1, o2);
    expect(result).to.equal(o1);
    expect(result.b).to.equal(o1.b);
  });
});

describe("internals", function () {
  describe("_weCareAbout", function () {
    function Foo() {}

    it("should care about objects", function () {
      expect(i._weCareAbout({})).to.equal(true);
    });
    it("should care about arrays", function () {
      expect(i._weCareAbout([])).to.equal(true);
    });
    it("should not care about dates", function () {
      expect(i._weCareAbout(new Date())).to.equal(false);
    });
    it("should not care about null", function () {
      expect(i._weCareAbout(null)).to.equal(false);
    });
    it("should not care about undefined", function () {
      expect(i._weCareAbout(undefined)).to.equal(false);
    });
    it("should not care about class instances", function () {
      expect(i._weCareAbout(new Foo())).to.equal(false);
    });
    it("should not care about objects created with Object.create()",
    function () {
      expect(i._weCareAbout(Object.create(Foo.prototype))).to.equal(false);
    });
    it("should not care about objects created with Object.create({})",
    function () {
      expect(i._weCareAbout(Object.create({
        foo: function () {}
      }))).to.equal(false);
    });
  });

  describe("_slice", function () {
    it("should work", function () {
      expect(i._slice([1, 2, 3], 2)).to.eql([3]);
      expect(i._slice([1, 2, 3], 1)).to.eql([2, 3]);
      expect(i._slice([1, 2, 3], 0)).to.eql([1, 2, 3]);
      expect(i._slice([1, 2, 3], 4)).to.eql([]);
      expect(i._slice([], 0)).to.eql([]);
      expect(i._slice([], 1)).to.eql([]);
    });
  });
});
