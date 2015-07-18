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
	},
	jshint: {
      all: {
      	files: {
      		src: ['*.js', '/tests/*.js']
      	},
      	options: {
            jshintrc: '.jshintrc'
        }
      }
    }

  });

  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('test', ['jshint', 'jasmine_node']);
};