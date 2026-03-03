'use client';

import { useParams } from 'next/navigation';

import { SceneBuilder } from "../components/SceneBuilder";

export default function Home() {
  const params = useParams();

  const claimId = params.claim_id;  // or params.claimId depending on route
  const type = params.type;
  // Optional: provide default values or handle missing params

  const finalClaimId = claimId ?? '';

  const finalType = type ?? 'default';   // ← change default as needed

  return (

    <main className="w-full h-screen">

      <SceneBuilder

        claimId={finalClaimId}

        type={finalType}

      />

    </main>

  );

}