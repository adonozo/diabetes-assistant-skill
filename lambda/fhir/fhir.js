function getExtension(resource, extensionUrl) {
    if (!resource.extension || !Array.isArray(resource.extension)) {
        return undefined;
    }

    const extension = resource.extension.find(ext => ext.url === extensionUrl);
    if (!extension) {
        return undefined;
    }

    return extension;
}

module.exports = {
    getExtension,
}
