# Clone project from git

From OpenVeo parent directory :

    git clone git@github.com:veo-labs/openveo-publish.git

You should have someting like this :

```
.
├── openveo-core
├── openveo-publish
```

# Install project's dependencies

    cd openveo-publish
    npm install

# Link plugin to the core

    cd openveo-publish
    npm link

    cd openveo-core
    npm link @openveo/publish
