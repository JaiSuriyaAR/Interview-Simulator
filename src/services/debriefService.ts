export async function generateDebrief(transcript: any[], sessionInfo: any, isRegeneration: boolean = false) {
  console.log("Requesting server-side debrief generation. Transcript length:", transcript.length);
  
  const response = await fetch("/api/debrief", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transcript,
      sessionInfo,
      isRegeneration,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Debrief generation failed with status ${response.status}`);
  }

  const debrief = await response.json();
  console.log("Successfully received debrief from server:", debrief);
  return debrief;
}
