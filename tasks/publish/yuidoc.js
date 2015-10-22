'use strict';

module.exports = {

  // Back end doc
  backEnd: {
    name: 'OpenVeo Publish AngularJS back end',
    description: 'AngularJS OpenVeo Publish plugin back end documentation',
    version: '<%= pkg.version %>',
    options: {
      paths: 'app/client/admin/js',
      outdir: './site/version/api/back-end',
      linkNatives: true,
      themedir: 'node_modules/yuidoc-theme-blue'
    }
  }

};
