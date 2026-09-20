import { authenticatedFetch } from "../../services/authenticatedFetch";
/**
 * ScheduleCalendar – Weekly calendar grid with drag-to-reschedule
 * Shows all active schedules mapped to their publish times.
 * Drag a block to a new time slot → PATCHes /api/schedule/:id with the new publishAt.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import RefreshIcon from "@mui/icons-material/Refresh";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_START = 6;
const HOUR_END = 23;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CONTENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  video:    { bg: "rgba(25, 118, 210, 0.15)", text: "#1565c0", border: "#1976d2" },
  image:    { bg: "rgba(46, 125, 50, 0.15)",  text: "#1b5e20", border: "#388e3c" },
  carousel: { bg: "rgba(123, 31, 162, 0.15)", text: "#4a148c", border: "#7b1fa2" },
  banner:   { bg: "rgba(245, 124, 0, 0.15)",  text: "#e65100", border: "#f57c00" },
};

const CELL_HEIGHT = 56;  // px per hour slot
const COL_WIDTH   = 130; // px per day column

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleRecord {
  id: string;
  name: string;
  platforms: string[];
  categories: string[];
  status: string;
  publishAt: string;
  nextRun?: string;
  engines?: Record<string, boolean>;
  metadata?: Record<string, any>;
  runCount?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Monday of the week containing `date` */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return an array of 7 Date objects (Mon–Sun) for the given week */
