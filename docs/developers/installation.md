# Installation

To install OpenVeo Publish you first need to install OpenVeo Core if not already done.


# OpenVeo Core

## Install @openveo/core package

    # Move to your workspace directory
    cd /WORKSPACE_PATH

    # Create directory for OpenVeo core
    mkdir openveo-core

    # Install OpenVeo core in this directory
    # See OpenVeo core documentation for more information

Your workspace should look like this:

```
.
├── openveo-core
```

## Create NPM links for openveo-api and openveo-test

In a classical NPM project @openveo/publish package should be installed in /WORKSPACE_PATH/openveo-core/node_modules/@openveo/publish. For development, the first thing which comes to mind is to create a clone of the OpenVeo Publish project inside this repository. But doing this will prevent npm install from working and will create a complicated development architecture with the risk to erase the repository at any time.

We use [NPM links](https://docs.npmjs.com/cli/link) to deal with this problem and store OpenVeo Publish inside /WORKSPACE_PATH/openveo-publish. But there is a catch. OpenVeo Publish needs both @openveo/api and @openveo/test of the core. As packages @openveo/publish and @openveo/core are installed in two different locations, package @openveo/publish won't find @openveo/api nor @openveo/test in its Node.JS path. That's why we have to create NPM links for both @openveo/api and @openveo/test and refer to it inside @openveo/publish.

    # Create a link for @openveo/api
    cd /WORKSPACE_PATH/openveo-core/node_modules/@openveo/api
    npm link

    # Create a link for @openveo/test
    cd /WORKSPACE_PATH/openveo-core/node_modules/@openveo/test
    npm link

# OpenVeo Publish

## Clone project from git

    # Clone project into workspace
    cd /WORKSPACE_PATH/
    git clone git@github.com:veo-labs/openveo-publish.git

Your workspace should look like this:

```
.
├── openveo-core
├── openveo-publish
```

## Link openveo-api and openveo-test

When installing OpenVeo Core we created NPM links for @openveo/api and @openveo/test. We can now refer to this links.

    # Install dependencies @openveo/api and @openveo/test using NPM links
    cd /WORKSPACE_PATH/openveo-publish
    npm link @openveo/api
    npm link @openveo/test

## Install project's dependencies

    cd /WORKSPACE_PATH/openveo-publish
    npm install

# Install plugin

To be able to install @openveo/publish in @openveo/core we create an NPM link of @openveo/publish and refer to it in the core.

## Create an NPM link

    # Create a link for @openveo/publish
    cd /WORKSPACE_PATH/openveo-publish
    npm link

## Link project to the core

    # Install dependency @openveo/publish using NPM links
    cd /WORKSPACE_PATH/openveo-core
    npm link @openveo/publish
