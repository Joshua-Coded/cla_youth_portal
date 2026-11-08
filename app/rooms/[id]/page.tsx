import Roll from '@/components/Roll';

export const metadata = { title: 'Room roll call' };

export default async function RoomRoll({ params }: { params: Promise<{ id: string }> }) {
  return <Roll id={Number((await params).id)} />;
}
