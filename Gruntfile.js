module.exports = function (grunt) {
  'use strict';
  var banner =
    '/*! <%= pkg.name %> <%= pkg.version %>\r\n' +
    ' * Author: <%= pkg.author %>\r\n' +
    ' * Description: <%= pkg.description %>\r\n' +
    ' * Dependencies: jQuery, Handlebars.js\r\n' +
    ' * Date: <%= grunt.template.today("yyyy-mm-dd") %> */\r\n';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js',
        'lib/**/*.js',
        'test/**/*.js'
      ]
    },
    clean: {
      build: ['dest/*', 'zak.js', 'zak.min.js']
    },
    concat: {
      options: {
        banner: banner,
      },
      dist: {
        src: [
          'lib/swak.js',
          'lib/kaz.js',
          'lib/zak.js'
        ],
        dest: 'dest/zak.js',
      },
    },
    uglify: {
      dist: {
        options: {
          banner: banner,
          sourceMap: 'dest/zak-source.js'
        },
        files: {
          'dest/zak.min.js': [ 'dest/zak.js' ]
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('build', [
    'jshint',
    'clean',
    'concat',
    'uglify'
  ]);
};
