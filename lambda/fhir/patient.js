function getPatientSubject(patient) {
    return {
        reference: `Patient/${patient.id}`,
        display: getPatientFullName(patient)
    }
}

function getPatientFullName(patient) {
    let name = '';
    if (!patient.name || !Array.isArray(patient.name) || patient.name.length === 0) {
        return name;
    }

    name += patient.name[0].given?.join(' ')
    name += patient.name[0].family;
    return name;
}

module.exports = {
    getPatientSubject,
}
