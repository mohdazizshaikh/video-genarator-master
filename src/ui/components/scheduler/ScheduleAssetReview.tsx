import React, { useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import { authenticatedFetch } from "../../services/authenticatedFetch";

export interface ReviewExecution {
  id: string;
  state: "claimed" | "completed" | "reconciling";
  producerContract?: { expectedAssets: number; expectsVideo: boolean };
  pendingOutput?: { state: "assets-persisted" | "video-queued"; artifacts: Array<{ id: string }> };
  reconciliation?: { evidenceReference: string; operator: string; confirmedAt: string };
}

export function canReviewAssets(execution: ReviewExecution): boolean {
  const { producerContract: contract, pendingOutput: output } = execution;
  return execution.state === "reconciling" && Boolean(contract && !contract.expectsVideo &&
    contract.expectedAssets > 0 && output?.state === "assets-persisted" &&
    output.artifacts.length === contract.expectedAssets &&
    new Set(output.artifacts.map((artifact) => artifact.id)).size === contract.expectedAssets);
}

export async function confirmScheduleAssets(scheduleId: string, executionId: string, evidence: string, verified: boolean): Promise<void> {
  const evidenceReference = evidence.trim();
  if (!verified || !evidenceReference || evidenceReference.length > 500 || Array.from(evidenceReference).some((character) => character.charCodeAt(0) < 32))
    throw new Error("Provide an evidence reference and confirm that you inspected every output.");
  const response = await authenticatedFetch(`/api/schedule/${encodeURIComponent(scheduleId)}/confirm-assets`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ executionId, evidenceReference, verifiedOutcome: true }),
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error("Your account needs schedule reconciliation permission.");
    if (response.status === 409) throw new Error("The output could not be confirmed. Refresh the schedule and inspect its current outputs.");
    throw new Error("Asset confirmation failed. Refresh before trying again.");
  }
}

export function ScheduleAssetReview({ scheduleId, execution, onDownload, onConfirmed }: {
  scheduleId: string;
  execution: ReviewExecution;
  onDownload: (artifactId: string) => void;
  onConfirmed: () => Promise<void>;
}) {
  const [evidence, setEvidence] = useState("");
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (saving || confirmed) return;
    setSaving(true); setError(null);
    try {
      await confirmScheduleAssets(scheduleId, execution.id, evidence, verified);
      setConfirmed(true);
      await onConfirmed();
    } catch (err) { setError(err instanceof Error ? err.message : "Asset confirmation failed"); }
    finally { setSaving(false); }
  };
  if (execution.reconciliation) return <Alert severity="success">Assets confirmed by {execution.reconciliation.operator}. Evidence: {execution.reconciliation.evidenceReference}</Alert>;
  if (execution.state === "completed") return null;
  return <Box sx={{ my: 1 }}>
    <Stack spacing={1}>
      <Typography variant="subtitle2">Inspect pending outputs</Typography>
      {execution.pendingOutput?.artifacts.map((artifact, index) => <Button key={artifact.id} size="small" onClick={() => onDownload(artifact.id)}>Download pending image {index + 1}</Button>)}
      {canReviewAssets(execution) ? <>
        <Typography variant="body2">Inspect every image, then record your evidence to confirm this completed asset run. Reconciliation permission is required. Confirmation does not generate or publish content.</Typography>
        <TextField label="Evidence reference" value={evidence} disabled={saving || confirmed} inputProps={{ maxLength: 500 }} onChange={(event) => setEvidence(event.target.value)} fullWidth size="small" />
        <FormControlLabel control={<Checkbox checked={verified} disabled={saving || confirmed} onChange={(event) => setVerified(event.target.checked)} />} label="I inspected every expected output and verified the completed result" />
        <Button onClick={() => void submit()} disabled={saving || confirmed || !verified || !evidence.trim()} variant="outlined">{saving ? "Confirming assets…" : "Confirm completed assets"}</Button>
      </> : <Alert severity="info">This execution cannot be confirmed here. In-progress, partial, video and unbound outcomes need further recovery review.</Alert>}
      {confirmed && <Alert severity="success">Assets confirmed. Refresh to view the updated schedule.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  </Box>;
}
