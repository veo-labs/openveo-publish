# Introduction

OpenVeo back end is written using AngularJS and SASS / Compass. SASS files need to be compiled to generate the CSS and JavaScript files can be minified and aggregated for better performance.

OpenVeo does not automatically compile SASS and JavaScript files for his plugins. Thus OpenVeo Publish have to compile his own SASS and JavaScript files.

# Compiling SASS files

You can compile only the back end SASS files using the following command:

    npm run build:back-office-scss

Or you can watch SASS files changes using the following command:

    npm run watch

# Compiling OpenVeo Publish

To compile OpenVeo Publish plugin use:

    npm run build
