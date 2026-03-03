'use client';

import { useRouter } from 'next/navigation';
import { SceneBuilder } from "../components/SceneBuilder";

export default function Home() {
  const router = useRouter();
  const search = new URLSearchParams(window.location.search);

  const claimId = search.get('claim_id') ?? '';
  const type    = search.get('type') ?? 'default';

  return (
    <main className="w-full h-screen">
      <SceneBuilder 
        claimId={claimId}
        type={type}
      />
    </main>
  );
}