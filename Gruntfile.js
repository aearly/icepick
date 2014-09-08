module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    release: {
      options: {
        npm: true
      }
    }
  });

  grunt.loadNpmTasks("grunt-release");
  grunt.registerTask("default", "release");

};
