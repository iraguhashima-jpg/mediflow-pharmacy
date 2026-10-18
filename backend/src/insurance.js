export function splitAmount(total, insurance, memberNumber) {
  const amount = Number(total);
  if (!insurance) {
    return { patient: amount, insurer: 0, claimStatus: null };
  }
  switch (insurance.billing_model) {
    case 'PATIENT_PAYS_ALL':
      return { patient: amount, insurer: 0, claimStatus: null };
    case 'INSURER_PAYS_ALL':
      return { patient: 0, insurer: amount, claimStatus: 'PENDING' };
    case 'SPLIT_AT_COUNTER':
    default: {
      const pct = Number(insurance.coverage_percent) / 100;
      const insurer = Number((amount * pct).toFixed(2));
      const patient = Number((amount - insurer).toFixed(2));
      return { patient, insurer, claimStatus: insurer > 0 ? 'PENDING' : null };
    }
  }
}