function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatHour(h: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}${period}`;
}

function getColorFor(contentType: string) {
  return CONTENT_TYPE_COLORS[contentType] ?? CONTENT_TYPE_COLORS.video;
}

// ─── Schedule Block ───────────────────────────────────────────────────────────

interface BlockProps {
  sched: ScheduleRecord;
  contentType: string;
  minuteOffset: number;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: (sched: ScheduleRecord) => void;
}

const ScheduleBlock: React.FC<BlockProps> = ({ sched, contentType, minuteOffset, onDragStart, onClick }) => {
  const colors = getColorFor(contentType);
  const topOffset = (minuteOffset / 60) * CELL_HEIGHT;

  return (
    <Box
      draggable
      onDragStart={(e) => onDragStart(e, sched.id)}
      onClick={() => onClick(sched)}
      title={`${sched.name}\n${sched.platforms?.join(", ")}`}
      sx={{
        position: "absolute",
        top: topOffset,
        left: 2,
        right: 2,
        minHeight: 28,
        maxHeight: CELL_HEIGHT - 4,
        bgcolor: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 1,
        px: 0.75,
        py: 0.5,
        cursor: "grab",
        userSelect: "none",
        overflow: "hidden",
        zIndex: 2,
        "&:hover": {
          boxShadow: `0 0 0 2px ${colors.border}55`,
          zIndex: 3,
        },
        "&:active": {
          cursor: "grabbing",
          opacity: 0.7,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <DragIndicatorIcon sx={{ fontSize: 11, color: colors.text, flexShrink: 0, opacity: 0.6 }} />
        <Typography
          variant="caption"
          sx={{ color: colors.text, fontWeight: 700, fontSize: "0.65rem", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {sched.name}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        sx={{ color: colors.text, fontSize: "0.58rem", opacity: 0.8, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {contentType} · {sched.platforms?.[0] || "—"}
      </Typography>
    </Box>
  );
};

// ─── Detail Dialog ────────────────────────────────────────────────────────────

interface DetailDialogProps {
  sched: ScheduleRecord | null;
  onClose: () => void;
}

const DetailDialog: React.FC<DetailDialogProps> = ({ sched, onClose }) => {
  if (!sched) return null;
  const contentType = (sched.metadata?.contentType as string) || "video";
  const colors = getColorFor(contentType);

  return (
    <Dialog open={!!sched} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: colors.border, flexShrink: 0 }} />
          <Typography variant="subtitle1" fontWeight={700} noWrap>{sched.name}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label={contentType} size="small" sx={{ bgcolor: colors.bg, color: colors.text, borderColor: colors.border }} variant="outlined" />
            <Chip
              label={sched.status}
              size="small"
              color={sched.status === "active" ? "success" : sched.status === "paused" ? "warning" : "default"}
            />
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">Publish At</Typography>
            <Typography variant="body2" fontWeight={600}>{new Date(sched.publishAt).toLocaleString()}</Typography>
          </Box>

          {sched.nextRun && (
            <Box>
              <Typography variant="caption" color="text.secondary">Next Run</Typography>
              <Typography variant="body2" fontWeight={600}>{new Date(sched.nextRun).toLocaleString()}</Typography>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary">Platforms</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              {(sched.platforms || []).map((p) => (
                <Chip key={p} label={p} size="small" variant="outlined" />
              ))}
            </Stack>
          </Box>

          {sched.categories?.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">Categories</Typography>
              <Typography variant="body2">{sched.categories.join(", ")}</Typography>
            </Box>
          )}

          {typeof sched.runCount === "number" && (
            <Box>
              <Typography variant="caption" color="text.secondary">Run Count</Typography>
              <Typography variant="body2" fontWeight={600}>{sched.runCount}</Typography>
            </Box>
          )}

          {sched.engines && (
            <Box>
              <Typography variant="caption" color="text.secondary">Active Engines</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {Object.entries(sched.engines)
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <Chip
                      key={k}
                      label={k.replace("enable", "").replace(/([A-Z])/g, " $1").trim()}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.6rem" }}
                    />
                  ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="small">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ScheduleCalendar: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ScheduleRecord | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ dayIdx: number; hour: number } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const nowRef = useRef(new Date());

  const monday = getMondayOf(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(monday);
  const today = nowRef.current;

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/schedule?limit=200");
      const data = await res.json();
      setSchedules(Array.isArray(data.schedules) ? data.schedules : []);
    } catch {
      setError("Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSchedules(); }, [fetchSchedules]);

  // Map schedules → (dayIdx, hour, minuteOffset)
  const placed: Map<string, { sched: ScheduleRecord; dayIdx: number; hour: number; minuteOffset: number }> = new Map();
  for (const sched of schedules) {
    const dt = new Date(sched.publishAt || sched.nextRun || "");
    if (isNaN(dt.getTime())) continue;
    const dayIdx = weekDays.findIndex((d) => isSameDay(d, dt));
    if (dayIdx === -1) continue;
    const hour = dt.getHours();
    const minuteOffset = dt.getMinutes();
    if (hour < HOUR_START || hour >= HOUR_END) continue;
    placed.set(sched.id, { sched, dayIdx, hour, minuteOffset });
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, dayIdx: number, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ dayIdx, hour });
  };

  const handleDragLeave = () => setDropTarget(null);

  const handleDrop = async (e: React.DragEvent, dayIdx: number, hour: number) => {
    e.preventDefault();
    setDropTarget(null);
    if (!dragId) return;

    const targetDay = weekDays[dayIdx];
    if (!targetDay) return;

    const newPublishAt = new Date(targetDay);
    newPublishAt.setHours(hour, 0, 0, 0);

    setSaving(dragId);
    try {
      const res = await authenticatedFetch(`/api/schedule/${dragId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishAt: newPublishAt.toISOString(), nextRun: newPublishAt.toISOString() }),
      });
      if (res.ok) {
        setSavedFeedback(`Rescheduled to ${newPublishAt.toLocaleString()}`);
        setTimeout(() => setSavedFeedback(null), 3000);
        await fetchSchedules();
      }
    } catch {
      setError("Failed to reschedule.");
    } finally {
      setSaving(null);
      setDragId(null);
    }
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDropTarget(null);
  };

  const weekLabel = (() => {
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleString("default", { month: "long" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleString("default", { month: "short" })} ${start.getDate()} – ${end.toLocaleString("default", { month: "short" })} ${end.getDate()}, ${start.getFullYear()}`;
  })();

  const schedulesThisWeek = placed.size;

  return (
    <Box>
      {/* Toolbar */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton size="small" onClick={() => setWeekOffset((w) => w - 1)} title="Previous week">
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 260, textAlign: "center" }}>
            {weekLabel}
          </Typography>
          <IconButton size="small" onClick={() => setWeekOffset((w) => w + 1)} title="Next week">
            <ChevronRightIcon />
          </IconButton>
          {weekOffset !== 0 && (
            <Tooltip title="Jump to current week">
              <IconButton size="small" onClick={() => setWeekOffset(0)}>
                <TodayIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {schedulesThisWeek} item{schedulesThisWeek !== 1 ? "s" : ""} this week
          </Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => void fetchSchedules()} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Legend */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap">
        {Object.entries(CONTENT_TYPE_COLORS).map(([type, colors]) => (
          <Stack key={type} direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: colors.border }} />
            <Typography variant="caption" color="text.secondary">{type}</Typography>
          </Stack>
        ))}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <DragIndicatorIcon sx={{ fontSize: 13, color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary">Drag to reschedule</Typography>
        </Stack>
      </Stack>

      {/* Feedback */}
      {savedFeedback && (
        <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mb: 1.5 }} onClose={() => setSavedFeedback(null)}>
          {savedFeedback}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && (
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: `52px repeat(7, ${COL_WIDTH}px)`, minWidth: 52 + 7 * COL_WIDTH }}>

            {/* Column headers */}
            <Box sx={{ gridColumn: 1, gridRow: 1, height: 48, borderBottom: "1px solid", borderColor: "divider" }} />
            {weekDays.map((day, di) => {
              const isToday = isSameDay(day, today);
              return (
                <Box
                  key={di}
                  sx={{
                    gridColumn: di + 2,
                    gridRow: 1,
                    height: 48,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: "1px solid",
                    borderLeft: "1px solid",
                    borderColor: "divider",
                    bgcolor: isToday ? "primary.50" : "transparent",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {DAY_LABELS[di]}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight={isToday ? 800 : 400}
                    sx={{
                      color: isToday ? "white" : "text.primary",
                      lineHeight: 1.2,
                      bgcolor: isToday ? "primary.main" : "transparent",
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {day.getDate()}
                  </Typography>
                </Box>
              );
            })}

            {/* Hour rows */}
            {HOURS.map((hour, hi) => (
              <React.Fragment key={hour}>
                {/* Hour label */}
                <Box
                  sx={{
                    gridColumn: 1,
                    gridRow: hi + 2,
                    height: CELL_HEIGHT,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-end",
                    pr: 0.75,
                    pt: 0.5,
                    borderTop: hi === 0 ? "none" : "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", whiteSpace: "nowrap" }}>
                    {formatHour(hour)}
                  </Typography>
                </Box>

                {/* Day cells */}
                {weekDays.map((day, di) => {
                  const isDropTarget = dropTarget?.dayIdx === di && dropTarget?.hour === hour;
                  const isToday = isSameDay(day, today);
                  const isCurrentHour = isToday && today.getHours() === hour;

                  // Find schedules in this cell
                  const cellItems = Array.from(placed.values()).filter(
                    (p) => p.dayIdx === di && p.hour === hour,
                  );

                  return (
                    <Box
                      key={di}
                      onDragOver={(e) => handleDragOver(e, di, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => void handleDrop(e, di, hour)}
                      sx={{
                        gridColumn: di + 2,
                        gridRow: hi + 2,
                        height: CELL_HEIGHT,
                        position: "relative",
                        borderTop: hi === 0 ? "none" : "1px solid",
                        borderLeft: "1px solid",
                        borderColor: "divider",
                        bgcolor: isDropTarget
                          ? "primary.50"
                          : isCurrentHour
                          ? "rgba(25,118,210,0.03)"
                          : isToday
                          ? "rgba(25,118,210,0.02)"
                          : "transparent",
                        transition: "background-color 0.1s",
                        ...(isDropTarget ? { outline: "2px dashed", outlineColor: "primary.main" } : {}),
                      }}
                    >
                      {isCurrentHour && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: ((today.getMinutes() / 60) * CELL_HEIGHT) - 1,
                            left: 0,
                            right: 0,
                            height: 2,
                            bgcolor: "error.main",
                            zIndex: 4,
                            "&::before": {
                              content: '""',
                              position: "absolute",
                              left: -4,
                              top: -3,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "error.main",
                            },
                          }}
                        />
                      )}
                      {cellItems.map(({ sched, minuteOffset }) => (
                        <ScheduleBlock
                          key={sched.id}
                          sched={sched}
                          contentType={(sched.metadata?.contentType as string) || "video"}
                          minuteOffset={minuteOffset}
                          onDragStart={handleDragStart}
                          onClick={setSelected}
                        />
                      ))}
                      {saving && cellItems.some((c) => c.sched.id === saving) && (
                        <Box sx={{ position: "absolute", top: 4, right: 4, zIndex: 5 }}>
                          <CircularProgress size={12} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </React.Fragment>
            ))}
          </Box>
        </Box>
      )}

      {/* Empty state */}
      {!loading && schedulesThisWeek === 0 && (
        <Paper
          sx={{
            textAlign: "center",
            py: 6,
            mt: 2,
            bgcolor: "transparent",
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 40, opacity: 0.3, mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No schedules fall in this week.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Use the arrows to navigate to another week, or create a schedule with a publish time this week.
          </Typography>
        </Paper>
      )}

      {/* Detail dialog */}
      <DetailDialog sched={selected} onClose={() => setSelected(null)} />
    </Box>
  );
};

export default ScheduleCalendar;
