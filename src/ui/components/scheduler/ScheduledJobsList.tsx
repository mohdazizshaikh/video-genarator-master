/**
 * ScheduledJobsList – table of active/pending render and publish jobs with status chips
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  LinearProgress,
  Link,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import PublishIcon from "@mui/icons-material/Publish";
import type { RenderJob, PublishJob } from "../../hooks/useScheduledJobs";

type JobTab = "render" | "publish";

interface ScheduledJobsListProps {
  renderJobs: RenderJob[];
  publishJobs: PublishJob[];
  loading: boolean;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
  pending: "warning",
  processing: "info",
  queued: "warning",
  completed: "success",
  failed: "error",
  reconciling: "warning",
  rendered: "success",
  ready: "success",
  skipped: "error",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export const ScheduledJobsList: React.FC<ScheduledJobsListProps> = ({
  renderJobs,
  publishJobs,
  loading,
  onRefresh,
}) => {
  const [tab, setTab] = useState<JobTab>("render");

  const handleTab = (_: React.MouseEvent<HTMLElement>, val: JobTab | null) => {
    if (val) setTab(val);
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <ToggleButtonGroup value={tab} exclusive onChange={handleTab} size="small">
          <ToggleButton value="render">
            <VideoLibraryIcon sx={{ mr: 0.5, fontSize: 16 }} />
            Render Jobs ({renderJobs.length})
          </ToggleButton>
          <ToggleButton value="publish">
            <PublishIcon sx={{ mr: 0.5, fontSize: 16 }} />
            Publish Jobs ({publishJobs.length})
          </ToggleButton>
        </ToggleButtonGroup>

        <Tooltip title="Refresh jobs">
          <IconButton size="small" onClick={onRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {tab === "render" && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Job ID</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Output</TableCell>
                <TableCell>Orientation</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {renderJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No render jobs found
                  </TableCell>
                </TableRow>
              ) : (
                renderJobs.slice(0, 50).map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {job.id.slice(0, 12)}…
                      </Typography>
                    </TableCell>
                    <TableCell>{job.category}</TableCell>
                    <TableCell>
                      {job.status === "rendered" && job.videoId && job.artifactId && job.contentVersionId
                        ? <Link href={`/video/${encodeURIComponent(job.videoId)}`}>Open video</Link>
                        : job.status === "reconciling" ? <Tooltip title={job.error || "Render outcome needs review"}><span>Needs review</span></Tooltip> : "—"}
                    </TableCell>
                    <TableCell>{job.orientation}</TableCell>
                    <TableCell>{job.videoType}</TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        size="small"
                        color={STATUS_COLORS[job.status] ?? "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{formatDate(job.createdAt)}</Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === "publish" && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Job ID</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Scheduled At</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {publishJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No publish jobs found
                  </TableCell>
                </TableRow>
              ) : (
                publishJobs.slice(0, 50).map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {job.id.slice(0, 12)}…
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={job.platform} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {job.title || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        size="small"
                        color={STATUS_COLORS[job.status] ?? "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {job.scheduledAt ? formatDate(job.scheduledAt) : "Immediate"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{formatDate(job.createdAt)}</Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ScheduledJobsList;
