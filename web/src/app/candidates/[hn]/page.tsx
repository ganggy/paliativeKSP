import { notFound } from "next/navigation";
import { CandidateDetail } from "@/components/candidate-detail";
import { findHosCandidateByHnAnyArea } from "@/lib/data-service";

export default async function CandidateDetailPage({ params }: { params: Promise<{ hn: string }> }) {
  const { hn } = await params;
  const candidate = await findHosCandidateByHnAnyArea(hn);

  if (!candidate) {
    notFound();
  }

  return <CandidateDetail candidate={candidate} />;
}
