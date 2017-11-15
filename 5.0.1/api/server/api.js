YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "ConfigurationController",
        "ConfigurationModel",
        "ConfigurationProvider",
        "DirectoryFsWatcher",
        "DirectoryWatcher",
        "ERRORS",
        "GoogleOAuthHelper",
        "HTTP_ERRORS",
        "LocalProvider",
        "Package",
        "PackageError",
        "PropertyController",
        "PropertyModel",
        "PropertyProvider",
        "PublishError",
        "PublishManager",
        "PublishPlugin",
        "ResumableUpload",
        "STATES",
        "StatisticsController",
        "TYPES",
        "TarPackage",
        "TarPackageError",
        "VideoController",
        "VideoModel",
        "VideoPackage",
        "VideoPackageError",
        "VideoPlatformProvider",
        "VideoProvider",
        "VimeoProvider",
        "Watcher",
        "WatcherError",
        "WowzaProvider",
        "YoutubeProvider",
        "factory",
        "listener",
        "videoPlatformFactory"
    ],
    "modules": [
        "controllers",
        "models",
        "packages",
        "providers",
        "publish",
        "watcher"
    ],
    "allModules": [
        {
            "displayName": "controllers",
            "name": "controllers",
            "description": "Include all plugin's controllers to handle HTTP or socket messages."
        },
        {
            "displayName": "models",
            "name": "models",
            "description": "Publish models."
        },
        {
            "displayName": "packages",
            "name": "packages",
            "description": "All packages types which can be processed."
        },
        {
            "displayName": "providers",
            "name": "providers",
            "description": "All publish providers."
        },
        {
            "displayName": "publish",
            "name": "publish",
            "description": "Defines the Publish Plugin that will be loaded by the core application."
        },
        {
            "displayName": "watcher",
            "name": "watcher",
            "description": "Defines a Watcher to be aware of new resources added to directories."
        }
    ],
    "elements": []
} };
});