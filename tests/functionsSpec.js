'use strict';

describe("Functions utilities", function() {
	var fn = require('../functions.js');
    
    it("parse Url argument supports slack format and also regular URLs", function() {
    	expect(fn.parseUrl('http://google.com.ar/images/sarasa.jpg')).toEqual('http://google.com.ar/images/sarasa.jpg');
    	expect(fn.parseUrl('<http://google.com.ar/images/sarasa.jpg>')).toEqual('http://google.com.ar/images/sarasa.jpg');
    });


    it("parses guys when there is just one", function() {
    	expect(fn.parseGuys('fafafa')).toEqual(['fafafa']);
    });

});