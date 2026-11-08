import CheckIn from '@/components/CheckIn';

export default async function ProgrammeCheckIn({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <CheckIn code={code} />;
}
