import { Bundle, Observation } from "fhir/r5";

export function getObservationsFromBundle(bundle: Bundle): Observation[] {
    if (!bundle.entry || bundle.entry.length === 0) {
        return [];
    }

    return bundle.entry
        .filter(entry => entry.resource?.resourceType === 'Observation')
        .map(item => item.resource as Observation);
}
