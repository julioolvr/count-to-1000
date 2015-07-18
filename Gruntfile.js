module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

	jasmine_node: {
	    options: {
	      forceExit: true,
	      match: '.',
	      matchall: false,
	      extensions: 'js',
	      specNameMatcher: '*Spec'
	    },
	    all: ['tests/']
	  }

  });

  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-jasmine-node');
  
  grunt.registerTask('test', ['jasmine_node']);
};