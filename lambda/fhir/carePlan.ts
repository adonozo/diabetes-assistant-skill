import { Bundle, FhirResource, MedicationRequest, ServiceRequest } from "fhir/r5";

export function requestListFromBundle(bundle: Bundle): FhirResource[] {
    if (!bundle.entry || bundle.entry.length === 0) {
        return [];
    }

    const medicationRequests = bundle.entry
        .filter(entry => entry.resource.resourceType === "MedicationRequest")
        .map(item => item.resource)
    const serviceRequests = bundle.entry
        .filter(entry => entry.resource.resourceType === "ServiceRequest")
        .map(item => item.resource)

    return [...medicationRequests, ...serviceRequests]
}

export function medicationsFromBundle(bundle: Bundle): MedicationRequest[] {
    if (!bundle.entry || bundle.entry.length === 0) {
        return [];
    }

    return bundle.entry
        .filter(entry => entry.resource.resourceType === "MedicationRequest")
        .map(item => item.resource as MedicationRequest);
}

export function serviceRequestsFromBundle(bundle: Bundle): ServiceRequest[] {
    if (!bundle.entry || bundle.entry.length === 0) {
        return [];
    }

    return bundle.entry
        .filter(entry => entry.resource.resourceType === "ServiceRequest")
        .map(item => item.resource as ServiceRequest);
}
