import { BackboneType, DomainResource, Extension } from "fhir/r5";

export function getExtension(resource: DomainResource | BackboneType, extensionUrl: string): Extension | undefined {
    if (!resource.extension || !Array.isArray(resource.extension)) {
        return undefined;
    }

    const extension = resource.extension.find(ext => ext.url === extensionUrl);
    if (!extension) {
        return undefined;
    }

    return extension;
}
