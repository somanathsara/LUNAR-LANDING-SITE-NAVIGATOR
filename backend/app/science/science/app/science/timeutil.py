"""UTC timestamp handling and SPICE time-string conversion."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from .errors import InvalidInputError


def parse_utc(ts: str | datetime) -> datetime:
    """Parse an ISO-8601 timestamp that carries an explicit UTC offset or 'Z'."""
    if isinstance(ts, datetime):
        dt = ts
    else:
        try:
            dt = datetime.fromisoformat(str(ts).strip())
        except ValueError as exc:
            raise InvalidInputError(f"timestamp_utc is not valid ISO-8601: {ts!r}") from exc
    if dt.tzinfo is None:
        raise InvalidInputError("timestamp must include a timezone (use 'Z' for UTC)")
    return dt.astimezone(UTC)


def to_spice_utc_string(dt: datetime) -> str:
    """Format for spiceypy.str2et. Requires a leap-seconds kernel (naif*.tls)."""
    dt = parse_utc(dt)
    return dt.replace(tzinfo=None).isoformat(timespec="microseconds") + " UTC"


def iso_z(dt: datetime) -> str:
    return parse_utc(dt).isoformat(timespec="seconds").replace("+00:00", "Z")


def time_range(start: datetime, end: datetime, step_s: float) -> list[datetime]:
    """Inclusive list of timestamps start, start+step, ... <= end."""
    if step_s <= 0:
        raise InvalidInputError("step_s must be > 0")
    start, end = parse_utc(start), parse_utc(end)
    if end < start:
        raise InvalidInputError("end must not be before start")
    n = int((end - start).total_seconds() // step_s) + 1
    if n > 100_000:
        raise InvalidInputError(f"time range yields {n} samples; limit is 100000")
    return [start + timedelta(seconds=i * step_s) for i in range(n)]
