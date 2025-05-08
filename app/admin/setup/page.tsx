
import ClientPage from './_client';

export const dynamic = 'force-dynamic'; // Ensures this runs on every request

export default async function SetupPageContainer() {
  return <ClientPage />;
}
