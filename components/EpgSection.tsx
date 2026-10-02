import { BantanEpg } from '@/components/BantanEpg';
import { fetchEpgData } from '@/lib/epg';

/** Server wrapper: the schedule arrives with the page HTML instead of after a client-side fetch. */
export async function EpgSection() {
  const epgData = await fetchEpgData();
  return <BantanEpg initialData={epgData} initialNow={new Date().toISOString()} />;
}
