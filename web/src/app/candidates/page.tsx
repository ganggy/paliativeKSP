import { CandidateSelector } from "@/components/candidate-selector";
import { clinicRules } from "@/lib/clinic-rules";
import { Suspense } from "react";

export default function CandidatesPage() {
  return (
    <Suspense fallback={null}>
      <CandidateSelector
        clinicNames={clinicRules.map((rule) => ({
          shortName: rule.shortName,
          clinicName: rule.clinicName,
        }))}
      />
    </Suspense>
  );
}
