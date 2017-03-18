/* jshint elision:true */
var
  expect = require("expect.js"),
  i = require("../icepick");

module.exports = function () {

  describe("icepick symbols", function () {
    "use strict";

    describe("assoc", function () {
      it("should work with objects with symbols", function () {
        var symbol = Symbol(),
          o = i.freeze({a: 1, c: 3}),
          result = i.assoc(o, symbol, 4);

        expect(result).to.eql({a: 1, c: 3, [symbol]: 4});

        result = i.assoc(result, "b", 2);
        expect(result).to.eql({a: 1, b: 2, c: 3, [symbol]: 4});
      });
    });

    describe("dissoc", function () {
      it("should work with objects with symbols", function () {
        var symbol = Symbol();
        var o = i.freeze({a: 1, [symbol]: 2, c: 3}),
          result = i.dissoc(o, symbol);

        expect(result).to.eql({a:1, c:3});
      });
    });

    describe("assign", function () {

      it("should work with symbols", function () {
        var symbol = Symbol();
        var o = i.freeze({a: 1, b: 2, [symbol]: 3}),
        result = i.assign(o, {"b": 3, [symbol]: 4});
        expect(result).to.eql({a: 1, b: 3, [symbol]: 4});
        expect(result).to.not.equal(o);
        result = i.assign(o, {c: 3});
        expect(result).to.eql({a: 1, b: 2, c: 3, [symbol]: 4});
        result = i.assign(o, {c: 3, d: 4, [symbol]: 5});
        expect(result).to.eql({a: 1, b: 2, c: 3, d: 4, [symbol]: 5});
      });
    });
  });
};
