'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SceneBuilder } from "../components/SceneBuilder";

export default function Home() {
  const router = useRouter();
  const [claimId, setClaimId] = useState("");
  const [type, setType] = useState("default");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setClaimId(search.get("claim_id") ?? "");
    setType(search.get("type") ?? "default");
  }, []);

  if (!claimId) return null; // optionally render a loading state

  return (
    <main className="w-full mt-[-74]">
      <SceneBuilder claimId={claimId} type={type} />
    </main>
  );
}