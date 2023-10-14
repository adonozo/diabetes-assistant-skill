import { BackboneType, DomainResource, Extension } from "fhir/r5";

export function getExtension(resource: DomainResource | BackboneType | undefined, extensionUrl: string): Extension | undefined {
    if (!resource?.extension || !Array.isArray(resource.extension)) {
        return;
    }

    const extension = resource.extension.find(ext => ext.url === extensionUrl);
    if (!extension) {
        return;
    }

    return extension;
}
