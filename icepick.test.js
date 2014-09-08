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

  describe("assoc", function () {
    it("should work with objects", function () {
      var o = i.freeze({a: 1, b: 2, c: 3}),
        result = i.assoc(o, "b", 4);

      expect(result).to.eql({a: 1, b: 4, c: 3});

      result = i.assoc(o, "d", 4);
      expect(result).to.eql({a: 1, b: 2, c: 3, d: 4});
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
  });

  describe("getIn", function () {
    it("should work", function () {
      var o = i.freeze({
          a: 1,
          b: {a: 2},
          c: [
            {a: 3, b: 4},
            {a: 4}
          ]
        });
      expect(i.getIn(o, ["c", 0, "b"])).to.equal(4);
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
  });

});
