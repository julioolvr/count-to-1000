'use strict';

describe("Functions utilities", function() {
    var fn = require('../functions.js');
    
    it("parse Url argument supports slack format and also regular URLs", function() {
        expect(fn.parseUrl('http://google.com.ar/images/sarasa.jpg')).toEqual('http://google.com.ar/images/sarasa.jpg');
        expect(fn.parseUrl('<http://google.com.ar/images/sarasa.jpg>')).toEqual('http://google.com.ar/images/sarasa.jpg');
    });

    it("parses names", function() {
        var files = ["pepe.png", "pipo.png", "popo.png"]
        expect(fn.availableNames(files)).toEqual(["pepe", "pipo", "popo"])
    })

    var names = ["pipi", "pepe"]
    it("parses guys when there is just one", function() {
        expect(fn.parseGuys('pepe', names)).toEqual(['pepe'])
    })
    it("parses guys when there are some guys that doesn't exist", function() {
        expect(fn.parseGuys("papa&pepe&pipo", names)).toEqual(["pepe"])
    })
    it("parses all guys", function() {
        var guys = fn.parseGuys("all", names)
        expect(guys).toContain("pipi")
        expect(guys).toContain("pepe")
        expect(guys.length).toEqual(names.length)
    });
    it("parses a random guy", function() {
        var guys = fn.parseGuys("random", names)
        expect(guys.length).toEqual(1)
        expect(names).toContain(guys[0])
    });

    it("parses repeated face for guy", function() {
        var pepeFiles = ["pepe.png", "pepe.1.png", "pepe.otra.png"]
        var files = pepeFiles.concat(["pipo.png", "popo.png"])
        expect(fn.availableNames(files, ".")).toEqual(["pepe", "pipo", "popo"])
        expect(pepeFiles).toContain(fn.anyFaceForGuy("pepe").substring(2))
    })
});
