function requestListFromBundle(bundle) {
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

function medicationsFromBundle(bundle) {
    if (!bundle.entry || bundle.entry.length === 0) {
        return [];
    }

    return bundle.entry
        .filter(entry => entry.resource.resourceType === "MedicationRequest")
        .map(item => item.resource);
}

function serviceRequestsFromBundle(bundle) {
    if (!bundle.entry || bundle.entry.length === 0) {
        return [];
    }

    return bundle.entry
        .filter(entry => entry.resource.resourceType === "ServiceRequest")
        .map(item => item.resource);
}

module.exports = {
    requestListFromBundle,
    medicationsFromBundle,
    serviceRequestsFromBundle
}
