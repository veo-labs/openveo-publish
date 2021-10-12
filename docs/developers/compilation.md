# Introduction

OpenVeo back office is written using AngularJS and SASS / Compass. SASS files need to be compiled to generate the CSS and JavaScript files can be minified and aggregated for better performance.

OpenVeo does not automatically compile SASS and JavaScript files for his plugins. Thus OpenVeo Publish have to compile his own SASS and JavaScript files.

# Compiling OpenVeo Publish plugin for production

To compile both OpenVeo Publish back office and front office for production use:

    npm run build

# Compiling OpenVeo Publish plugin for development

To compile both OpenVeo Publish back office and front office for development use:

    npm run build:development

To compile OpenVeo Publish back office when a file is modified use:

    npm run watch:back-office-client

To compile OpenVeo Publish front office when a file is modified use:

    npm run watch:front-office-client
