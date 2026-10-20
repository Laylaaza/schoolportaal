import { StudentDetail } from "@/components/records";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StudentDetail id={(await params).id} teacher />;
}
