# --- BEGIN GENERATED ---
"""ProfileSession operation types."""

from typing import Any
from datetime import datetime
from typing import TypedDict

class ProfileSessionInsert(TypedDict, total=False):
    name: str
    profile_type: str
    duration_ms: int
    total_samples: int
    hotspots: dict[str, Any]
    markdown_raw: str
    pprof_path: str
    flamegraph_path: str
    trace_ids: dict[str, Any]
    organization_id: str  # optional
    started_at: datetime

class ProfileSessionUpdate(TypedDict, total=False):
    name: str  # optional
    profile_type: str  # optional
    duration_ms: int  # optional
    total_samples: int  # optional
    hotspots: dict[str, Any]  # optional
    markdown_raw: str  # optional
    pprof_path: str  # optional
    flamegraph_path: str  # optional
    trace_ids: dict[str, Any]  # optional
    organization_id: str  # optional
    started_at: datetime  # optional

class ProfileSessionQuery(TypedDict, total=False):
    pass
# --- END GENERATED ---
