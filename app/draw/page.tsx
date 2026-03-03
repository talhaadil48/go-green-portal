'use client';

import { useSearchParams } from 'next/navigation';

import { SceneBuilder } from "../components/SceneBuilder";

export default function Home() {

  const searchParams = useSearchParams();

  const claimId = searchParams.get('claim_id');

  const type    = searchParams.get('type');

  // Optional: provide default values or handle missing params

  const finalClaimId = claimId ?? '';

  const finalType    = type ?? 'default';   // ← change default as needed

  return (

    <main className="w-full h-screen">

      <SceneBuilder 

        claimId={finalClaimId}

        type={finalType}

      />

    </main>

  );

}