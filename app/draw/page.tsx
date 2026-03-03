'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SceneBuilder } from "../components/SceneBuilder";

export default function Home() {
  const router = useRouter();
  const [claimId, setClaimId] = useState("");
  const [type, setType] = useState("default");
  const [afterJson, setAfterJson] = useState<any>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setClaimId(search.get("claim_id") ?? "");
    setType(search.get("type") ?? "default");

    // retrieve JSON
    const storedJson = localStorage.getItem("json");
    if (storedJson) {
      setAfterJson(JSON.parse(storedJson));
      console.log("Loaded JSON for drawing:", JSON.parse(storedJson));
      localStorage.removeItem("json"); // optional: clear after reading
    }
  }, []);

  if (!claimId) return null;

  return (
    <main className="w-full mt-[-74]">
      <SceneBuilder claimId={claimId} type={type} afterJson={afterJson} />
    </main>
  );
}