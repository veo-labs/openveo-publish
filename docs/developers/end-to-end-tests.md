# Introduction

End to end tests are performed using [Protractor](http://www.protractortest.org/) and run from [OpenVeo core](https://github.com/veo-labs/openveo-core).

You first have to install and configure tests as described in core's documentation.

# Write tests

All end to end tests are located in **tests/client/e2eTests/**. Suites are described in **tests/client/protractorSuites.json**. And the list of datas to create before launching tests are available in **tests/client/e2eTests/database/data.json**

# Launch publish end to end tests

    # Launch all publish end to end tests on chrome
    npm run e2e -- --suite="publish"
