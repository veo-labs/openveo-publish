module.exports = {
  publishdev: {
    options: {
      sourcemap: true,
      sassDir: '<%= publish.sass %>',
      cssDir: '<%= publish.css %>',
      environment: 'development'
    }
  },
  publishdist: {
    options: {
      sourcemap: false,
      sassDir: '<%= publish.sass %>',
      cssDir: '<%= publish.css %>',
      environment: 'production'
    }
  }
}