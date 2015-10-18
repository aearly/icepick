module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    release: {
      options: {
        npm: true
      }
    }
  });
  grunt.loadNpmTasks("grunt-release");
};
